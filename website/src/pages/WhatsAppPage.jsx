import { useEffect, useRef, useState } from 'react'
import {
  fetchWhatsAppStatus,
  fetchWhatsAppChats,
  fetchWhatsAppMessages,
  sendWhatsAppMessage,
  markWhatsAppChatRead,
  initiateWhatsAppPairing,
  confirmWhatsAppPairing,
  generateEveWhatsAppDraft,
  summarizeWhatsAppChat,
  reactToWhatsAppMessage,
  starWhatsAppMessage,
  deleteWhatsAppMessage,
  whatsappSocket,
} from '../lib'
import { WhatsAppChatList } from '../components/whatsapp/WhatsAppChatList'
import { WhatsAppConversation } from '../components/whatsapp/WhatsAppConversation'
import { WhatsAppQrModal } from '../components/whatsapp/WhatsAppQrModal'
import { WhatsAppInfoDrawer } from '../components/whatsapp/WhatsAppInfoDrawer'
import { MessageSquare, QrCode, Bot } from 'lucide-react'

export function WhatsAppPage() {
  const [status, setStatus] = useState({ connected: false })
  const [chats, setChats] = useState([])
  const [selectedChatId, setSelectedChatId] = useState(null)
  const selectedChatIdRef = useRef(null)
  selectedChatIdRef.current = selectedChatId

  const [messages, setMessages] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [pairingData, setPairingData] = useState({ qr_code: null, pairing_code: null })
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false)
  const [isDrafting, setIsDrafting] = useState(false)
  const [summaryModalText, setSummaryModalText] = useState(null)

  // Load initial status and chats
  useEffect(() => {
    let mounted = true
    async function loadInitial() {
      try {
        const stat = await fetchWhatsAppStatus().catch(() => ({ connected: false }))
        if (mounted) setStatus(stat)

        const chatList = await fetchWhatsAppChats().catch(() => [])
        if (mounted) {
          setChats(chatList)
          setSelectedChatId((current) => current || (chatList.length > 0 ? chatList[0].id : null))
        }
      } catch (err) {
        console.error('Failed to load WhatsApp data:', err)
      }
    }

    loadInitial()

    // Subscribe to WebSocket
    const unsubscribe = whatsappSocket.subscribe((event) => {
      if (!event || !event.type) return

      if (event.type === 'connection_state' || event.type === 'status_update') {
        setStatus((prev) => ({
          ...prev,
          connected: event.connected,
          phone_number: event.phone_number,
          push_name: event.push_name,
        }))
        if (event.connected) {
          setIsQrModalOpen(false)
          fetchWhatsAppChats().then((list) => {
            setChats(list)
            setSelectedChatId((curr) => curr || (list.length > 0 ? list[0].id : null))
          }).catch(() => {})
        }
      } else if (event.type === 'chats_synced') {
        fetchWhatsAppChats().then((list) => {
          setChats(list)
          setSelectedChatId((curr) => curr || (list.length > 0 ? list[0].id : null))
        }).catch(() => {})
      } else if (event.type === 'qr_update') {
        setPairingData({
          qr_code: event.qr_code,
          pairing_code: event.pairing_code,
        })
      } else if (event.type === 'new_message') {
        const incomingMsg = event.message
        if (incomingMsg) {
          const currentSelected = selectedChatIdRef.current
          // If current conversation is active
          if (incomingMsg.chat_id === currentSelected) {
            setMessages((prev) => {
              // 1. If message with exact ID already exists in feed, update it
              const idIndex = prev.findIndex((m) => m.id === incomingMsg.id)
              if (idIndex !== -1) {
                const updated = [...prev]
                updated[idIndex] = incomingMsg
                return updated
              }
              // 2. If it's an outgoing message from me, replace any matching pending/temp optimistic message
              if (incomingMsg.is_from_me) {
                const tempIndex = prev.findIndex(
                  (m) =>
                    (m.id.startsWith('temp-') || m.status === 'pending') &&
                    m.content === incomingMsg.content,
                )
                if (tempIndex !== -1) {
                  const updated = [...prev]
                  updated[tempIndex] = incomingMsg
                  return updated
                }
              }
              // 3. Otherwise append as new message
              return [...prev, incomingMsg]
            })
          }
          // Update chat list last message
          setChats((prev) =>
            prev.map((c) =>
              c.id === incomingMsg.chat_id
                ? {
                    ...c,
                    last_message: incomingMsg,
                    unread_count:
                      incomingMsg.chat_id === currentSelected ? 0 : (c.unread_count || 0) + 1,
                    updated_at: incomingMsg.timestamp,
                  }
                : c,
            ),
          )
        }
      } else if (event.type === 'message_reaction') {
        if (event.chat_id === selectedChatIdRef.current) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== event.message_id) return m
              const existingReactions = (m.reactions || []).filter((r) => r.sender !== event.sender)
              if (event.emoji) {
                existingReactions.push({ emoji: event.emoji, sender: event.sender, count: 1 })
              }
              return { ...m, reactions: existingReactions }
            }),
          )
        }
      } else if (event.type === 'message_deleted') {
        if (event.chat_id === selectedChatIdRef.current) {
          setMessages((prev) => prev.filter((m) => m.id !== event.message_id))
        }
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  // Load messages when selectedChatId changes
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([])
      return
    }

    // Immediately clear previous chat messages so they do not leak into newly selected chat
    setMessages([])

    let isCurrent = true
    fetchWhatsAppMessages(selectedChatId)
      .then((msgs) => {
        if (isCurrent) {
          setMessages(msgs || [])
          markWhatsAppChatRead(selectedChatId).catch(() => {})
          setChats((prev) =>
            prev.map((c) => (c.id === selectedChatId ? { ...c, unread_count: 0 } : c)),
          )
        }
      })
      .catch((err) => {
        if (isCurrent) {
          console.error('Could not load messages:', err)
          setMessages([])
        }
      })

    return () => {
      isCurrent = false
    }
  }, [selectedChatId])

  const [isQrLoading, setIsQrLoading] = useState(false)

  // Auto-poll status when QR modal is open to detect scan instantly or fetch QR if missing
  useEffect(() => {
    if (!isQrModalOpen || status.connected) return

    const timer = setInterval(async () => {
      try {
        const stat = await fetchWhatsAppStatus()
        if (stat.connected) {
          setStatus(stat)
          setIsQrModalOpen(false)
          const chatList = await fetchWhatsAppChats().catch(() => [])
          setChats(chatList)
          if (chatList.length > 0) setSelectedChatId((curr) => curr || chatList[0].id)
        } else if (!pairingData.qr_code && !pairingData.pairing_code) {
          const pair = await initiateWhatsAppPairing().catch(() => null)
          if (pair?.qr_code || pair?.pairing_code) {
            setPairingData(pair)
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 2000)

    return () => clearInterval(timer)
  }, [isQrModalOpen, status.connected, pairingData.qr_code, pairingData.pairing_code])

  const handleOpenQrModal = async () => {
    setIsQrModalOpen(true)
    setIsQrLoading(true)
    try {
      const pair = await initiateWhatsAppPairing()
      setPairingData(pair)
    } catch (err) {
      console.error('Pairing error:', err)
    } finally {
      setIsQrLoading(false)
    }
  }

  const handleRequestPairingCode = async (phoneNumber) => {
    try {
      const pair = await initiateWhatsAppPairing(phoneNumber)
      setPairingData((prev) => ({
        ...prev,
        pairing_code: pair.pairing_code,
        qr_code: pair.qr_code || prev.qr_code,
      }))
      return pair
    } catch (err) {
      console.error('Request pairing code error:', err)
      throw err
    }
  }

  const handleCheckStatus = async () => {
    setIsQrLoading(true)
    try {
      const stat = await fetchWhatsAppStatus()
      setStatus(stat)
      if (stat.connected) {
        setIsQrModalOpen(false)
        const chatList = await fetchWhatsAppChats().catch(() => [])
        setChats(chatList)
        if (chatList.length > 0) setSelectedChatId((curr) => curr || chatList[0].id)
      } else {
        const pair = await initiateWhatsAppPairing()
        setPairingData(pair)
      }
    } catch (err) {
      console.error('Check status error:', err)
    } finally {
      setIsQrLoading(false)
    }
  }

  const handleConfirmPairing = async (phoneNumber, pushName) => {
    try {
      const updated = await confirmWhatsAppPairing(phoneNumber, pushName)
      setStatus(updated)
      setIsQrModalOpen(false)
      const chatList = await fetchWhatsAppChats()
      setChats(chatList)
      if (chatList.length > 0) setSelectedChatId(chatList[0].id)
    } catch (err) {
      console.error('Confirm pairing error:', err)
    }
  }

  const handleSendMessage = async ({ chatId, content, media, replyToMessageId }) => {
    try {
      // Optimistic update
      const tempId = `temp-${Date.now()}`
      const optimisticMsg = {
        id: tempId,
        chat_id: chatId,
        sender_id: 'me',
        sender_name: 'Me',
        is_from_me: true,
        is_eve: false,
        content,
        timestamp: new Date().toISOString(),
        status: 'pending',
        media,
      }
      setMessages((prev) => [...prev, optimisticMsg])

      const sentMsg = await sendWhatsAppMessage({ chatId, content, media, replyToMessageId })
      setMessages((prev) => {
        // If WebSocket already replaced or added the sent message, remove any leftover tempId
        const hasRealMessage = prev.some((m) => m.id === sentMsg.id)
        if (hasRealMessage) {
          return prev.filter((m) => m.id !== tempId)
        }
        return prev.map((m) => (m.id === tempId ? sentMsg : m))
      })

      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId ? { ...c, last_message: sentMsg, updated_at: sentMsg.timestamp } : c,
        ),
      )
    } catch (err) {
      console.error('Failed to send WhatsApp message:', err)
    }
  }

  const handleGenerateEveDraft = async (chatId) => {
    try {
      setIsDrafting(true)
      const res = await generateEveWhatsAppDraft(chatId)
      return res.draft
    } catch (err) {
      console.error('Failed to draft with Eve:', err)
      return null
    } finally {
      setIsDrafting(false)
    }
  }

  const handleSummarizeChat = async (chatId) => {
    try {
      const res = await summarizeWhatsAppChat(chatId)
      setSummaryModalText(res.summary)
    } catch {
      alert('Could not summarize conversation at this time.')
    }
  }

  const handleReactToMessage = async (chatId, messageId, emoji) => {
    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m
        const existing = (m.reactions || []).filter((r) => r.sender !== 'me')
        if (emoji) existing.push({ emoji, sender: 'me', count: 1 })
        return { ...m, reactions: existing }
      }),
    )
    try {
      await reactToWhatsAppMessage(chatId, messageId, emoji)
    } catch (err) {
      console.error('Failed to react to message:', err)
    }
  }

  const handleStarMessage = async (chatId, messageId, isStarred) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_starred: isStarred } : m)),
    )
    try {
      await starWhatsAppMessage(chatId, messageId, isStarred)
    } catch (err) {
      console.error('Failed to star message:', err)
    }
  }

  const handleDeleteMessage = async (chatId, messageId) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
    try {
      await deleteWhatsAppMessage(chatId, messageId)
    } catch (err) {
      console.error('Failed to delete message:', err)
    }
  }

  const selectedChat = chats.find((c) => c.id === selectedChatId)

  return (
    <>
      <div className="whatsapp-page">
        {/* Chat List Sidebar */}
        <WhatsAppChatList
          chats={chats}
          selectedChatId={selectedChatId}
          onSelectChat={setSelectedChatId}
          onOpenQrModal={handleOpenQrModal}
          isConnected={status.connected}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Conversation View */}
        {selectedChat ? (
          <WhatsAppConversation
            chat={selectedChat}
            messages={messages}
            onSendMessage={handleSendMessage}
            onOpenInfoDrawer={() => setIsInfoDrawerOpen((prev) => !prev)}
            onGenerateEveDraft={handleGenerateEveDraft}
            onSummarizeChat={handleSummarizeChat}
            onReactToMessage={handleReactToMessage}
            onStarMessage={handleStarMessage}
            onDeleteMessage={handleDeleteMessage}
            isDrafting={isDrafting}
          />
        ) : (
          <div className="whatsapp-main-empty">
            <div className="whatsapp-empty-badge-icon">
              <MessageSquare size={32} strokeWidth={2} />
            </div>

            <h3 className="whatsapp-empty-title">
              Starwaves WhatsApp
            </h3>

            <p className="whatsapp-empty-lead">
              Send and receive WhatsApp messages, record voice notes, and collaborate with Eve AI directly inside Starwaves.
            </p>

            <div className="whatsapp-empty-features-grid">
              <div className="whatsapp-empty-feature">
                <span className="whatsapp-feature-dot" />
                <div>
                  <strong>Real-Time Messaging</strong>
                  <p>Instant two-way chat synchronization via WebSockets.</p>
                </div>
              </div>
              <div className="whatsapp-empty-feature">
                <span className="whatsapp-feature-dot" />
                <div>
                  <strong>Eve AI Assistant</strong>
                  <p>Ask Eve to summarize chats, draft replies, or manage tasks.</p>
                </div>
              </div>
              <div className="whatsapp-empty-feature">
                <span className="whatsapp-feature-dot" />
                <div>
                  <strong>Media & Voice Notes</strong>
                  <p>Exchange audio notes, documents, and images securely.</p>
                </div>
              </div>
              <div className="whatsapp-empty-feature">
                <span className="whatsapp-feature-dot" />
                <div>
                  <strong>End-to-End Encrypted</strong>
                  <p>Direct device link via official WhatsApp pairing protocol.</p>
                </div>
              </div>
            </div>

            {!status.connected && (
              <div className="whatsapp-empty-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleOpenQrModal}
                >
                  <QrCode size={16} /> Link WhatsApp Account
                </button>
              </div>
            )}
          </div>
        )}

        {/* Info Drawer */}
        {isInfoDrawerOpen && selectedChat && (
          <WhatsAppInfoDrawer
            chat={selectedChat}
            onClose={() => setIsInfoDrawerOpen(false)}
            onSummarizeChat={handleSummarizeChat}
            onToggleEveAutoReply={(chatId, enabled) => {
              setChats((prev) =>
                prev.map((c) => (c.id === chatId ? { ...c, eve_auto_reply: enabled } : c)),
              )
            }}
          />
        )}
      </div>

      {/* QR Pairing Modal */}
      <WhatsAppQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        qrCode={pairingData.qr_code}
        pairingCode={pairingData.pairing_code}
        onRefresh={handleOpenQrModal}
        onRequestPairingCode={handleRequestPairingCode}
        onCheckStatus={handleCheckStatus}
        loading={isQrLoading}
      />

      {/* Summary Alert Modal */}
      {summaryModalText && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-backdrop, rgba(0,0,0,0.7))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl, 12px)',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Bot size={20} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Eve Chat Summary</h3>
            </div>
            <div style={{ fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
              {summaryModalText}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => setSummaryModalText(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
