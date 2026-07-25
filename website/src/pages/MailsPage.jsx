import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive, ChevronLeft, ChevronRight, ExternalLink, Inbox, LoaderCircle, Mail, MailOpen,
  MailPlus, RefreshCw, Reply, Search, Send, Star, Trash2, X,
} from 'lucide-react'
import {
  hasGmailConnection, loadGoogleMail, loadGoogleMessage,
  sendGoogleMessage, updateGoogleMessage,
} from '../lib/googleMail'
import { getGmailAccounts, getGmailStatus } from '../lib/gmailApi'

const FOLDERS = [
  { id: 'INBOX', label: 'Inbox', icon: Inbox },
  { id: 'STARRED', label: 'Starred', icon: Star },
  { id: 'SENT', label: 'Sent', icon: Send },
  { id: 'DRAFT', label: 'Drafts', icon: MailOpen },
  { id: 'TRASH', label: 'Trash', icon: Trash2 },
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
  const [folder, setFolder] = useState('INBOX')
  const [filterMode, setFilterMode] = useState('all') // 'all', 'unread', 'starred'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(null)
  const [selected, setSelected] = useState(null)
  const [reading, setReading] = useState(false)
  const [compose, setCompose] = useState(null)
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [pageToken, setPageToken] = useState('')
  const [previousPageTokens, setPreviousPageTokens] = useState([])
  const [nextPageToken, setNextPageToken] = useState('')

  const refresh = useCallback(async (search = query, nextFolder = folder, token = '', keepPage = false, targetAccount = selectedAccountEmail) => {
    setLoading(true)
    setError('')
    try {
      const result = await loadGoogleMail(search, nextFolder, token, targetAccount || null)
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
  }, [folder, query, selectedAccountEmail])

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
  }, [connected, folder, selectedAccountEmail]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const filteredMessages = useMemo(() => {
    if (filterMode === 'unread') return messages.filter((m) => m.unread)
    if (filterMode === 'starred') return messages.filter((m) => m.starred)
    return messages
  }, [messages, filterMode])

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
        <p>Authorize Gmail in settings to view, reply to, and organize your emails inside StarWaves.</p>
        <button className="primary-button" onClick={() => onNavigate('setting')}>Open Settings</button>
      </div>
    )
  }

  return (
    <div className="mail-page">
      {notice && (
        <div className="mail-toast">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Close notification"><X size={14} /></button>
        </div>
      )}

      {/* Page Header */}
      <div className="page-heading mail-page-heading">
        <div>
          <p>Communication</p>
          <div className="mail-title-row">
            <h1>Mails</h1>
            {unreadCount > 0 && <span className="mail-unread-badge">{unreadCount} unread</span>}
          </div>
        </div>

        <div className="mail-header-actions">
          <button className="primary-button compose-btn-top" onClick={() => setCompose({ ...EMPTY_COMPOSE })}>
            <MailPlus size={16} /> Compose
          </button>
        </div>
      </div>

      {/* Modern Integrated 2-Pane Workspace */}
      <div className="mail-workspace">
        {/* Left Folder Nav Sidebar */}
        <aside className="mail-sidebar">
          <button className="mail-sidebar-compose" onClick={() => setCompose({ ...EMPTY_COMPOSE })}>
            <MailPlus size={16} /> Compose Mail
          </button>

          {accounts.length > 1 && (
            <div className="mail-account-select">
              <label htmlFor="gmail-account-picker">Account</label>
              <select
                id="gmail-account-picker"
                value={selectedAccountEmail || account}
                onChange={(e) => {
                  const newEmail = e.target.value
                  setSelectedAccountEmail(newEmail)
                  refresh(query, folder, '', false, newEmail)
                }}
              >
                {accounts.map((acc) => (
                  <option key={acc.id || acc.email} value={acc.email}>
                    {acc.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <nav className="mail-sidebar-nav" aria-label="Mail Folders">
            {FOLDERS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`mail-nav-item ${folder === id ? 'active' : ''}`}
                onClick={() => { setFolder(id); setSelected(null); setQuery(''); setFilterMode('all') }}
              >
                <Icon size={17} />
                <span>{label}</span>
                {id === 'INBOX' && unreadCount > 0 && (
                  <strong className="nav-badge">{unreadCount}</strong>
                )}
              </button>
            ))}
          </nav>

          <div className="mail-sidebar-footer">
            <a href="https://mail.google.com" target="_blank" rel="noreferrer" className="mail-external-link">
              <ExternalLink size={15} />
              <span>Open Gmail</span>
            </a>
            {account && <div className="mail-account-pill" title={account}><span className="dot" />{account}</div>}
          </div>
        </aside>

        {/* Right Content Panel */}
        <main className="mail-content-panel">
          {/* Action & Filter Toolbar */}
          <div className="mail-action-bar">
            <form
              className="mail-search-form"
              onSubmit={(event) => { event.preventDefault(); refresh(query, folder, '', false, selectedAccountEmail) }}
            >
              <Search size={16} className="search-icon" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search mail by sender, subject, content..."
                aria-label="Search mail"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(''); refresh('', folder, '', false, selectedAccountEmail) }} aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </form>

            <div className="mail-filter-tabs">
              <button className={filterMode === 'all' ? 'active' : ''} onClick={() => setFilterMode('all')}>All</button>
              <button className={filterMode === 'unread' ? 'active' : ''} onClick={() => setFilterMode('unread')}>Unread</button>
              <button className={filterMode === 'starred' ? 'active' : ''} onClick={() => setFilterMode('starred')}>Starred</button>
            </div>

            <div className="mail-toolbar-right">
              <button
                className="mail-icon-btn"
                onClick={() => refresh(query, folder, pageToken, true, selectedAccountEmail)}
                disabled={loading}
                aria-label="Refresh inbox"
                title="Refresh mail"
              >
                <RefreshCw size={16} className={loading ? 'mail-spin' : ''} />
              </button>

              <div className="mail-pagination-controls">
                <button onClick={openNewerMessages} disabled={!previousPageTokens.length || loading} aria-label="Previous page" title="Previous page">
                  <ChevronLeft size={16} />
                </button>
                <span className="page-indicator">
                  {previousPageTokens.length ? `Page ${previousPageTokens.length + 1}` : 'Page 1'}
                </span>
                <button onClick={openOlderMessages} disabled={!nextPageToken || loading} aria-label="Next page" title="Next page">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Email List Table */}
          <div className="mail-list-container">
            {error && <div className="mail-state error" role="alert">{error}</div>}
            {loading && !filteredMessages.length && (
              <div className="mail-state">
                <LoaderCircle size={32} className="mail-spin" />
                <span>Loading emails…</span>
              </div>
            )}
            {!loading && !error && !filteredMessages.length && (
              <div className="mail-state">
                <Mail size={36} />
                <strong>No messages found</strong>
                <span>You're all caught up in this folder.</span>
              </div>
            )}

            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className={`mail-row-item ${message.unread ? 'unread' : ''}`}
                onClick={() => openMessage(message)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') openMessage(message) }}
              >
                <button
                  className="mail-star-btn"
                  onClick={(event) => toggleStar(message, event)}
                  aria-label={message.starred ? 'Unstar message' : 'Star message'}
                >
                  <Star size={16} className={message.starred ? 'starred' : ''} />
                </button>

                <div className="mail-sender-col" title={message.sender}>
                  <strong>{message.sender}</strong>
                </div>

                <div className="mail-subject-col">
                  <span className="mail-subject">{message.subject || '(No Subject)'}</span>
                  <span className="mail-snippet"> — {message.snippet}</span>
                </div>

                <div className="mail-date-col">
                  <time>{formatMailDate(message.date)}</time>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Message Reader Modal */}
      {selected && (
        <div className="mail-modal" role="dialog" aria-modal="true" aria-labelledby="message-title">
          <div className="mail-card reader-card">
            <header className="mail-card-header">
              <div className="mail-card-title-box">
                <span className="mail-avatar">{(selected.sender || selected.from || 'M')[0]?.toUpperCase()}</span>
                <div className="mail-header-details">
                  <h3 id="message-title">{selected.subject || '(No Subject)'}</h3>
                  <div className="mail-meta-line">
                    <span className="sender-name">{selected.from}</span>
                    <span className="meta-arrow">→</span>
                    <span className="recipient-name">{selected.to || 'me'}</span>
                    <time>{formatMailDate(selected.date, true)}</time>
                  </div>
                </div>
              </div>

              <div className="mail-card-actions">
                <button
                  className="mail-action-btn"
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
                  title="Reply"
                >
                  <Reply size={15} /> <span>Reply</span>
                </button>
                <button className="mail-action-btn" onClick={() => archiveMessage(selected)} title="Archive">
                  <Archive size={15} /> <span>Archive</span>
                </button>
                <button className="mail-action-btn danger" onClick={() => deleteMessage(selected)} title="Delete">
                  <Trash2 size={15} /> <span>Trash</span>
                </button>
                <button className="mail-action-btn close" onClick={() => setSelected(null)} aria-label="Close message">
                  <X size={16} />
                </button>
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
                <pre className="mail-text-body">{selected.body}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compose Email Modal */}
      {compose && (
        <div className="mail-modal" role="dialog" aria-modal="true" aria-labelledby="compose-title">
          <form className="mail-card compose-card" onSubmit={sendMessage}>
            <header className="mail-card-header">
              <h3 id="compose-title">{compose.threadId ? 'Reply Message' : 'New Message'}</h3>
              <button type="button" className="mail-action-btn close" onClick={() => setCompose(null)} aria-label="Close compose">
                <X size={16} />
              </button>
            </header>

            <div className="compose-fields">
              <div className="compose-row">
                <span>To</span>
                <input
                  value={compose.to}
                  onChange={(event) => setCompose((c) => ({ ...c, to: event.target.value }))}
                  placeholder="recipient@example.com"
                  required
                />
              </div>
              <div className="compose-row">
                <span>Cc</span>
                <input
                  value={compose.cc}
                  onChange={(event) => setCompose((c) => ({ ...c, cc: event.target.value }))}
                  placeholder="Optional CC recipients"
                />
              </div>
              <div className="compose-row">
                <span>Bcc</span>
                <input
                  value={compose.bcc}
                  onChange={(event) => setCompose((c) => ({ ...c, bcc: event.target.value }))}
                  placeholder="Optional BCC recipients"
                />
              </div>
              <div className="compose-row">
                <span>Subject</span>
                <input
                  value={compose.subject}
                  onChange={(event) => setCompose((c) => ({ ...c, subject: event.target.value }))}
                  placeholder="Subject line"
                  required
                />
              </div>
              <textarea
                value={compose.body}
                onChange={(event) => setCompose((c) => ({ ...c, body: event.target.value }))}
                placeholder="Write your email message here…"
                rows={12}
                required
              />
            </div>

            <footer className="compose-footer">
              <button type="button" className="secondary-button" onClick={() => setCompose(null)}>Discard</button>
              <button className="primary-button" type="submit" disabled={sending}>
                {sending ? <><LoaderCircle size={15} className="mail-spin" /> Sending…</> : <><Send size={15} /> Send Email</>}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}
