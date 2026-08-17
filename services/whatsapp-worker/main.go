package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
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

type SessionChat struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	PhoneNumber  string    `json:"phoneNumber,omitempty"`
	IsGroup      bool      `json:"isGroup"`
	Participants []string  `json:"participants,omitempty"`
	UnreadCount  int       `json:"unreadCount"`
	LastMessage  string    `json:"lastMessage"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type SessionMessage struct {
	ID         string    `json:"id"`
	ChatID     string    `json:"chatId"`
	SenderID   string    `json:"senderId"`
	SenderName string    `json:"senderName"`
	IsFromMe   bool      `json:"isFromMe"`
	Content    string    `json:"content"`
	Timestamp  time.Time `json:"timestamp"`
	Status     string    `json:"status"`
}

type SessionState struct {
	Client      *whatsmeow.Client
	Device      *store.Device
	Container   *sqlstore.Container
	QRCode      string
	PairingCode string
	Connected   bool
	PhoneNumber string
	PushName    string
	Chats       map[string]*SessionChat
	Messages    map[string][]*SessionMessage
	sync.RWMutex
}

var (
	sessions     = make(map[string]*SessionState)
	sessionsLock sync.RWMutex
	dataDir      = "data"
)

func extractMessageContent(msg *waE2E.Message) string {
	if msg == nil {
		return ""
	}
	if msg.Conversation != nil && *msg.Conversation != "" {
		return *msg.Conversation
	}
	if msg.ExtendedTextMessage != nil && msg.ExtendedTextMessage.Text != nil {
		return *msg.ExtendedTextMessage.Text
	}
	if msg.ImageMessage != nil && msg.ImageMessage.Caption != nil {
		return *msg.ImageMessage.Caption
	}
	if msg.VideoMessage != nil && msg.VideoMessage.Caption != nil {
		return *msg.VideoMessage.Caption
	}
	if msg.DocumentMessage != nil && msg.DocumentMessage.Title != nil {
		return *msg.DocumentMessage.Title
	}
	return ""
}

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
		Chats:     make(map[string]*SessionChat),
		Messages:  make(map[string][]*SessionMessage),
	}

	client.AddEventHandler(func(evt interface{}) {
		sess.handleEvent(userId, evt)
	})

	sessions[userId] = sess

	// If device is already logged in, connect automatically
	if client.Store.ID != nil {
		go func() {
			if err := client.Connect(); err != nil {
				log.Printf("[User %s] Auto-connect error: %v", userId, err)
			}
		}()
	}

	return sess, nil
}

func (s *SessionState) handleEvent(userId string, evt interface{}) {
	backendWebhookURL := os.Getenv("BACKEND_WEBHOOK_URL")
	if backendWebhookURL == "" {
		backendWebhookURL = "http://127.0.0.1:8000/api/v1/whatsapp/webhook"
	}

	switch v := evt.(type) {
	case *events.HistorySync:
		log.Printf("[User %s] Received HistorySync chunk (%s): %d conversations", userId, v.Data.GetSyncType().String(), len(v.Data.GetConversations()))
		
		var syncedChats []*SessionChat
		var syncedMessages []*SessionMessage

		s.Lock()
		for _, conv := range v.Data.GetConversations() {
			chatJID := conv.GetID()
			chatName := conv.GetName()
			if chatName == "" {
				chatName = chatJID
			}
			isGroup := strings.HasSuffix(chatJID, "@g.us")
			unread := int(conv.GetUnreadCount())
			
			lastText := ""
			lastTime := time.Now()

			for _, hMsg := range conv.GetMessages() {
				webMsg := hMsg.GetMessage()
				if webMsg == nil {
					continue
				}
				text := extractMessageContent(webMsg.GetMessage())
				msgID := ""
				fromMe := false
				senderJID := chatJID
				if key := webMsg.GetKey(); key != nil {
					msgID = key.GetID()
					fromMe = key.GetFromMe()
					if key.GetParticipant() != "" {
						senderJID = key.GetParticipant()
					}
				}
				ts := time.Unix(int64(webMsg.GetMessageTimestamp()), 0)
				if text != "" {
					lastText = text
					lastTime = ts
				}

				m := &SessionMessage{
					ID:         msgID,
					ChatID:     chatJID,
					SenderID:   senderJID,
					SenderName: chatName,
					IsFromMe:   fromMe,
					Content:    text,
					Timestamp:  ts,
					Status:     "delivered",
				}
				s.Messages[chatJID] = append(s.Messages[chatJID], m)
				syncedMessages = append(syncedMessages, m)
			}

			chat := &SessionChat{
				ID:          chatJID,
				Name:        chatName,
				IsGroup:     isGroup,
				UnreadCount: unread,
				LastMessage: lastText,
				UpdatedAt:   lastTime,
			}
			s.Chats[chatJID] = chat
			syncedChats = append(syncedChats, chat)
		}
		s.Unlock()

		// Forward history sync batch to FastAPI backend
		go func(chats []*SessionChat, msgs []*SessionMessage) {
			payload := map[string]interface{}{
				"type":     "history_sync",
				"userId":   userId,
				"chats":    chats,
				"messages": msgs,
			}
			jsonBytes, err := json.Marshal(payload)
			if err != nil {
				return
			}
			req, err := http.NewRequest("POST", backendWebhookURL, bytes.NewBuffer(jsonBytes))
			if err == nil {
				req.Header.Set("Content-Type", "application/json")
				client := &http.Client{Timeout: 10 * time.Second}
				_, _ = client.Do(req)
			}
		}(syncedChats, syncedMessages)

	case *events.Connected:
		s.Lock()
		s.Connected = true
		s.QRCode = ""
		if s.Client != nil && s.Client.Store != nil && s.Client.Store.ID != nil {
			s.PhoneNumber = s.Client.Store.ID.User
			s.PushName = s.Client.Store.PushName
		}
		phone := s.PhoneNumber
		push := s.PushName
		s.Unlock()
		log.Printf("[User %s] WhatsApp Connected: %s (%s)", userId, phone, push)

		// Also notify backend that WhatsApp is now connected
		go func() {
			payload := map[string]interface{}{
				"type":        "status_update",
				"userId":      userId,
				"connected":   true,
				"phoneNumber": phone,
				"pushName":    push,
			}
			jsonBytes, _ := json.Marshal(payload)
			req, err := http.NewRequest("POST", backendWebhookURL, bytes.NewBuffer(jsonBytes))
			if err == nil {
				req.Header.Set("Content-Type", "application/json")
				client := &http.Client{Timeout: 5 * time.Second}
				_, _ = client.Do(req)
			}
		}()

	case *events.LoggedOut:
		s.Lock()
		s.Connected = false
		s.QRCode = ""
		s.PhoneNumber = ""
		s.PushName = ""
		s.Unlock()
		log.Printf("[User %s] WhatsApp Logged Out", userId)

	case *events.Message:
		text := extractMessageContent(v.Message)
		senderJID := v.Info.Sender.String()
		chatJID := v.Info.Chat.String()
		isFromMe := v.Info.IsFromMe
		senderName := v.Info.PushName
		if senderName == "" {
			senderName = v.Info.Sender.User
		}

		s.Lock()
		msg := &SessionMessage{
			ID:         v.Info.ID,
			ChatID:     chatJID,
			SenderID:   senderJID,
			SenderName: senderName,
			IsFromMe:   isFromMe,
			Content:    text,
			Timestamp:  v.Info.Timestamp,
			Status:     "delivered",
		}
		s.Messages[chatJID] = append(s.Messages[chatJID], msg)
		if chat, ok := s.Chats[chatJID]; ok {
			chat.LastMessage = text
			chat.UpdatedAt = v.Info.Timestamp
		} else {
			s.Chats[chatJID] = &SessionChat{
				ID:          chatJID,
				Name:        senderName,
				IsGroup:     strings.HasSuffix(chatJID, "@g.us"),
				UnreadCount: 1,
				LastMessage: text,
				UpdatedAt:   v.Info.Timestamp,
			}
		}
		s.Unlock()

		log.Printf("[User %s] New message from %s in %s: %s", userId, senderName, chatJID, text)

		go func() {
			payload := map[string]interface{}{
				"type":       "new_message",
				"userId":     userId,
				"chatId":     chatJID,
				"senderId":   senderJID,
				"senderName": senderName,
				"isFromMe":   isFromMe,
				"content":    text,
				"messageId":  v.Info.ID,
				"timestamp":  v.Info.Timestamp.Format(time.RFC3339),
			}
			jsonBytes, err := json.Marshal(payload)
			if err != nil {
				return
			}
			req, err := http.NewRequest("POST", backendWebhookURL, bytes.NewBuffer(jsonBytes))
			if err == nil {
				req.Header.Set("Content-Type", "application/json")
				client := &http.Client{Timeout: 5 * time.Second}
				_, _ = client.Do(req)
			}
		}()
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

		sess.RLock()
		isConnected := sess.Connected || (sess.Client != nil && sess.Client.IsConnected())
		phoneNum := sess.PhoneNumber
		pushName := sess.PushName
		existingQR := sess.QRCode
		sess.RUnlock()

		if isConnected {
			c.JSON(http.StatusOK, gin.H{
				"connected":   true,
				"phoneNumber": phoneNum,
				"pushName":    pushName,
			})
			return
		}

		if req.PhoneNumber != "" {
			// Pairing code flow
			cleanPhone := strings.Map(func(r rune) rune {
				if r >= '0' && r <= '9' {
					return r
				}
				return -1
			}, req.PhoneNumber)

			if !sess.Client.IsConnected() {
				_ = sess.Client.Connect()
			}

			code, err := sess.Client.PairPhone(context.Background(), cleanPhone, true, whatsmeow.PairClientChrome, "Chrome (Linux)")
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("pairing code failed: %v", err)})
				return
			}
			sess.Lock()
			sess.PairingCode = code
			sess.Unlock()

			c.JSON(http.StatusOK, gin.H{
				"connected":   false,
				"pairingCode": code,
				"qrCode":      "",
			})
			return
		}

		// If existing QR code is already cached in memory, return it directly!
		if existingQR != "" {
			c.JSON(http.StatusOK, gin.H{
				"connected": false,
				"qrCode":    existingQR,
			})
			return
		}

		// QR Code Channel flow
		if sess.Client.IsConnected() {
			sess.Client.Disconnect()
		}

		qrChan, err := sess.Client.GetQRChannel(context.Background())
		if err != nil {
			if existingQR != "" {
				c.JSON(http.StatusOK, gin.H{"connected": false, "qrCode": existingQR})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("GetQRChannel error: %v", err)})
			return
		}

		if err := sess.Client.Connect(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("connect error: %v", err)})
			return
		}

		var returnQR string
		qrReceived := make(chan struct{}, 1)

		backendWebhookURL := os.Getenv("BACKEND_WEBHOOK_URL")
		if backendWebhookURL == "" {
			backendWebhookURL = "http://127.0.0.1:8000/api/v1/whatsapp/webhook"
		}

		go func() {
			for evt := range qrChan {
				if evt.Event == "code" {
					pngBytes, err := qrcode.Encode(evt.Code, qrcode.Medium, 256)
					if err == nil {
						qrData := "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngBytes)
						sess.Lock()
						sess.QRCode = qrData
						sess.Unlock()
						log.Printf("[User %s] Real WhatsApp QR code generated successfully (len: %d)", req.UserID, len(qrData))

						// Dispatch webhook to Starwaves FastAPI backend
						go func(data string) {
							payload := map[string]interface{}{
								"type":   "qr_update",
								"userId": req.UserID,
								"qrCode": data,
							}
							jsonBytes, err := json.Marshal(payload)
							if err == nil {
								req, err := http.NewRequest("POST", backendWebhookURL, bytes.NewBuffer(jsonBytes))
								if err == nil {
									req.Header.Set("Content-Type", "application/json")
									client := &http.Client{Timeout: 4 * time.Second}
									_, _ = client.Do(req)
								}
							}
						}(qrData)
					}
					select {
					case qrReceived <- struct{}{}:
					default:
					}
				} else if evt.Event == "success" {
					log.Printf("[User %s] WhatsApp QR scan confirmed successfully", req.UserID)
				}
			}
		}()

		select {
		case <-qrReceived:
			sess.RLock()
			returnQR = sess.QRCode
			sess.RUnlock()
		case <-time.After(5 * time.Second):
			sess.RLock()
			returnQR = sess.QRCode
			sess.RUnlock()
		}

		c.JSON(http.StatusOK, gin.H{
			"connected": sess.Connected,
			"qrCode":    returnQR,
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

	r.GET("/session/chats/:userId", func(c *gin.Context) {
		userId := c.Param("userId")
		sess, err := getOrCreateSession(userId)
		if err != nil || sess == nil {
			c.JSON(http.StatusOK, gin.H{"chats": []interface{}{}})
			return
		}

		sess.RLock()
		var chatList []*SessionChat
		for _, chat := range sess.Chats {
			chatList = append(chatList, chat)
		}
		sess.RUnlock()

		// If memory chats is empty, populate from Device Contacts store
		if len(chatList) == 0 && sess.Device != nil && sess.Device.Contacts != nil {
			contacts, err := sess.Device.Contacts.GetAllContacts(context.Background())
			if err == nil {
				for jid, contact := range contacts {
					name := contact.FullName
					if name == "" {
						name = contact.PushName
					}
					if name == "" {
						name = contact.BusinessName
					}
					if name == "" {
						name = jid.User
					}
					isGroup := strings.HasSuffix(jid.String(), "@g.us")
					chatList = append(chatList, &SessionChat{
						ID:          jid.String(),
						Name:        name,
						PhoneNumber: jid.User,
						IsGroup:     isGroup,
						UnreadCount: 0,
						UpdatedAt:   time.Now(),
					})
				}
			}
		}

		// Enhance group chats with real group titles and participant member names
		for _, chat := range chatList {
			if (chat.IsGroup || strings.HasSuffix(chat.ID, "@g.us")) && sess.Client != nil && sess.Client.IsConnected() {
				groupJID, err := types.ParseJID(chat.ID)
				if err == nil {
					info, err := sess.Client.GetGroupInfo(context.Background(), groupJID)
					if err == nil && info != nil {
						if info.GroupName.Name != "" {
							chat.Name = info.GroupName.Name
						}
						var pList []string
						for _, p := range info.Participants {
							pName := p.JID.User
							if sess.Device != nil && sess.Device.Contacts != nil {
								if contact, err := sess.Device.Contacts.GetContact(context.Background(), p.JID); err == nil {
									if contact.FullName != "" {
										pName = contact.FullName
									} else if contact.PushName != "" {
										pName = contact.PushName
									}
								}
							}
							pList = append(pList, pName)
						}
						chat.Participants = pList
					}
				}
			}
		}

		c.JSON(http.StatusOK, gin.H{"chats": chatList})
	})

	r.GET("/session/messages/:userId/:chatId", func(c *gin.Context) {
		userId := c.Param("userId")
		chatId := c.Param("chatId")

		sess, err := getOrCreateSession(userId)
		if err != nil || sess == nil {
			c.JSON(http.StatusOK, gin.H{"messages": []interface{}{}})
			return
		}

		sess.RLock()
		msgs := sess.Messages[chatId]
		if msgs == nil {
			msgs = []*SessionMessage{}
		}
		sess.RUnlock()

		c.JSON(http.StatusOK, gin.H{"messages": msgs})
	})

	r.POST("/session/react", func(c *gin.Context) {
		var req struct {
			UserID    string `json:"userId" binding:"required"`
			ChatID    string `json:"chatId" binding:"required"`
			MessageID string `json:"messageId" binding:"required"`
			Reaction  string `json:"reaction"`
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

		targetJID, err := types.ParseJID(req.ChatID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid JID: %v", err)})
			return
		}

		msg := sess.Client.BuildReaction(targetJID, types.EmptyJID, req.MessageID, req.Reaction)
		resp, err := sess.Client.SendMessage(context.Background(), targetJID, msg)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("react error: %v", err)})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "messageId": resp.ID})
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

		sess, err := getOrCreateSession(req.UserID)
		if err != nil || sess == nil || sess.Client == nil || !sess.Client.IsConnected() {
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
