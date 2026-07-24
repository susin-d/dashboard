import { authorizeGmail, clearGmailAuthorization, hasGmailConnection } from './firebase'

const API = 'https://gmail.googleapis.com/gmail/v1/users/me'

function header(message, name) {
  return message.payload?.headers?.find(
    (item) => item.name.toLowerCase() === name.toLowerCase(),
  )?.value ?? ''
}

async function gmailFetch(path, token, options) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) clearGmailAuthorization()
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.error?.message || 'Google Mail could not complete that request.')
  }
  return response.status === 204 ? null : response.json()
}

function decodeBase64Url(value = '') {
  if (!value) return ''
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function findBody(part, mimeType) {
  if (part?.mimeType === mimeType && part.body?.data) return decodeBase64Url(part.body.data)
  for (const child of part?.parts ?? []) {
    const body = findBody(child, mimeType)
    if (body) return body
  }
  return ''
}

function summary(message) {
  const from = header(message, 'From')
  return {
    id: message.id,
    threadId: message.threadId,
    sender: from.replace(/<[^>]+>/, '').replaceAll('"', '').trim() || from,
    from,
    to: header(message, 'To'),
    subject: header(message, 'Subject') || '(no subject)',
    date: header(message, 'Date'),
    snippet: message.snippet,
    unread: message.labelIds?.includes('UNREAD'),
    starred: message.labelIds?.includes('STARRED'),
  }
}

function encodeMessage({ to, cc, bcc, subject, body, inReplyTo, references }) {
  const headers = [
    `To: ${to}`,
    cc && `Cc: ${cc}`,
    bcc && `Bcc: ${bcc}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    inReplyTo && `In-Reply-To: ${inReplyTo}`,
    references && `References: ${references}`,
  ].filter(Boolean)
  const raw = `${headers.join('\r\n')}\r\n\r\n${body}`
  const bytes = new TextEncoder().encode(raw)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export { hasGmailConnection }

export async function loadGoogleMail(query = '', folder = 'INBOX', pageToken = '') {
  const token = await authorizeGmail()
  const params = new URLSearchParams({ maxResults: '40' })
  if (folder) params.set('labelIds', folder)
  if (query.trim()) params.set('q', query.trim())
  if (pageToken) params.set('pageToken', pageToken)
  const [profile, list] = await Promise.all([
    gmailFetch('/profile', token),
    gmailFetch(`/messages?${params}`, token),
  ])
  const messages = await Promise.all(
    (list.messages ?? []).map((item) =>
      gmailFetch(`/messages/${item.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, token),
    ),
  )
  return {
    email: profile.emailAddress,
    messages: messages.map(summary),
    nextPageToken: list.nextPageToken ?? '',
  }
}

export async function loadGoogleMessage(id) {
  const token = await authorizeGmail()
  const message = await gmailFetch(`/messages/${id}?format=full`, token)
  return {
    ...summary(message),
    messageId: header(message, 'Message-ID'),
    references: header(message, 'References'),
    html: findBody(message.payload, 'text/html'),
    body: findBody(message.payload, 'text/plain') || decodeBase64Url(message.payload?.body?.data),
  }
}

export async function updateGoogleMessage(id, { add = [], remove = [] }) {
  const token = await authorizeGmail()
  return gmailFetch(`/messages/${id}/modify`, token, {
    method: 'POST',
    body: JSON.stringify({ addLabelIds: add, removeLabelIds: remove }),
  })
}

export async function sendGoogleMessage(message) {
  const token = await authorizeGmail()
  return gmailFetch('/messages/send', token, {
    method: 'POST',
    body: JSON.stringify({
      raw: encodeMessage(message),
      ...(message.threadId ? { threadId: message.threadId } : {}),
    }),
  })
}
