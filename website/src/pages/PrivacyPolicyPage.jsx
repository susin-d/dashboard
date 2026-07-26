import { ArrowLeft } from 'lucide-react'
import { StarWavesLogo } from '../components/StarWavesLogo'

export function PrivacyPolicyPage({ onNavigate }) {
  return (
    <main id="main-content" className="public-page" tabIndex={-1}>
      <nav className="public-nav" aria-label="Public navigation">
        <button className="public-brand" onClick={() => onNavigate('/')}>
          <StarWavesLogo size={28} /> StarWaves
        </button>
        <div>
          <button className="public-login-link" onClick={() => onNavigate('/login')}>
            Log in
          </button>
          <button className="public-nav-cta" onClick={() => onNavigate('/signup')}>
            Get started
          </button>
        </div>
      </nav>

      <section style={{ maxWidth: '840px', margin: '0 auto', padding: '60px 24px 80px' }}>
        <button
          onClick={() => onNavigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '13px',
            marginBottom: '32px',
            padding: 0,
          }}
        >
          <ArrowLeft size={16} /> Back to Home
        </button>

        <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.03em' }}>
          Privacy Policy
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '40px' }}>
          Last updated: July 25, 2026 | Effective Date: July 25, 2026
        </p>

        <article style={{ display: 'flex', flexDirection: 'column', gap: '32px', lineHeight: 1.7, fontSize: '15px' }}>
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>1. Overview</h2>
            <p>
              StarWaves (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you visit <strong>starwaves.susindran.in</strong> or use the StarWaves workspace application and integrations.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>2. Information We Collect</h2>
            <p style={{ marginBottom: '8px' }}>We collect information you provide directly to us when using StarWaves:</p>
            <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Account Credentials:</strong> Name, email address, profile picture, and authenticating details provided during sign-up or via Google Sign-In.</li>
              <li><strong>Workspace & User Content:</strong> Projects, tasks, notes, uploaded documents, competitive coding stats, job application logs, and calendar event preferences.</li>
              <li><strong>Google API User Data:</strong> When you connect Google services (Google Calendar, Google Drive, Gmail), we request limited read/write access necessary to sync calendars, display Drive documents, and manage emails within your dashboard.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>3. How We Use Your Information</h2>
            <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>To deliver, maintain, and personalize your StarWaves workspace dashboard.</li>
              <li>To authenticate your identity securely via Firebase Authentication and Google OAuth 2.0.</li>
              <li>To aggregate your schedule across Google Calendar and internal workspace tasks.</li>
              <li>To index and display files stored in your Google Drive without transferring ownership.</li>
              <li>To send essential service notices and system updates.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>4. Google API Limited Use Disclosure</h2>
            <p>
              StarWaves&apos; use and transfer to any other app of information received from Google APIs will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <p style={{ marginTop: '8px' }}>
              We do <strong>NOT</strong> sell your Google user data, nor do we share your Google data with third-party AI models or advertisers. All OAuth tokens are encrypted at rest using server-side encryption.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>5. Data Storage and Security</h2>
            <p>
              Your data is stored securely using Google Cloud Platform (GCP) and Firebase Firestore infrastructure. We implement industry-standard encryption protocols (TLS/SSL in transit and AES-256 at rest) to safeguard your account information against unauthorized access or disclosure.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>6. Your Choices & Data Retention</h2>
            <p>
              You may disconnect Google Drive, Calendar, or Gmail integrations at any time from your Workspace Settings page. You can also request complete account deletion by contacting us, upon which all your stored user profile data will be permanently removed.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>7. Contact Us</h2>
            <p>
              If you have any questions or concerns regarding this Privacy Policy, please contact us at:
            </p>
            <p style={{ marginTop: '8px', fontWeight: 600 }}>
              Email: <a href="mailto:dev@susindran.in" style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}>dev@susindran.in</a><br />
              Domain: starwaves.susindran.in
            </p>
          </section>
        </article>
      </section>

      <footer className="public-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <StarWavesLogo size={22} /> StarWaves
        </span>
        <p>Plan clearly. Build consistently.</p>
        <small>© 2026 StarWaves. All rights reserved.</small>
      </footer>
    </main>
  )
}
