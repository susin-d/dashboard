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

const EMPTY_COMPOSE = { to: '', cc: '', bcc: '', subject: '', body: '', threadId: '', inReplyTo: '', references: '' }

export function MailsPage({ onNavigate }) {
  const [messages, setMessages] = useState([])
  const [account, setAccount] = useState('')
  const [accounts, setAccounts] = useState([])
  const [selectedAccountEmail, setSelectedAccountEmail] = useState('')
  const [query, setQuery] = useState('')
  const [folder, setFolder] = useState('INBOX')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(hasGmailConnection)
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
            if (active) setError(statusError.message)
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
      {notice && <div className="mail-toast">{notice}<button onClick={() => setNotice('')}><X size={14} /></button></div>}

      <div className="page-heading mail-page-heading">
        <div><p>Communication</p><h1>Mails</h1></div>
        <div className="mail-toolbar">
          <form onSubmit={(event) => { event.preventDefault(); refresh(query, folder, '', false, selectedAccountEmail) }}>
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search mail" aria-label="Search mail" />
            {query && <button type="button" onClick={() => { setQuery(''); refresh('', folder, '', false, selectedAccountEmail) }} aria-label="Clear search"><X size={15} /></button>}
          </form>
          <button onClick={() => refresh(query, folder, pageToken, true, selectedAccountEmail)} disabled={loading} aria-label="Refresh inbox">
            <RefreshCw size={17} className={loading ? 'mail-spin' : ''} />
          </button>
        </div>
        <button className="primary-button" onClick={() => setCompose({ ...EMPTY_COMPOSE })}>
          <MailPlus size={16} /> Compose
        </button>
      </div>

      <div className="mail-layout">
        <aside className="mail-folders">
          <div className="mail-mobile-compose">
            <button onClick={() => setCompose({ ...EMPTY_COMPOSE })}><MailPlus size={17} /><span>Compose</span></button>
          </div>

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

          {FOLDERS.map(({ id, label, icon: Icon }) => (
            <button className={folder === id ? 'active' : ''} onClick={() => { setFolder(id); setSelected(null); setQuery('') }} key={id}>
              <Icon size={17} /><span>{label}</span>{id === 'INBOX' && <strong>{unreadCount}</strong>}
            </button>
          ))}
          <a href="https://mail.google.com" target="_blank" rel="noreferrer"><ExternalLink size={17} /><span>Open Gmail</span></a>
          {account && <small>{account}</small>}
        </aside>

        <div className="mail-list">
          {error && <div className="mail-state error" role="alert">{error}</div>}
          {loading && !messages.length && <div className="mail-state"><LoaderCircle className="mail-spin" />Loading mail…</div>}
          {!loading && !error && !messages.length && <div className="mail-state"><Mail size={28} /><strong>No messages here</strong><span>You're all caught up.</span></div>}
          {messages.map((message) => (
            <button className={`mail-row ${message.unread ? 'unread' : ''}`} onClick={() => openMessage(message)} key={message.id}>
              <span className="mail-star" onClick={(event) => toggleStar(message, event)} role="button" tabIndex="0" aria-label={message.starred ? 'Unstar message' : 'Star message'}>
                <Star size={16} className={message.starred ? 'starred' : ''} />
              </span>
              <strong>{message.sender}</strong>
              <div><b>{message.subject}</b><span> — {message.snippet}</span></div>
              <time>{formatMailDate(message.date)}</time>
            </button>
          ))}
        </div>
        <nav className="mail-pagination" aria-label="Mail pages">
          <button onClick={openNewerMessages} disabled={!previousPageTokens.length || loading} aria-label="Previous page">
            <ChevronLeft size={17} />
          </button>
          <input
            readOnly
            aria-label="Current page indicator"
            value={previousPageTokens.length ? `Page ${previousPageTokens.length + 1}` : 'Page 1'}
          />
          <button onClick={openOlderMessages} disabled={!nextPageToken || loading} aria-label="Next page">
            <ChevronRight size={17} />
          </button>
        </nav>
      </div>

      {selected && (
        <div className="mail-modal" role="dialog" aria-modal="true" aria-labelledby="message-title">
          <div className="mail-card">
            <header className="mail-card-header">
              <div>
                <span className="mail-avatar">{selected.sender[0]?.toUpperCase()}</span>
                <div>
                  <h3 id="message-title">{selected.subject}</h3>
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
                <iframe title={selected.subject} srcDoc={selected.html} sandbox="allow-popups allow-same-origin" />
              ) : (
                <pre>{selected.body}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {compose && (
        <div className="mail-modal" role="dialog" aria-modal="true" aria-labelledby="compose-title">
          <form className="mail-card compose-card" onSubmit={sendMessage}>
            <header className="mail-card-header">
              <h3 id="compose-title">{compose.threadId ? 'Reply Message' : 'New Message'}</h3>
              <button type="button" onClick={() => setCompose(null)} aria-label="Close compose"><X size={16} /></button>
            </header>
            <div className="compose-fields">
              <input value={compose.to} onChange={(event) => setCompose((c) => ({ ...c, to: event.target.value }))} placeholder="To" required />
              <input value={compose.cc} onChange={(event) => setCompose((c) => ({ ...c, cc: event.target.value }))} placeholder="Cc" />
              <input value={compose.bcc} onChange={(event) => setCompose((c) => ({ ...c, bcc: event.target.value }))} placeholder="Bcc" />
              <input value={compose.subject} onChange={(event) => setCompose((c) => ({ ...c, subject: event.target.value }))} placeholder="Subject" required />
              <textarea value={compose.body} onChange={(event) => setCompose((c) => ({ ...c, body: event.target.value }))} placeholder="Write your message…" rows="12" required />
            </div>
            <footer className="compose-footer">
              <button type="button" onClick={() => setCompose(null)}>Discard</button>
              <button className="primary-button" type="submit" disabled={sending}>
                {sending ? 'Sending…' : <><Send size={15} /> Send</>}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}
