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
	"sort"
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
	AvatarURL    string    `json:"avatarUrl,omitempty"`
	IsGroup      bool      `json:"isGroup"`
	Participants []string  `json:"participants,omitempty"`
	UnreadCount  int       `json:"unreadCount"`
	LastMessage  string    `json:"lastMessage"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type SessionMedia struct {
	Type            string  `json:"type"`
	URL             string  `json:"url,omitempty"`
	MimeType        string  `json:"mime_type,omitempty"`
	Filename        string  `json:"filename,omitempty"`
	ThumbnailBase64 string  `json:"thumbnail_base64,omitempty"`
	FileSize        int64   `json:"file_size,omitempty"`
	DurationSeconds float64 `json:"duration_seconds,omitempty"`
}

type SessionMessage struct {
	ID               string        `json:"id"`
	ChatID           string        `json:"chatId"`
	SenderID         string        `json:"senderId"`
	SenderName       string        `json:"senderName"`
	IsFromMe         bool          `json:"isFromMe"`
	IsForwarded      bool          `json:"isForwarded"`
	Content          string        `json:"content"`
	Media            *SessionMedia `json:"media,omitempty"`
	ReplyToMessageID string        `json:"replyToMessageId,omitempty"`
	Timestamp        time.Time     `json:"timestamp"`
	Status           string        `json:"status"`
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

func extractMessageInfo(msg *waE2E.Message) (content string, isForwarded bool, media *SessionMedia, replyToID string) {
	if msg == nil {
		return "", false, nil, ""
	}

	var ctxInfo *waE2E.ContextInfo

	if ext := msg.GetExtendedTextMessage(); ext != nil {
		content = ext.GetText()
		ctxInfo = ext.GetContextInfo()
		if len(ext.GetJpegThumbnail()) > 0 {
			media = &SessionMedia{
				Type:            "image",
				ThumbnailBase64: "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(ext.GetJpegThumbnail()),
			}
		}
	} else if conv := msg.Conversation; conv != nil && *conv != "" {
		content = *conv
	} else if img := msg.GetImageMessage(); img != nil {
		content = img.GetCaption()
		ctxInfo = img.GetContextInfo()
		thumb := ""
		if len(img.GetJpegThumbnail()) > 0 {
			thumb = "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(img.GetJpegThumbnail())
		}
		media = &SessionMedia{
			Type:            "image",
			URL:             img.GetUrl(),
			MimeType:        img.GetMimetype(),
			ThumbnailBase64: thumb,
			FileSize:        int64(img.GetFileLength()),
		}
	} else if vid := msg.GetVideoMessage(); vid != nil {
		content = vid.GetCaption()
		ctxInfo = vid.GetContextInfo()
		thumb := ""
		if len(vid.GetJpegThumbnail()) > 0 {
			thumb = "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(vid.GetJpegThumbnail())
		}
		media = &SessionMedia{
			Type:            "video",
			URL:             vid.GetUrl(),
			MimeType:        vid.GetMimetype(),
			ThumbnailBase64: thumb,
			FileSize:        int64(vid.GetFileLength()),
			DurationSeconds: float64(vid.GetSeconds()),
		}
	} else if aud := msg.GetAudioMessage(); aud != nil {
		ctxInfo = aud.GetContextInfo()
		media = &SessionMedia{
			Type:            "audio",
			URL:             aud.GetUrl(),
			MimeType:        aud.GetMimetype(),
			FileSize:        int64(aud.GetFileLength()),
			DurationSeconds: float64(aud.GetSeconds()),
		}
	} else if doc := msg.GetDocumentMessage(); doc != nil {
		content = doc.GetCaption()
		ctxInfo = doc.GetContextInfo()
		thumb := ""
		if len(doc.GetJpegThumbnail()) > 0 {
			thumb = "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(doc.GetJpegThumbnail())
		}
		media = &SessionMedia{
			Type:            "document",
			Filename:        doc.GetTitle(),
			URL:             doc.GetUrl(),
			MimeType:        doc.GetMimetype(),
			ThumbnailBase64: thumb,
			FileSize:        int64(doc.GetFileLength()),
		}
	}

	if ctxInfo != nil {
		isForwarded = ctxInfo.GetIsForwarded() || ctxInfo.GetForwardingScore() > 0
		replyToID = ctxInfo.GetStanzaId()
	}

	return content, isForwarded, media, replyToID
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

	if deviceStore != nil && deviceStore.ID != nil {
		sess.Connected = true
		sess.PhoneNumber = deviceStore.ID.User
		sess.PushName = deviceStore.PushName
	}

	client.AddEventHandler(func(evt interface{}) {
		sess.handleEvent(userId, evt)
	})

	sessions[userId] = sess

	// If device is already logged in, connect automatically
	if client.Store.ID != nil {
		go func() {
			if !client.IsConnected() {
				if err := client.Connect(); err != nil {
					log.Printf("[User %s] Auto-connect error: %v", userId, err)
				}
			}
		}()
	}

	return sess, nil
}

func getBackendWebhookURL() string {
	url := os.Getenv("BACKEND_WEBHOOK_URL")
	if url == "" {
		return "http://127.0.0.1:8000/api/v1/whatsapp/webhook"
	}
	return url
}

func (s *SessionState) handleEvent(userId string, evt interface{}) {
	backendWebhookURL := getBackendWebhookURL()

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
			var lastTime time.Time

			for _, hMsg := range conv.GetMessages() {
				webMsg := hMsg.GetMessage()
				if webMsg == nil {
					continue
				}
				text, isFwd, media, replyToID := extractMessageInfo(webMsg.GetMessage())
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
					ID:               msgID,
					ChatID:           chatJID,
					SenderID:         senderJID,
					SenderName:       chatName,
					IsFromMe:         fromMe,
					IsForwarded:      isFwd,
					Content:          text,
					Media:            media,
					ReplyToMessageID: replyToID,
					Timestamp:        ts,
					Status:           "delivered",
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

		// Fetch joined groups to populate accurate group subjects/names
		go func() {
			if s.Client == nil {
				return
			}
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			groups, err := s.Client.GetJoinedGroups(ctx)
			if err == nil && len(groups) > 0 {
				var syncedGroups []*SessionChat
				s.Lock()
				for _, g := range groups {
					jidStr := g.JID.String()
					var pList []string
					for _, p := range g.Participants {
						pList = append(pList, p.JID.User)
					}
					groupName := g.GroupName.Name
					if groupName == "" {
						groupName = "Group conversation"
					}
					if existing, ok := s.Chats[jidStr]; ok {
						existing.Name = groupName
						existing.IsGroup = true
						existing.Participants = pList
						syncedGroups = append(syncedGroups, existing)
					} else {
						newGroup := &SessionChat{
							ID:           jidStr,
							Name:         groupName,
							IsGroup:      true,
							Participants: pList,
							UnreadCount:  0,
							UpdatedAt:    time.Time{},
						}
						s.Chats[jidStr] = newGroup
						syncedGroups = append(syncedGroups, newGroup)
					}
				}
				s.Unlock()

				// Forward history sync batch to FastAPI backend so groups are saved with correct names
				if len(syncedGroups) > 0 {
					payload := map[string]interface{}{
						"type":     "history_sync",
						"userId":   userId,
						"chats":    syncedGroups,
						"messages": []*SessionMessage{},
					}
					if jsonBytes, err := json.Marshal(payload); err == nil {
						req, err := http.NewRequest("POST", backendWebhookURL, bytes.NewBuffer(jsonBytes))
						if err == nil {
							req.Header.Set("Content-Type", "application/json")
							client := &http.Client{Timeout: 5 * time.Second}
							_, _ = client.Do(req)
						}
					}
				}
			}
		}()

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
		text, isFwd, media, replyToID := extractMessageInfo(v.Message)
		senderJID := v.Info.Sender.String()
		chatJID := v.Info.Chat.String()
		isFromMe := v.Info.IsFromMe
		isGroup := v.Info.IsGroup || strings.HasSuffix(chatJID, "@g.us")
		senderName := v.Info.PushName
		if senderName == "" {
			senderName = v.Info.Sender.User
		}

		s.Lock()
		msg := &SessionMessage{
			ID:               v.Info.ID,
			ChatID:           chatJID,
			SenderID:         senderJID,
			SenderName:       senderName,
			IsFromMe:         isFromMe,
			IsForwarded:      isFwd,
			Content:          text,
			Media:            media,
			ReplyToMessageID: replyToID,
			Timestamp:        v.Info.Timestamp,
			Status:           "delivered",
		}
		s.Messages[chatJID] = append(s.Messages[chatJID], msg)

		chatName := ""
		if chat, ok := s.Chats[chatJID]; ok {
			chat.LastMessage = text
			chat.UpdatedAt = v.Info.Timestamp
			chatName = chat.Name
		} else {
			initialName := senderName
			if isGroup {
				initialName = "Group conversation"
			}
			chatName = initialName
			newChat := &SessionChat{
				ID:          chatJID,
				Name:        initialName,
				IsGroup:     isGroup,
				UnreadCount: 1,
				LastMessage: text,
				UpdatedAt:   v.Info.Timestamp,
			}
			s.Chats[chatJID] = newChat

			// If it's a group with no resolved name yet, eagerly fetch group info
			if isGroup && s.Client != nil {
				go func(targetJID types.JID, c *SessionChat) {
					ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
					defer cancel()
					info, err := s.Client.GetGroupInfo(ctx, targetJID)
					if err == nil && info != nil && info.GroupName.Name != "" {
						s.Lock()
						c.Name = info.GroupName.Name
						s.Unlock()
						// Notify backend of updated group name
						payload := map[string]interface{}{
							"type":     "history_sync",
							"userId":   userId,
							"chats":    []*SessionChat{c},
							"messages": []*SessionMessage{},
						}
						if jsonBytes, err := json.Marshal(payload); err == nil {
							req, err := http.NewRequest("POST", backendWebhookURL, bytes.NewBuffer(jsonBytes))
							if err == nil {
								req.Header.Set("Content-Type", "application/json")
								client := &http.Client{Timeout: 5 * time.Second}
								_, _ = client.Do(req)
							}
						}
					}
				}(v.Info.Chat, newChat)
			}
		}
		s.Unlock()

		log.Printf("[User %s] New message from %s in %s (%s): %s", userId, senderName, chatJID, chatName, text)

		go func() {
			payload := map[string]interface{}{
				"type":             "new_message",
				"userId":           userId,
				"chatId":           chatJID,
				"chatName":         chatName,
				"isGroup":          isGroup,
				"senderId":         senderJID,
				"senderName":       senderName,
				"isFromMe":         isFromMe,
				"isForwarded":      isFwd,
				"content":          text,
				"media":            media,
				"replyToMessageId": replyToID,
				"messageId":        v.Info.ID,
				"timestamp":        v.Info.Timestamp.Format(time.RFC3339),
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
		sess, err := getOrCreateSession(userId)
		if err != nil || sess == nil {
			c.JSON(http.StatusOK, gin.H{"connected": false, "qrCode": ""})
			return
		}

		sess.RLock()
		defer sess.RUnlock()

		isConnected := sess.Connected || (sess.Client != nil && (sess.Client.IsConnected() || sess.Client.IsLoggedIn()))
		phoneNumber := sess.PhoneNumber
		pushName := sess.PushName
		if phoneNumber == "" && sess.Device != nil && sess.Device.ID != nil {
			phoneNumber = sess.Device.ID.User
			pushName = sess.Device.PushName
		}

		c.JSON(http.StatusOK, gin.H{
			"connected":   isConnected,
			"qrCode":      sess.QRCode,
			"pairingCode": sess.PairingCode,
			"phoneNumber": phoneNumber,
			"pushName":    pushName,
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
		if sess.Device != nil && sess.Device.Contacts != nil {
			contacts, err := sess.Device.Contacts.GetAllContacts(context.Background())
			if err == nil {
				sess.Lock()
				for jid, contact := range contacts {
					jidStr := jid.String()
					if _, exists := sess.Chats[jidStr]; !exists {
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
						isGroup := strings.HasSuffix(jidStr, "@g.us")
						sess.Chats[jidStr] = &SessionChat{
							ID:          jidStr,
							Name:        name,
							PhoneNumber: jid.User,
							IsGroup:     isGroup,
							UnreadCount: 0,
							UpdatedAt:   time.Time{},
						}
					}
				}
				sess.Unlock()
			}
		}

		sess.RLock()
		chatList = make([]*SessionChat, 0, len(sess.Chats))
		for _, chat := range sess.Chats {
			chatList = append(chatList, chat)
		}
		sess.RUnlock()

		// Sort chats: chats with actual messages first (descending by UpdatedAt)
		sort.Slice(chatList, func(i, j int) bool {
			iHasMsg := chatList[i].LastMessage != "" && !chatList[i].UpdatedAt.IsZero()
			jHasMsg := chatList[j].LastMessage != "" && !chatList[j].UpdatedAt.IsZero()
			if iHasMsg != jHasMsg {
				return iHasMsg
			}
			if !chatList[i].UpdatedAt.Equal(chatList[j].UpdatedAt) {
				return chatList[i].UpdatedAt.After(chatList[j].UpdatedAt)
			}
			return strings.ToLower(chatList[i].Name) < strings.ToLower(chatList[j].Name)
		})

		// Asynchronously enhance uncached chats in the background without blocking the HTTP response
		go func(currentSess *SessionState, list []*SessionChat) {
			if currentSess.Client == nil || !currentSess.Client.IsConnected() {
				return
			}
			for _, chat := range list {
				// Only fetch if avatar or group info is not yet populated
				if chat.AvatarURL == "" || (chat.IsGroup && len(chat.Participants) == 0) {
					parsedJID, err := types.ParseJID(chat.ID)
					if err == nil {
						ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
						if chat.IsGroup || strings.HasSuffix(chat.ID, "@g.us") {
							info, err := currentSess.Client.GetGroupInfo(ctx, parsedJID)
							if err == nil && info != nil {
								currentSess.Lock()
								if info.GroupName.Name != "" {
									chat.Name = info.GroupName.Name
								}
								var pList []string
								for _, p := range info.Participants {
									pName := p.JID.User
									if currentSess.Device != nil && currentSess.Device.Contacts != nil {
										if contact, err := currentSess.Device.Contacts.GetContact(context.Background(), p.JID); err == nil {
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
								currentSess.Unlock()

								// Notify backend about updated group info
								go func(c *SessionChat) {
									payload := map[string]interface{}{
										"type":     "history_sync",
										"userId":   userId,
										"chats":    []*SessionChat{c},
										"messages": []*SessionMessage{},
									}
									if jsonBytes, err := json.Marshal(payload); err == nil {
										req, err := http.NewRequest("POST", getBackendWebhookURL(), bytes.NewBuffer(jsonBytes))
										if err == nil {
											req.Header.Set("Content-Type", "application/json")
											client := &http.Client{Timeout: 5 * time.Second}
											_, _ = client.Do(req)
										}
									}
								}(chat)
							}
						}
						// Fetch profile picture URL
						picInfo, err := currentSess.Client.GetProfilePictureInfo(ctx, parsedJID, &whatsmeow.GetProfilePictureParams{
							Preview: true,
						})
						if err == nil && picInfo != nil && picInfo.URL != "" {
							currentSess.Lock()
							chat.AvatarURL = picInfo.URL
							currentSess.Unlock()
						}
						cancel()
					}
				}
			}
		}(sess, chatList)

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
		if len(msgs) == 0 {
			// Try JID suffix variations
			if !strings.Contains(chatId, "@") {
				msgs = sess.Messages[chatId+"@s.whatsapp.net"]
				if len(msgs) == 0 {
					msgs = sess.Messages[chatId+"@g.us"]
				}
			} else {
				userPart := strings.Split(chatId, "@")[0]
				msgs = sess.Messages[userPart]
			}
		}
		if msgs == nil {
			msgs = []*SessionMessage{}
		}

		// Make copy and sort chronologically
		sortedMsgs := make([]*SessionMessage, len(msgs))
		copy(sortedMsgs, msgs)
		sort.Slice(sortedMsgs, func(i, j int) bool {
			return sortedMsgs[i].Timestamp.Before(sortedMsgs[j].Timestamp)
		})
		sess.RUnlock()

		c.JSON(http.StatusOK, gin.H{"messages": sortedMsgs})
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
