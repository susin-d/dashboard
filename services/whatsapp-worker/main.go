package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/mattn/go-sqlite3"
	qrcode "github.com/skip2/go-qrcode"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
)

type SessionState struct {
	Client      *whatsmeow.Client
	Device      *store.Device
	Container   *sqlstore.Container
	QRCode      string
	PairingCode string
	Connected   bool
	PhoneNumber string
	PushName    string
	sync.RWMutex
}

var (
	sessions     = make(map[string]*SessionState)
	sessionsLock sync.RWMutex
	dataDir      = "data"
)

func getOrCreateSession(userId string) (*SessionState, error) {
	sessionsLock.Lock()
	defer sessionsLock.Unlock()

	if sess, ok := sessions[userId]; ok {
		return sess, nil
	}

	userDbPath := filepath.Join(dataDir, fmt.Sprintf("wa_%s.db", userId))
	dbLog := waLog.Stdout("Database", "WARN", true)
	container, err := sqlstore.New(context.Background(), "sqlite3", fmt.Sprintf("file:%s?_foreign_keys=on", userDbPath), dbLog)
	if err != nil {
		return nil, fmt.Errorf("failed to init sqlstore: %w", err)
	}

	deviceStore, err := container.GetFirstDevice(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to get first device: %w", err)
	}

	clientLog := waLog.Stdout("Client", "INFO", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)

	sess := &SessionState{
		Client:    client,
		Device:    deviceStore,
		Container: container,
	}

	client.AddEventHandler(func(evt interface{}) {
		sess.handleEvent(userId, evt)
	})

	sessions[userId] = sess
	return sess, nil
}

func (s *SessionState) handleEvent(userId string, evt interface{}) {
	s.Lock()
	defer s.Unlock()

	switch v := evt.(type) {
	case *events.HistorySync:
		log.Printf("[User %s] Received HistorySync chunk (%s): %d conversations", userId, v.Data.GetSyncType().String(), len(v.Data.GetConversations()))
		for _, conv := range v.Data.GetConversations() {
			chatJID := conv.GetID()
			chatName := conv.GetName()
			if chatName == "" {
				chatName = chatJID
			}

			// Read messages inside conversation
			historyMsgs := conv.GetMessages()
			log.Printf("[User %s] Syncing chat %s with %d historical messages", userId, chatName, len(historyMsgs))
		}

	case *events.Connected:
		s.Connected = true
		s.QRCode = ""
		if s.Client != nil && s.Client.Store != nil && s.Client.Store.ID != nil {
			s.PhoneNumber = s.Client.Store.ID.User
			s.PushName = s.Client.Store.PushName
		}
		log.Printf("[User %s] WhatsApp Connected: %s (%s)", userId, s.PhoneNumber, s.PushName)

	case *events.LoggedOut:
		s.Connected = false
		s.QRCode = ""
		s.PhoneNumber = ""
		s.PushName = ""
		log.Printf("[User %s] WhatsApp Logged Out", userId)

	case *events.Message:
		log.Printf("[User %s] New message from %s: %s", userId, v.Info.Sender.String(), v.Message.GetConversation())
	}
}

func main() {
	if dir := os.Getenv("DATA_DIR"); dir != "" {
		dataDir = dir
	}
	_ = os.MkdirAll(dataDir, 0755)

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.GET("/health", func(c *gin.Context) {
		sessionsLock.RLock()
		count := len(sessions)
		sessionsLock.RUnlock()
		c.JSON(http.StatusOK, gin.H{"status": "ok", "worker": "whatsmeow", "sessions": count})
	})

	r.POST("/session/pair", func(c *gin.Context) {
		var req struct {
			UserID      string `json:"userId" binding:"required"`
			PhoneNumber string `json:"phoneNumber"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "userId is required"})
			return
		}

		sess, err := getOrCreateSession(req.UserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		sess.Lock()
		defer sess.Unlock()

		if sess.Connected || (sess.Client != nil && sess.Client.IsConnected()) {
			c.JSON(http.StatusOK, gin.H{
				"connected":   true,
				"phoneNumber": sess.PhoneNumber,
				"pushName":    sess.PushName,
			})
			return
		}

		if sess.Client.IsConnected() {
			sess.Client.Disconnect()
		}

		if req.PhoneNumber != "" {
			// Pairing code flow
			cleanPhone := strings.Map(func(r rune) rune {
				if r >= '0' && r <= '9' {
					return r
				}
				return -1
			}, req.PhoneNumber)

			if err := sess.Client.Connect(); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to connect client"})
				return
			}

			code, err := sess.Client.PairPhone(context.Background(), cleanPhone, true, whatsmeow.PairClientChrome, "Chrome (Linux)")
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("pairing code failed: %v", err)})
				return
			}
			sess.PairingCode = code
			c.JSON(http.StatusOK, gin.H{
				"connected":   false,
				"pairingCode": code,
				"qrCode":      "",
			})
			return
		}

		// QR Code Channel flow
		qrChan, _ := sess.Client.GetQRChannel(context.Background())
		if err := sess.Client.Connect(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to connect client for QR"})
			return
		}

		select {
		case evt, ok := <-qrChan:
			if !ok {
				c.JSON(http.StatusOK, gin.H{
					"connected": sess.Connected,
					"qrCode":    sess.QRCode,
				})
				return
			}
			if evt.Event == "code" {
				// Convert raw QR string to standard Base64 PNG data URL
				pngBytes, err := qrcode.Encode(evt.Code, qrcode.Medium, 256)
				if err == nil {
					sess.QRCode = "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngBytes)
				}
			}
		case <-time.After(5 * time.Second):
		}

		c.JSON(http.StatusOK, gin.H{
			"connected": sess.Connected,
			"qrCode":    sess.QRCode,
		})
	})

	r.GET("/session/status/:userId", func(c *gin.Context) {
		userId := c.Param("userId")
		sessionsLock.RLock()
		sess, ok := sessions[userId]
		sessionsLock.RUnlock()

		if !ok || sess == nil {
			c.JSON(http.StatusOK, gin.H{"connected": false, "qrCode": ""})
			return
		}

		sess.RLock()
		defer sess.RUnlock()

		c.JSON(http.StatusOK, gin.H{
			"connected":   sess.Connected,
			"qrCode":      sess.QRCode,
			"pairingCode": sess.PairingCode,
			"phoneNumber": sess.PhoneNumber,
			"pushName":    sess.PushName,
		})
	})

	r.POST("/session/send", func(c *gin.Context) {
		var req struct {
			UserID  string `json:"userId" binding:"required"`
			ChatID  string `json:"chatId" binding:"required"`
			Content string `json:"content"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		sessionsLock.RLock()
		sess, ok := sessions[req.UserID]
		sessionsLock.RUnlock()

		if !ok || sess == nil || !sess.Connected {
			c.JSON(http.StatusBadRequest, gin.H{"error": "WhatsApp is not connected for this user"})
			return
		}

		jidStr := req.ChatID
		if !strings.Contains(jidStr, "@") {
			clean := strings.Map(func(r rune) rune {
				if r >= '0' && r <= '9' {
					return r
				}
				return -1
			}, jidStr)
			jidStr = clean + "@s.whatsapp.net"
		}

		targetJID, err := types.ParseJID(jidStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid JID: %v", err)})
			return
		}

		msg := &waE2E.Message{
			Conversation: proto.String(req.Content),
		}

		resp, err := sess.Client.SendMessage(context.Background(), targetJID, msg)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("send error: %v", err)})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success":   true,
			"messageId": resp.ID,
			"timestamp": resp.Timestamp.Format(time.RFC3339),
		})
	})

	r.POST("/session/disconnect", func(c *gin.Context) {
		var req struct {
			UserID string `json:"userId" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		sessionsLock.Lock()
		sess, ok := sessions[req.UserID]
		delete(sessions, req.UserID)
		sessionsLock.Unlock()

		if ok && sess != nil {
			if sess.Client != nil {
				_ = sess.Client.Logout(context.Background())
				sess.Client.Disconnect()
			}
			userDbPath := filepath.Join(dataDir, fmt.Sprintf("wa_%s.db", req.UserID))
			_ = os.Remove(userDbPath)
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "message": "logged out"})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	go func() {
		log.Printf("StarWaves Go Whatsmeow Worker running on :%s\n", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v\n", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down whatsmeow worker...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}
