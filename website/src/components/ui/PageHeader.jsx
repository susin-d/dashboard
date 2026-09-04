export function PageHeader({ eyebrow, title, description, actions, className = '' }) {
  // Page titles live in the topbar breadcrumb — eyebrow/title props are
  // accepted for call-site compatibility but intentionally not rendered to
  // avoid duplicating the title inside the page.
  void eyebrow
  void title
  if (!description && !actions) return null
  return (
    <div className={`page-heading is-toolbar ${className}`.trim()}>
      {description && <span className="page-heading-description">{description}</span>}
      {actions && <div className="page-heading-actions">{actions}</div>}
    </div>
  )
}
