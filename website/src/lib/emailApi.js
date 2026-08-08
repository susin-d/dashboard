import { getStoredAuthToken } from './authApi'
import { fetchWithTimeout } from './request'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

async function emailRequest(path, options = {}, authenticated = true) {
  const headers = {}
  if (authenticated) {
    const token = getStoredAuthToken()
    if (!token) throw new Error('Sign in to continue.')
    headers.Authorization = `Bearer ${token}`
  }
  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  let response
  try {
    response = await fetchWithTimeout(`${API_URL}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    })
  } catch (error) {
    throw new Error(
      error.message || 'Unable to connect to email service server. Please try again.',
    )
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.detail || 'Email request failed.')
  }
  return data
}

export async function fetchEmailStatus() {
  return emailRequest('/email/status', { method: 'GET' }, true)
}

export async function sendTestEmail(toEmail = null) {
  return emailRequest('/email/send-test', {
    method: 'POST',
    body: JSON.stringify({ to_email: toEmail }),
  }, true)
}

export async function resendWelcomeEmail() {
  return emailRequest('/email/resend-welcome', { method: 'POST' }, true)
}

export async function sendVerificationEmail() {
  return emailRequest('/email/send-verification', { method: 'POST' }, true)
}

export async function confirmEmailVerification(token) {
  return emailRequest('/email/verify-email/confirm', {
    method: 'POST',
    body: JSON.stringify({ token }),
  }, false)
}

export async function sendReminderEmail({ title, type = 'Task Reminder', dueTime = 'Today', description = '', toEmail = null }) {
  return emailRequest('/email/send-reminder', {
    method: 'POST',
    body: JSON.stringify({
      reminder_title: title,
      reminder_type: type,
      due_time: dueTime,
      description,
      to_email: toEmail,
    }),
  }, true)
}

