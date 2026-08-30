import { useEffect, useState } from 'react'
import { PageHeader, LoadingState, Alert } from '../components/ui'
import { useCustomUI } from '../hooks/useCustomUI'

export function CustomPage({ slug }) {
  const { prefs } = useCustomUI()
  const [loading, setLoading] = useState(!prefs)
  const [entry, setEntry] = useState(() => {
    if (!prefs) return null
    const key = `custom:${slug}`
    return prefs?.pages?.[key] ?? null
  })
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    function syncFromPrefs(source) {
      const pages = source?.pages || {}
      const key = `custom:${slug}`
      const found = pages[key]
      if (!found) {
        if (!cancelled) setError(`Custom page "${slug}" not found. Ask Eve to create it.`)
        if (!cancelled) setEntry(null)
      } else {
        if (!cancelled) { setEntry(found); setError('') }
      }
      if (!cancelled) setLoading(false)
    }
    if (prefs) syncFromPrefs(prefs)
    else if (!loading) setLoading(true)

    const onUpdate = (e) => {
      const nextPrefs = e.detail?.preferences ?? prefs
      const pages = nextPrefs?.pages || {}
      const key = `custom:${slug}`
      if (pages[key]) setEntry(pages[key])
    }
    window.addEventListener('eve-ui-update', onUpdate)
    return () => {
      cancelled = true
      window.removeEventListener('eve-ui-update', onUpdate)
    }
  }, [slug, prefs, loading])

  if (loading) return <LoadingState label={`Loading ${slug}…`} />
  if (error) return <Alert variant="error">{error}</Alert>
  if (!entry) return <Alert variant="info">No content.</Alert>

  return (
    <section className="custom-page" data-eve-target={`custom:${slug}`}>
      <PageHeader title={entry.title || slug} description={entry.description || ''} />
      <div className="card custom-page-card">
        <p className="custom-page-desc">{entry.description}</p>
        {entry.code && (
          <pre className="custom-page-code">
            {entry.code}
          </pre>
        )}
        <p className="custom-page-hint">
          This page was created by Eve. Say “edit my {slug} page to …” to change it.
        </p>
      </div>
    </section>
  )
}
