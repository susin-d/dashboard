import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive, BellRing, ChevronDown, ChevronLeft, ChevronRight, Inbox, LoaderCircle, Mail, MailOpen,
  MailPlus, Megaphone, MessagesSquare, Plus, RefreshCw, Reply, Search, Send, Star, Trash2, User, X,
} from 'lucide-react'
import {
  hasGmailConnection, loadGoogleMail, loadGoogleMessage,
  sendGoogleMessage, updateGoogleMessage,
} from '../lib/googleMail'
import { getGmailAccounts, getGmailStatus } from '../lib/gmailApi'
import { ConfirmDialog, MailModal, PageHeader, Pagination, SearchBar, TabNav } from '../components/ui'
import { usePersistentState } from '../hooks/usePersistentState'

const FOLDERS = [
  { id: 'INBOX', label: 'Inbox', icon: Inbox },
  { id: 'STARRED', label: 'Starred', icon: Star },
  { id: 'SENT', label: 'Sent', icon: Send },
  { id: 'DRAFT', label: 'Drafts', icon: MailOpen },
  { id: 'TRASH', label: 'Trash', icon: Trash2 },
]

const INBOX_TABS = [
  { id: 'primary', label: 'Primary', icon: Inbox },
  { id: 'promotions', label: 'Promotions', icon: Megaphone },
  { id: 'updates', label: 'Updates', icon: BellRing },
  { id: 'forums', label: 'Forums', icon: MessagesSquare },
]

function formatMailDate(value, long = false) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  if (long) return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function emailAddress(value = '') {
  return value.match(/<([^>]+)>/)?.[1] || value
}

function sanitizeEmailHtml(html = '') {
  if (!html) return ''
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*["']?\s*javascript:[^"'>\s]+/gi, '$1="#"')
}

const EMPTY_COMPOSE = { to: '', cc: '', bcc: '', subject: '', body: '', threadId: '', inReplyTo: '', references: '' }

export function MailsPage({ onNavigate }) {
  const [messages, setMessages] = useState([])
  const [account, setAccount] = useState('')
  const [accounts, setAccounts] = useState([])
  const [selectedAccountEmail, setSelectedAccountEmail] = useState('')
  const [query, setQuery] = useState('')
  const [folder, setFolder] = usePersistentState('starwaves.mail.folder', 'INBOX')
  const [inboxTab, setInboxTab] = usePersistentState('starwaves.mail.inbox-tab', 'primary')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(null)
  const [selected, setSelected] = useState(null)
  const [reading, setReading] = useState(false)
  const [compose, setCompose] = useState(null)
  const [discardRequested, setDiscardRequested] = useState(false)
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [pageToken, setPageToken] = useState('')
  const [previousPageTokens, setPreviousPageTokens] = useState([])
  const [nextPageToken, setNextPageToken] = useState('')
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  const refresh = useCallback(async (search = query, nextFolder = folder, token = '', keepPage = false, targetAccount = selectedAccountEmail) => {
    setLoading(true)
    setError('')
    try {
      const category = nextFolder === 'INBOX' ? inboxTab : ''
      const result = await loadGoogleMail(search, nextFolder, token, targetAccount || null, category)
      setMessages(result.messages)
      setAccount(result.email)
      setNextPageToken(result.nextPageToken)
      setPageToken(token)
      if (!keepPage) setPreviousPageTokens([])
      setConnected(true)
    } catch (refreshError) {
      setError(refreshError.message)
      setConnected(hasGmailConnection())
    } finally {
      setLoading(false)
    }
  }, [folder, query, selectedAccountEmail, inboxTab])

  const openOlderMessages = () => {
    if (!nextPageToken || loading) return
    setPreviousPageTokens((tokens) => [...tokens, pageToken])
    refresh(query, folder, nextPageToken, true, selectedAccountEmail)
  }

  const openNewerMessages = () => {
    if (!previousPageTokens.length || loading) return
    const tokens = [...previousPageTokens]
    const previousToken = tokens.pop()
    setPreviousPageTokens(tokens)
    refresh(query, folder, previousToken, true, selectedAccountEmail)
  }

  useEffect(() => {
    if (connected) refresh('', folder, '', false, selectedAccountEmail)
  }, [connected, folder, inboxTab, selectedAccountEmail]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let active = true
    getGmailAccounts()
      .then(({ accounts: fetchedAccounts }) => {
        if (!active) return
        if (fetchedAccounts && fetchedAccounts.length) {
          setAccounts(fetchedAccounts)
          setConnected(true)
          if (!selectedAccountEmail) {
            setSelectedAccountEmail(fetchedAccounts[0].email)
          }
        } else {
          setConnected(false)
        }
      })
      .catch(() => {
        getGmailStatus()
          .then(({ connected: savedConnection, account: singleAcc }) => {
            if (!active) return
            setConnected(savedConnection)
            if (singleAcc?.email) {
              setAccounts([singleAcc])
            }
          })
          .catch((statusError) => {
            if (active) {
              setConnected(false)
              setError(statusError.message)
            }
          })
      })
    return () => {
      active = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const unreadCount = useMemo(() => messages.filter((message) => message.unread).length, [messages])

  const openMessage = async (message) => {
    setReading(true)
    setError('')
    try {
      const full = await loadGoogleMessage(message.id, selectedAccountEmail)
      setSelected(full)
      if (message.unread) {
        setMessages((items) => items.map((item) => item.id === message.id ? { ...item, unread: false } : item))
        await updateGoogleMessage(message.id, { remove: ['UNREAD'] }, selectedAccountEmail)
      }
    } catch (readError) {
      setError(readError.message)
    } finally {
      setReading(false)
    }
  }

  const toggleStar = async (message, event) => {
    event.stopPropagation()
    const nextStarred = !message.starred
    setMessages((items) => items.map((item) => item.id === message.id ? { ...item, starred: nextStarred } : item))
    if (selected?.id === message.id) setSelected((current) => current ? { ...current, starred: nextStarred } : null)
    try {
      await updateGoogleMessage(
        message.id,
        nextStarred ? { add: ['STARRED'] } : { remove: ['STARRED'] },
        selectedAccountEmail,
      )
    } catch (starError) {
      setError(starError.message)
    }
  }

  const archiveMessage = async (message) => {
    setMessages((items) => items.filter((item) => item.id !== message.id))
    if (selected?.id === message.id) setSelected(null)
    try {
      await updateGoogleMessage(message.id, { remove: ['INBOX'] }, selectedAccountEmail)
      setNotice('Message archived.')
    } catch (archiveError) {
      setError(archiveError.message)
    }
  }

  const deleteMessage = async (message) => {
    setMessages((items) => items.filter((item) => item.id !== message.id))
    if (selected?.id === message.id) setSelected(null)
    try {
      await updateGoogleMessage(message.id, { add: ['TRASH'] }, selectedAccountEmail)
      setNotice('Message moved to Trash.')
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    setSending(true)
    setError('')
    try {
      await sendGoogleMessage(compose, selectedAccountEmail)
      setCompose(null)
      setNotice('Message sent successfully.')
      if (folder === 'SENT') refresh(query, 'SENT', '', false, selectedAccountEmail)
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setSending(false)
    }
  }

  const requestCloseCompose = () => {
    const hasDraftContent = compose && Object.values(compose).some(
      (value) => typeof value === 'string' && value.trim(),
    )
    if (hasDraftContent) {
      setDiscardRequested(true)
      return
    }
    setCompose(null)
  }

  const [connectingGmail, setConnectingGmail] = useState(false)

  const handleConnectGmail = async () => {
    setConnectingGmail(true)
    try {
      await beginGmailOAuth()
      const { accounts: fetchedAccounts } = await getGmailAccounts()
      if (fetchedAccounts && fetchedAccounts.length) {
        setAccounts(fetchedAccounts)
        setSelectedAccountEmail(fetchedAccounts[0].email)
        setConnected(true)
      } else {
        setConnected(true)
      }
      refresh('', 'INBOX', '', false, null)
    } catch (err) {
      setError(err.message)
    } finally {
      setConnectingGmail(false)
    }
  }

  if (connected === null) {
    return (
      <div className="mail-page empty-connect">
        <LoaderCircle size={36} className="mail-spin" />
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="mail-page empty-connect">
        <Mail size={42} />
        <h2>Connect Google Mail</h2>
        <p>Authorize Gmail to view, reply to, and organize your emails inside StarWaves.</p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button
            className="primary-button"
            onClick={handleConnectGmail}
            disabled={connectingGmail}
          >
            {connectingGmail ? (
              <>
                <LoaderCircle size={15} className="mail-spin" /> Connecting…
              </>
            ) : (
              'Connect Gmail'
            )}
          </button>
          <button className="secondary-button" onClick={() => onNavigate('setting')}>
            Open Settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mail-page">
      {notice && (
        <div className="mail-toast">
          {notice}
          <button onClick={() => setNotice('')} aria-label="Close notice"><X size={14} /></button>
        </div>
      )}

      {/* Fixed Sub-Sidebar Attached Next to Main App Sidebar */}
      <aside className="mail-folders">
        <div className="mail-mobile-compose">
          <button onClick={() => setCompose({ ...EMPTY_COMPOSE })}>
            <MailPlus size={17} /><span>Compose</span>
          </button>
        </div>

        <button
          className={`mail-all-inboxes ${!selectedAccountEmail ? 'active' : ''}`}
          onClick={() => { setSelectedAccountEmail(''); setSelected(null); refresh(query, folder, '', false, null) }}
        >
          <Inbox size={18} />
          <span>All inboxes</span>
        </button>

        {FOLDERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={folder === id ? 'active' : ''}
            onClick={() => { setFolder(id); setSelected(null); setQuery('') }}
          >
            <Icon size={18} />
            <span>{label}</span>
            {id === 'INBOX' && unreadCount > 0 && <strong>{unreadCount}</strong>}
          </button>
        ))}

        <div className="mail-account-menu">
          <button
            className="mail-account-trigger"
            aria-expanded={accountMenuOpen}
            onClick={() => setAccountMenuOpen((open) => !open)}
            title={selectedAccountEmail || account || 'Choose account'}
          >
            <User size={18} />
            <span>{selectedAccountEmail || account || 'Choose account'}</span>
            <ChevronDown size={15} />
          </button>
          {accountMenuOpen && (
            <div className="mail-account-dropdown" role="menu">
              {accounts.map((acc) => (
                <button key={acc.id || acc.email} role="menuitem" onClick={() => {
                  setSelectedAccountEmail(acc.email)
                  setAccountMenuOpen(false)
                  setSelected(null)
                  refresh(query, folder, '', false, acc.email)
              }}>
                <span>{acc.email}</span>
                </button>
              ))}
              <button role="menuitem" onClick={() => onNavigate('setting')}>
                <Plus size={16} />
                <span>Add account</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Page Heading & Search Toolbar */}
      <PageHeader
        eyebrow="Communication"
        title="Mails"
        className="mail-page-heading"
        actions={
          <>
            <div className="mail-toolbar">
              <form onSubmit={(event) => { event.preventDefault(); refresh(query, folder, '', false, selectedAccountEmail) }}>
                <SearchBar
                  value={query}
                  onChange={setQuery}
                  onClear={() => {
                    setQuery('')
                    refresh('', folder, '', false, selectedAccountEmail)
                  }}
                  placeholder="Search mail"
                  ariaLabel="Search mail"
                  iconSize={17}
                />
              </form>
              <button onClick={() => refresh(query, folder, pageToken, true, selectedAccountEmail)} disabled={loading} aria-label="Refresh inbox">
                <RefreshCw size={17} className={loading ? 'mail-spin' : ''} />
              </button>
            </div>
            <button className="primary-button" onClick={() => setCompose({ ...EMPTY_COMPOSE })}>
              <MailPlus size={16} /> Compose
            </button>
          </>
        }
      />

      {/* Main Mail List Container */}
      {folder === 'INBOX' && (
        <TabNav
          tabs={INBOX_TABS}
          activeTab={inboxTab}
          onChange={setInboxTab}
          className="mail-inbox-tabs"
          ariaLabel="Inbox categories"
        />
      )}

      <div className="mail-layout">
        <div className="mail-list">
          {error && (
            <div className="mail-state error" role="alert">
              <strong>Could not load mail</strong>
              <span>{error}</span>
              <button className="secondary-button" type="button" onClick={() => refresh(query, folder, pageToken, true, selectedAccountEmail)} disabled={loading}>
                <RefreshCw size={15} /> {loading ? 'Retrying…' : 'Try again'}
              </button>
            </div>
          )}
          {loading && !messages.length && <div className="mail-state"><LoaderCircle className="mail-spin" />Loading mail…</div>}
          {!loading && !error && !messages.length && (
            <div className="mail-state">
              <Mail size={28} />
              <strong>No messages here</strong>
              <span>You're all caught up.</span>
            </div>
          )}
          {messages.map((message) => (
            <div
              className={`mail-row ${message.unread ? 'unread' : ''}`}
              key={message.id}
            >
              <button
                type="button"
                className="mail-star"
                onClick={(event) => toggleStar(message, event)}
                aria-label={message.starred ? 'Unstar message' : 'Star message'}
              >
                <Star size={16} className={message.starred ? 'starred' : ''} />
              </button>
              <button type="button" className="mail-row-main" onClick={() => openMessage(message)}>
                <strong>{message.sender}</strong>
                <span><b>{message.subject}</b><span> — {message.snippet}</span></span>
                <time>{formatMailDate(message.date)}</time>
              </button>
            </div>
          ))}
        </div>

        <Pagination
          className="mail-pagination"
          ariaLabel="Mail pages"
          onPrev={openNewerMessages}
          onNext={openOlderMessages}
          hasPrev={Boolean(previousPageTokens.length && !loading)}
          hasNext={Boolean(nextPageToken && !loading)}
          disabled={loading}
        >
          <input
            className="mail-page-indicator"
            type="number"
            min="1"
            value={previousPageTokens.length + 1}
            readOnly
            aria-label="Current mail page"
          />
        </Pagination>
      </div>

      {/* Message Reader Modal */}
      {selected && (
        <MailModal labelledBy="message-title" onClose={() => setSelected(null)}>
            <header className="mail-card-header">
              <div>
                <span className="mail-avatar" aria-label="Mail" title="Mail">
                  <Mail size={22} strokeWidth={2.25} aria-hidden="true" />
                </span>
                <div>
                  <h3 id="message-title">{selected.subject || '(No Subject)'}</h3>
                  <span>{selected.from} → {selected.to || 'me'}</span>
                  <time>{formatMailDate(selected.date, true)}</time>
                </div>
              </div>
              <div className="mail-card-actions">
                <button
                  onClick={() =>
                    setCompose({
                      ...EMPTY_COMPOSE,
                      to: emailAddress(selected.from),
                      subject: selected.subject.startsWith('Re:') ? selected.subject : `Re: ${selected.subject}`,
                      threadId: selected.threadId,
                      inReplyTo: selected.messageId,
                      references: selected.references ? `${selected.references} ${selected.messageId}` : selected.messageId,
                      body: `\n\nOn ${selected.date}, ${selected.from} wrote:\n> ${selected.body.replaceAll('\n', '\n> ')}`,
                    })
                  }
                >
                  <Reply size={16} /> Reply
                </button>
                <button onClick={() => archiveMessage(selected)}><Archive size={16} /> Archive</button>
                <button onClick={() => deleteMessage(selected)}><Trash2 size={16} /> Trash</button>
                <button onClick={() => setSelected(null)} aria-label="Close message"><X size={16} /></button>
              </div>
            </header>
            <div className="mail-card-body">
              {reading ? (
                <div className="mail-state"><LoaderCircle className="mail-spin" />Loading message body…</div>
              ) : selected.html ? (
                <iframe
                  title={selected.subject}
                  srcDoc={sanitizeEmailHtml(selected.html)}
                  sandbox="allow-popups"
                />
              ) : (
                <pre>{selected.body}</pre>
              )}
            </div>
        </MailModal>
      )}

      {/* Compose Email Modal */}
      {compose && (
        <MailModal labelledBy="compose-title" onClose={requestCloseCompose} className="compose-card">
          <form onSubmit={sendMessage}>
            <header className="mail-card-header">
              <h3 id="compose-title">{compose.threadId ? 'Reply Message' : 'New Message'}</h3>
              <button type="button" onClick={requestCloseCompose} aria-label="Close compose"><X size={16} /></button>
            </header>
            <div className="compose-fields">
              <input value={compose.to} onChange={(event) => setCompose((c) => ({ ...c, to: event.target.value }))} placeholder="To" required />
              <input value={compose.cc} onChange={(event) => setCompose((c) => ({ ...c, cc: event.target.value }))} placeholder="Cc" />
              <input value={compose.bcc} onChange={(event) => setCompose((c) => ({ ...c, bcc: event.target.value }))} placeholder="Bcc" />
              <input value={compose.subject} onChange={(event) => setCompose((c) => ({ ...c, subject: event.target.value }))} placeholder="Subject" required />
              <textarea value={compose.body} onChange={(event) => setCompose((c) => ({ ...c, body: event.target.value }))} placeholder="Write your message…" rows="12" required />
            </div>
            <footer className="compose-footer">
              <button type="button" onClick={requestCloseCompose}>Discard</button>
              <button className="primary-button" type="submit" disabled={sending}>
                {sending ? 'Sending…' : <><Send size={15} /> Send</>}
              </button>
            </footer>
          </form>
        </MailModal>
      )}
      <ConfirmDialog
        isOpen={discardRequested}
        title="Discard draft?"
        message="Your unsent message will be permanently discarded."
        confirmLabel="Discard draft"
        onCancel={() => setDiscardRequested(false)}
        onConfirm={() => {
          setDiscardRequested(false)
          setCompose(null)
        }}
      />
    </div>
  )
}
