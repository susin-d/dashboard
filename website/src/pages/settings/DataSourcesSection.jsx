import { useState } from 'react'
import { Mail } from 'lucide-react'
import { sendCalendarReminderTest } from '../../lib/workspaceApi'

export function DataSourcesSection() {
  const [calendarReminderTestBusy, setCalendarReminderTestBusy] = useState(false)
  const [calendarReminderTestMessage, setCalendarReminderTestMessage] = useState('')

  const triggerTestCalendarReminder = async (window = '1h') => {
    setCalendarReminderTestBusy(true)
    setCalendarReminderTestMessage('')
    try {
      const res = await sendCalendarReminderTest(window, 'Calendar Sync & Review')
      setCalendarReminderTestMessage(res.message || 'Test reminder email dispatched.')
    } catch (err) {
      setCalendarReminderTestMessage(err.message || 'Could not send test reminder.')
    } finally {
      setCalendarReminderTestBusy(false)
    }
  }

  return (
    <div className="setting-section" id="settings-sources">
      <div className="section-heading">
        <h2>Data sources &amp; Reminders</h2>
        <p>Manage imported calendars, external activity sources, and automated email reminders.</p>
      </div>
      <div className="workspace-settings-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span className="workspace-google-mark">
              <Mail size={19} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #09090b)' }}>Calendar Reminder Email Tests</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.88rem', color: 'var(--text-muted, #71717a)' }}>
                Automated email reminders are no longer scheduled. Use these buttons to test the reminder email templates directly.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="google-calendar-refresh"
              onClick={() => triggerTestCalendarReminder('1h')}
              disabled={calendarReminderTestBusy}
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            >
              <Mail size={13} /> Send Test 1-Hour Reminder
            </button>
            <button
              type="button"
              className="google-calendar-add-account"
              onClick={() => triggerTestCalendarReminder('next_day')}
              disabled={calendarReminderTestBusy}
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            >
              <Mail size={13} /> Send Test Next-Day Reminder
            </button>
          </div>
        </div>
        {calendarReminderTestMessage && (
          <p className="hackathon-source-message" role="status" style={{ margin: 0 }}>
            {calendarReminderTestMessage}
          </p>
        )}
      </div>
    </div>
  )
}
