import { apiRequest } from './request'

export async function fetchWhatsAppStatus() {
  return apiRequest('/whatsapp/status', {
    method: 'GET',
    errorMessage: 'Could not fetch WhatsApp connection status.',
  })
}

export async function initiateWhatsAppPairing(phoneNumber = null) {
  return apiRequest('/whatsapp/pair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber }),
    errorMessage: 'Could not initiate WhatsApp pairing.',
  })
}

export async function confirmWhatsAppPairing(phoneNumber, pushName) {
  const query = new URLSearchParams()
  if (phoneNumber) query.set('phone_number', phoneNumber)
  if (pushName) query.set('push_name', pushName)
  return apiRequest(`/whatsapp/confirm-pairing?${query.toString()}`, {
    method: 'POST',
    errorMessage: 'Could not confirm WhatsApp pairing.',
  })
}

export async function disconnectWhatsApp() {
  return apiRequest('/whatsapp/disconnect', {
    method: 'POST',
    errorMessage: 'Could not disconnect WhatsApp session.',
  })
}

export async function fetchWhatsAppChats() {
  return apiRequest('/whatsapp/chats', {
    method: 'GET',
    errorMessage: 'Could not load WhatsApp conversations.',
  })
}

export async function fetchWhatsAppMessages(chatId, limit = 50) {
  return apiRequest(`/whatsapp/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}`, {
    method: 'GET',
    errorMessage: 'Could not load WhatsApp messages.',
  })
}

export async function sendWhatsAppMessage({ chatId, content, media = null, replyToMessageId = null }) {
  return apiRequest('/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      content,
      media,
      reply_to_message_id: replyToMessageId,
    }),
    errorMessage: 'Could not send WhatsApp message.',
  })
}

export async function markWhatsAppChatRead(chatId) {
  return apiRequest(`/whatsapp/chats/${encodeURIComponent(chatId)}/read`, {
    method: 'POST',
    errorMessage: 'Could not mark chat as read.',
  })
}

export async function fetchWhatsAppSettings() {
  return apiRequest('/whatsapp/settings', {
    method: 'GET',
    errorMessage: 'Could not load WhatsApp settings.',
  })
}

export async function updateWhatsAppSettings(settings) {
  return apiRequest('/whatsapp/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
    errorMessage: 'Could not update WhatsApp settings.',
  })
}

export async function generateEveWhatsAppDraft(chatId, instruction) {
  return apiRequest('/whatsapp/eve-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, instruction }),
    errorMessage: 'Could not generate Eve draft.',
  })
}

export async function summarizeWhatsAppChat(chatId) {
  return apiRequest(`/whatsapp/chats/${encodeURIComponent(chatId)}/summarize`, {
    method: 'POST',
    errorMessage: 'Could not summarize WhatsApp chat.',
  })
}
