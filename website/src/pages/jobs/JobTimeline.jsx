export function JobTimeline({ jobs, jobStatuses, statusFilter, setStatusFilter, months, max, total }) {
  return (
    <>
      <div className="jobs-summary" aria-label="Job pipeline summary">
        {jobStatuses.slice(0, 4).map((status) => (
          <button key={status} className={`jobs-summary-item ${statusFilter === status ? 'active' : ''}`} onClick={() => setStatusFilter(statusFilter === status ? 'All' : status)}>
            <strong>{jobs.filter((job) => job.status === status).length}</strong><span>{status}</span>
          </button>
        ))}
        <div className="jobs-summary-item jobs-summary-total"><strong>{jobs.length}</strong><span>Total tracked</span></div>
      </div>

      <article className="jobs-timeline-card" aria-label={`Applications per month over the last 12 months: ${total} applications`}>
        <header className="jobs-timeline-heading">
          <div>
            <p>Activity</p>
            <h2>Application frequency</h2>
          </div>
          <span>{total} applications · 12 months</span>
        </header>
        <div className="jobs-timeline-chart" role="img" aria-label={`Bar chart of ${total} job applications across the last 12 months`}>
          {months.map((month) => (
            <div className="jobs-timeline-bar-wrap" key={month.key} title={`${month.fullLabel}: ${month.count}`}>
              <div className="jobs-timeline-bar" style={{ height: max ? `${Math.max(6, Math.round((month.count / max) * 100))}%` : '6%' }}>
                {month.count > 0 && <span className="jobs-timeline-bar-count">{month.count}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="jobs-timeline-labels" aria-hidden="true">
          {months.map((month) => (
            <span key={month.key}>{month.label}</span>
          ))}
        </div>
      </article>
    </>
  )
}
