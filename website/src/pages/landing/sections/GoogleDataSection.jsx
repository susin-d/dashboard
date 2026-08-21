import { CalendarDays, FolderKanban, Shield } from 'lucide-react'

export function GoogleDataSection({ onNavigate }) {
  return (
    <section className="landing-google-data-section scroll-reveal" id="google-data-usage">
      <div className="landing-section-heading">
        <p className="section-eyebrow">Google Integration & Data Transparency</p>
        <h2>How StarWaves uses your Google data</h2>
        <span className="section-subtitle">StarWaves integrates with Google services to bring your existing tools into one workspace. Your data is only used within your personal workspace and is never sold or shared with third parties.</span>
      </div>
      <div className="google-data-grid">
        <div className="google-data-card"><div className="google-data-card-icon"><CalendarDays size={20} aria-hidden="true" /></div><h3>Google Calendar</h3><p className="google-data-scope">calendar.readonly</p><p>StarWaves reads your Google Calendar events so you can view your schedule alongside tasks, coding contests, and deadlines — all in one unified timeline. No modifications or deletions.</p></div>
        <div className="google-data-card"><div className="google-data-card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg></div><h3>Gmail</h3><p className="google-data-scope">gmail.readonly, gmail.modify, gmail.send</p><p>When you connect Gmail, you can read, compose and manage emails directly within your workspace. Entirely optional and only activated when you explicitly connect Gmail.</p></div>
        <div className="google-data-card"><div className="google-data-card-icon"><FolderKanban size={20} aria-hidden="true" /></div><h3>Google Drive</h3><p className="google-data-scope">drive.metadata.readonly, drive.file</p><p>Import and display recent Drive files without leaving your workspace. Only metadata and files you choose to import are accessed.</p></div>
        <div className="google-data-card"><div className="google-data-card-icon"><Shield size={20} aria-hidden="true" /></div><h3>Authentication</h3><p className="google-data-scope">openid, email, profile</p><p>Google Sign-In securely authenticates your identity. We only receive your name, email and profile picture to create and manage your account.</p></div>
      </div>
      <div className="google-data-footer"><p>You can disconnect any Google service at any time from account settings. For full details, read our <button className="inline-link" onClick={() => onNavigate('/privacy')}>Privacy Policy</button>.</p></div>
    </section>
  )
}
