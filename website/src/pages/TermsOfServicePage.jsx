import { ArrowLeft } from 'lucide-react'
import { StarWavesLogo } from '../components/StarWavesLogo'

export function TermsOfServicePage({ onNavigate }) {
  return (
    <main className="public-page">
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
          Terms of Service
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '40px' }}>
          Last updated: July 25, 2026 | Effective Date: July 25, 2026
        </p>

        <article style={{ display: 'flex', flexDirection: 'column', gap: '32px', lineHeight: 1.7, fontSize: '15px' }}>
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>1. Acceptance of Terms</h2>
            <p>
              By accessing or using <strong>StarWaves</strong> (accessible via <strong>susindran.in</strong>), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not access or use the application.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>2. Account Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use or security breach.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>3. Third-Party Integrations & Google Services</h2>
            <p>
              StarWaves integrates with third-party services including Google Calendar, Google Drive, Gmail, and GitHub. By connecting these services, you grant StarWaves authorization to access data specified during the OAuth authorization flow in accordance with our <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => onNavigate('/privacy')}>Privacy Policy</span>.
            </p>
            <p style={{ marginTop: '8px' }}>
              You remain subject to the respective terms and conditions of third-party providers (e.g., Google Terms of Service). StarWaves is not responsible for third-party outage or changes in third-party API availability.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>4. Acceptable Use Policy</h2>
            <p style={{ marginBottom: '8px' }}>You agree not to:</p>
            <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Use StarWaves for any illegal, harmful, or unauthorized purpose.</li>
              <li>Attempt to gain unauthorized access to our servers, user accounts, or databases.</li>
              <li>Interfere with or disrupt the integrity or performance of the workspace platform.</li>
              <li>Reverse engineer, decompile, or copy the proprietary application code.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>5. Intellectual Property</h2>
            <p>
              StarWaves, its original content, design system, and features remain the exclusive property of StarWaves and its creators. Content you create or upload to your workspace remains exclusively your property.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, StarWaves shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the service.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>7. Termination & Changes to Terms</h2>
            <p>
              We reserve the right to modify or terminate access to StarWaves at any time. We may update these Terms periodically, and your continued use of the platform constitutes acceptance of updated terms.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>8. Contact Information</h2>
            <p>
              For questions regarding these Terms of Service, please contact:
            </p>
            <p style={{ marginTop: '8px', fontWeight: 600 }}>
              Email: <a href="mailto:dev@susindran.in" style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}>dev@susindran.in</a><br />
              Domain: susindran.in
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
