import { useState } from 'react'
import { Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { checkAndroidUpdateInteractive } from '../../lib/androidUpdater'
import { checkDesktopUpdateInteractive, isTauri } from '../../lib/desktopUpdater'
import { fetchOtaLatest, getAppVersion } from '../../lib/updatesApi'
import { SettingsCard, SettingsSection } from '../../components/ui'

export function UpdateSection() {
  const version = getAppVersion()
  const tauri = isTauri()
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState(null) // { platform, info, upToDate, error }

  const handleCheck = async () => {
    setChecking(true)
    setResult(null)
    try {
      if (tauri) {
        const res = await checkDesktopUpdateInteractive()
        setResult({ platform: 'windows', info: res.info, upToDate: !res.info?.updateAvailable, error: null })
      } else {
        // Try android check, fallback to OTA
        try {
          const info = await checkAndroidUpdateInteractive()
          setResult({
            platform: 'android',
            info,
            upToDate: !info?.updateAvailable,
            error: null,
          })
        } catch (err) {
          // Fallback OTA if android endpoint 404
          const ota = await fetchOtaLatest()
          if (ota) setResult({ platform: 'ota', info: ota, upToDate: false, error: null })
          else setResult({ platform: 'web', info: null, upToDate: true, error: null })
          if (!ota) throw err
        }
      }
    } catch (err) {
      setResult({ platform: 'error', info: null, upToDate: false, error: err.message || String(err) })
    } finally {
      setChecking(false)
    }
  }

  const platformLabel = tauri ? 'Desktop (Tauri)' : 'Android / Web'

  return (
    <SettingsSection id="settings-updates" title="Updates" description={`Current version v${version} • ${platformLabel}`}>
      <SettingsCard title="App updates" description="Check for new versions hosted on the backend. Updates are optional and signed.">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCheck}
            disabled={checking}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            {checking ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
            {checking ? 'Checking…' : 'Check for updates'}
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Backend: <code>/api/v1/updates/check</code> + <code>/updates/…</code>
          </span>
        </div>

        {result && (
          <div style={{ marginTop: 16, padding: 12, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)' }}>
            {result.error ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-primary)' }}>
                <AlertCircle size={16} /> <span style={{ fontSize: 13 }}>{result.error}</span>
              </div>
            ) : result.upToDate ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <CheckCircle size={16} /> <span style={{ fontSize: 13 }}>You are on the latest version (v{version}).</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <strong style={{ fontSize: 13 }}>
                  Update available — v{result.info?.latestVersion || result.info?.version}
                </strong>
                {result.info?.notes && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{result.info.notes}</span>}
                {result.info?.url && (
                  <a href={result.info.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, textDecoration: 'underline' }}>
                    Download artifact
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        <p style={{ marginTop: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
          Desktop uses Tauri signed updater (<code>latest.json</code>). Android uses backend <code>android.json</code> → browser APK download. OTA bundles via <code>/ota/latest.json</code> when Capgo plugin is present.
        </p>
      </SettingsCard>
    </SettingsSection>
  )
}
