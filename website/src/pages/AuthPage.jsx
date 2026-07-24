import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { StarWavesLogo } from '../components/StarWavesLogo'

const authErrors = {
  'auth/email-already-in-use': 'An account already exists for this email.',
  'auth/invalid-credential': 'The email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
  'auth/user-not-found': 'No account found with this email address.',
}

export function AuthPage({ mode, onNavigate, onAuthenticate }) {
  const signup = mode === 'signup'
  const [showPassword, setShowPassword] = useState(false)
  const [emailValue, setEmailValue] = useState('')
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const finishAuthentication = (user) => {
    onAuthenticate(user)
  }

  const submit = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (signup && form.get('password') !== form.get('confirmPassword')) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setInfoMessage('')
    setSubmitting(true)
    try {
      const email = form.get('email')
      const password = form.get('password')
      if (signup) {
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        finishAuthentication(credential.user)
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password)
        finishAuthentication(credential.user)
      }
    } catch (authError) {
      setError(authErrors[authError.code] ?? 'Unable to continue. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!emailValue.trim()) {
      setError('Please enter your email address above to reset your password.')
      setInfoMessage('')
      return
    }
    setError('')
    setInfoMessage('')
    setSubmitting(true)
    try {
      await sendPasswordResetEmail(auth, emailValue.trim())
      setInfoMessage('Password reset email sent! Check your inbox.')
    } catch (authError) {
      setError(authErrors[authError.code] ?? 'Unable to send password reset email.')
    } finally {
      setSubmitting(false)
    }
  }

  const signInWithGoogle = async () => {
    setError('')
    setInfoMessage('')
    setSubmitting(true)
    try {
      const credential = await signInWithPopup(auth, googleProvider)
      finishAuthentication(credential.user)
    } catch (authError) {
      setError(authErrors[authError.code] ?? 'Google sign-in could not be completed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <button className="public-brand auth-brand" onClick={() => onNavigate('/')}>
          <StarWavesLogo size={28} /> StarWaves
        </button>
        <div>
          <p>YOUR WORKSPACE</p>
          <h1>{signup ? 'Start with a clear view of what matters.' : 'Welcome back to your momentum.'}</h1>
          <span>Tasks. Opportunities. Progress. One focused place.</span>
        </div>
        <small>Plan clearly. Build consistently.</small>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-shell">
          <button className="auth-back" onClick={() => onNavigate('/')}><ArrowLeft size={16} /> Back home</button>
          <div className="auth-heading">
            <p>{signup ? 'Create an account' : 'Welcome back'}</p>
            <h2>{signup ? 'Build your workspace' : 'Log in to StarWaves'}</h2>
            <span>{signup ? 'Set up your account in a few seconds.' : 'Enter your details to continue.'}</span>
          </div>

          <button className="auth-google" type="button" onClick={signInWithGoogle} disabled={submitting}>
            <span>G</span> Continue with Google
          </button>
          <div className="auth-divider"><span>or continue with email</span></div>

          <form className="auth-form" onSubmit={submit}>
            <label>
              Email
              <span>
                <Mail size={17} />
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  required
                />
              </span>
            </label>
            <label>
              Password
              <span>
                <LockKeyhole size={17} />
                <input name="password" type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" minLength="8" autoComplete={signup ? 'new-password' : 'current-password'} required />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            {signup && (
              <label>
                Confirm password
                <span><LockKeyhole size={17} /><input name="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="Repeat your password" minLength="8" autoComplete="new-password" required /></span>
              </label>
            )}
            {!signup && (
              <button className="auth-forgot" type="button" onClick={handleForgotPassword} disabled={submitting}>
                Forgot password?
              </button>
            )}
            {infoMessage && <p className="auth-info" style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '0.5rem' }}>{infoMessage}</p>}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Please wait…' : signup ? 'Create account' : 'Log in'}
              {!submitting && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="auth-switch">
            {signup ? 'Already have an account?' : 'New to StarWaves?'}
            <button onClick={() => onNavigate(signup ? '/login' : '/signup')}>
              {signup ? 'Log in' : 'Create an account'}
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}

