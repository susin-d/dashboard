import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive, ChevronLeft, ChevronRight, ExternalLink, Inbox, LoaderCircle, Mail, MailOpen,
  MailPlus, RefreshCw, Reply, Search, Send, Star, Tag, Trash2, X,
} from 'lucide-react'
import {
  hasGmailConnection, loadGoogleMail, loadGoogleMessage,
  sendGoogleMessage, updateGoogleMessage,
} from '../lib/googleMail'
import { getGmailStatus } from '../lib/gmailApi'

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

  const refresh = useCallback(async (search = query, nextFolder = folder, token = '', keepPage = false) => {
    setLoading(true)
    setError('')
    try {
      const result = await loadGoogleMail(search, nextFolder, token)
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
  }, [folder, query])

  const openOlderMessages = () => {
    if (!nextPageToken || loading) return
    setPreviousPageTokens((tokens) => [...tokens, pageToken])
    refresh(query, folder, nextPageToken, true)
  }

  const openNewerMessages = () => {
    if (!previousPageTokens.length || loading) return
    const tokens = [...previousPageTokens]
    const previousToken = tokens.pop()
    setPreviousPageTokens(tokens)
    refresh(query, folder, previousToken, true)
  }

  useEffect(() => { if (connected) refresh('', folder) }, [connected, folder]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let active = true
    getGmailStatus()
      .then(({ connected: savedConnection }) => {
        if (active) setConnected(savedConnection)
      })
      .catch((statusError) => {
        if (active) setError(statusError.message)
      })
    return () => {
      active = false
    }
  }, [])

  const unreadCount = useMemo(() => messages.filter((message) => message.unread).length, [messages])

  const openMessage = async (message) => {
    setReading(true)
    setError('')
    try {
      const full = await loadGoogleMessage(message.id)
      setSelected(full)
      if (message.unread) {
        setMessages((items) => items.map((item) => item.id === message.id ? { ...item, unread: false } : item))
        updateGoogleMessage(message.id, { remove: ['UNREAD'] }).catch(() => {})
      }
    } catch (openError) {
      setError(openError.message)
    } finally {
      setReading(false)
    }
  }

  const toggleStar = async (message, event) => {
    event?.stopPropagation()
    event?.preventDefault()
    const starred = !message.starred
    setMessages((items) => items.map((item) => item.id === message.id ? { ...item, starred } : item))
    if (selected?.id === message.id) setSelected((item) => ({ ...item, starred }))
    try {
      await updateGoogleMessage(message.id, starred ? { add: ['STARRED'] } : { remove: ['STARRED'] })
    } catch (starError) {
      setError(starError.message)
      refresh()
    }
  }

  const moveMessage = async (action) => {
    if (!selected) return
    const operations = {
      archive: { remove: ['INBOX'] },
      trash: { add: ['TRASH'], remove: ['INBOX'] },
      unread: { add: ['UNREAD'] },
    }
    try {
      await updateGoogleMessage(selected.id, operations[action])
      setSelected(null)
      setMessages((items) => items.filter((item) => item.id !== selected.id))
      setNotice(action === 'unread' ? 'Marked as unread' : action === 'trash' ? 'Moved to trash' : 'Archived')
    } catch (moveError) {
      setError(moveError.message)
    }
  }

  const startReply = () => {
    setCompose({
      ...EMPTY_COMPOSE,
      to: emailAddress(selected.from),
      subject: selected.subject.startsWith('Re:') ? selected.subject : `Re: ${selected.subject}`,
      threadId: selected.threadId,
      inReplyTo: selected.messageId,
      references: [selected.references, selected.messageId].filter(Boolean).join(' '),
    })
  }

  const sendMail = async (event) => {
    event.preventDefault()
    setSending(true)
    setError('')
    try {
      await sendGoogleMessage(compose)
      setCompose(null)
      setNotice('Message sent')
      if (folder === 'SENT') refresh()
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  if (!connected) {
    return (
      <section className="mails-page">
        <div className="page-heading"><div><p>Communication</p><h1>Mails</h1></div></div>
        <div className="mail-connect-empty">
          <span><Mail size={28} /></span>
          <h2>Bring your inbox into StarWaves</h2>
          <p>Connect Google Mail in Settings to read, organize, and send messages here.</p>
          <button className="primary-button" onClick={() => onNavigate('setting')}>Open settings</button>
        </div>
      </section>
    )
  }

  return (
    <section className="mails-page">
      <div className="page-heading mail-page-heading">
        <div><p>Communication</p><h1>Mails</h1></div>
        <div className="mail-toolbar">
          <form onSubmit={(event) => { event.preventDefault(); refresh(query, folder) }}>
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search mail" aria-label="Search mail" />
            {query && <button type="button" onClick={() => { setQuery(''); refresh('', folder) }} aria-label="Clear search"><X size={15} /></button>}
          </form>
          <button onClick={() => refresh(query, folder, pageToken, true)} disabled={loading} aria-label="Refresh inbox">
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
            type="number"
            min="1"
            value={previousPageTokens.length + 1}
            readOnly
            aria-label="Current page number"
          />
          <button onClick={openOlderMessages} disabled={!nextPageToken || loading} aria-label="Next page">
            <ChevronRight size={17} />
          </button>
        </nav>
      </div>

      {(selected || reading) && (
        <div className="mail-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}>
          <article className="mail-reader">
            {reading && !selected ? <div className="mail-reader-loading"><LoaderCircle className="mail-spin" />Opening message…</div> : selected && <>
              <header className="mail-reader-toolbar">
                <button onClick={() => setSelected(null)} aria-label="Back"><ChevronLeft size={20} /></button>
                <div>
                  <button onClick={() => moveMessage('archive')} title="Archive"><Archive size={18} /></button>
                  <button onClick={() => moveMessage('trash')} title="Move to trash"><Trash2 size={18} /></button>
                  <button onClick={() => moveMessage('unread')} title="Mark unread"><Mail size={18} /></button>
                  <button onClick={(event) => toggleStar(selected, event)} title="Star"><Star size={18} className={selected.starred ? 'starred' : ''} /></button>
                </div>
              </header>
              <div className="mail-reader-content">
                <div className="mail-reader-subject"><h2>{selected.subject}</h2><span><Tag size={13} /> {folder.toLowerCase()}</span></div>
                <div className="mail-reader-sender">
                  <span>{selected.sender.slice(0, 1).toUpperCase()}</span>
                  <div><strong>{selected.sender}</strong><small>to {selected.to || 'me'}</small></div>
                  <time>{formatMailDate(selected.date, true)}</time>
                </div>
                {selected.html
                  ? <iframe className="mail-html-body" title="Message content" sandbox="" srcDoc={selected.html} />
                  : <div className="mail-text-body">{selected.body || selected.snippet}</div>}
              </div>
              <footer><button onClick={startReply}><Reply size={16} /> Reply</button></footer>
            </>}
          </article>
        </div>
      )}

      {compose && (
        <div className="mail-compose-layer">
          <form className="mail-compose" onSubmit={sendMail}>
            <header><strong>{compose.threadId ? 'Reply' : 'New message'}</strong><button type="button" onClick={() => setCompose(null)} aria-label="Close compose"><X size={17} /></button></header>
            <label><span>To</span><input autoFocus required type="email" value={compose.to} onChange={(event) => setCompose({ ...compose, to: event.target.value })} /></label>
            <details><summary>Cc / Bcc</summary>
              <label><span>Cc</span><input value={compose.cc} onChange={(event) => setCompose({ ...compose, cc: event.target.value })} /></label>
              <label><span>Bcc</span><input value={compose.bcc} onChange={(event) => setCompose({ ...compose, bcc: event.target.value })} /></label>
            </details>
            <input className="mail-compose-subject" required placeholder="Subject" value={compose.subject} onChange={(event) => setCompose({ ...compose, subject: event.target.value })} />
            <textarea required placeholder="Write your message…" value={compose.body} onChange={(event) => setCompose({ ...compose, body: event.target.value })} />
            <footer>
              <button className="primary-button" disabled={sending}>{sending ? <LoaderCircle className="mail-spin" size={16} /> : <Send size={16} />}{sending ? 'Sending…' : 'Send'}</button>
              <button type="button" onClick={() => setCompose(null)} aria-label="Discard draft"><Trash2 size={17} /></button>
            </footer>
          </form>
        </div>
      )}
      {notice && <div className="mail-toast" role="status">{notice}</div>}
    </section>
  )
}
