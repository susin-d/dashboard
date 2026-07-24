import { ArrowRight, UserRound } from 'lucide-react'
import { updateProfile } from 'firebase/auth'
import { useState } from 'react'
import { StarWavesLogo } from '../components/StarWavesLogo'

export function OnboardingPage({ user, onComplete }) {
  const [name, setName] = useState(user?.displayName ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const cleanName = name.trim().replace(/\s+/g, ' ')
    if (cleanName.length < 2) {
      setError('Enter your name to continue.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await updateProfile(user, { displayName: cleanName })
      onComplete(user, cleanName)
    } catch {
      setError('Your name could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-card">
        <StarWavesLogo size={36} />
        <div className="onboarding-icon"><UserRound size={23} /></div>
        <p>One last step</p>
        <h1>What should we call you?</h1>
        <span className="onboarding-copy">
          This name will appear in your StarWaves header and profile.
        </span>
        <form onSubmit={submit}>
          <label htmlFor="onboarding-name">Your name</label>
          <input
            id="onboarding-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your full name"
            minLength="2"
            maxLength="100"
            autoComplete="name"
            autoFocus
            required
          />
          {error && <span className="auth-error" role="alert">{error}</span>}
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Continue to workspace'}
            {!saving && <ArrowRight size={17} />}
          </button>
        </form>
        <small>Signed in as {user?.email}</small>
      </section>
    </main>
  )
}
