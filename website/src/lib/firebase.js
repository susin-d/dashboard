import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  reauthenticateWithPopup,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export const gmailProvider = new GoogleAuthProvider()
gmailProvider.addScope('https://www.googleapis.com/auth/gmail.modify')
gmailProvider.addScope('https://www.googleapis.com/auth/gmail.send')
gmailProvider.setCustomParameters({
  include_granted_scopes: 'true',
  prompt: 'consent',
})

// Versioned so previously cached read-only tokens are not reused after the
// in-app compose and mailbox actions were introduced.
const GMAIL_SESSION_KEY = 'starwaves-gmail-authorization-v2'
const GMAIL_TOKEN_LIFETIME = 50 * 60 * 1000

export function clearGmailAuthorization() {
  sessionStorage.removeItem(GMAIL_SESSION_KEY)
  localStorage.removeItem('starwaves-gmail-connected')
  window.dispatchEvent(new Event('starwaves:gmail-change'))
}

export function hasGmailConnection() {
  return localStorage.getItem('starwaves-gmail-connected') === 'true'
}

export async function authorizeGmail() {
  const user = auth.currentUser
  if (!user) throw new Error('Sign in before connecting Google Mail.')

  try {
    const cached = JSON.parse(sessionStorage.getItem(GMAIL_SESSION_KEY) ?? 'null')
    if (
      cached?.userId === user.uid &&
      cached?.accessToken &&
      cached.expiresAt > Date.now()
    ) {
      return cached.accessToken
    }
  } catch {
    // Continue to Google authorization.
  }

  const hasGoogleProvider = user.providerData.some(
    (provider) => provider.providerId === 'google.com',
  )
  const result = hasGoogleProvider
    ? await reauthenticateWithPopup(user, gmailProvider)
    : await linkWithPopup(user, gmailProvider)
  const credential = GoogleAuthProvider.credentialFromResult(result)
  if (!credential?.accessToken) {
    throw new Error('Google Mail did not return an access token.')
  }
  sessionStorage.setItem(
    GMAIL_SESSION_KEY,
    JSON.stringify({
      userId: user.uid,
      accessToken: credential.accessToken,
      expiresAt: Date.now() + GMAIL_TOKEN_LIFETIME,
    }),
  )
  localStorage.setItem('starwaves-gmail-connected', 'true')
  window.dispatchEvent(new Event('starwaves:gmail-change'))
  return credential.accessToken
}
