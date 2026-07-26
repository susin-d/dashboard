import { useState } from 'react'
import { CalendarDays, ChevronDown, Clock3, Trophy } from 'lucide-react'

export function CompetitiveCodingPage({ contestSites }) {
  const [openSites, setOpenSites] = useState(() => new Set(['codeforces']))
  const [showAll, setShowAll] = useState({})

  const toggleSite = (siteId) => {
    setOpenSites((current) => {
      const next = new Set(current)
      if (next.has(siteId)) next.delete(siteId)
      else next.add(siteId)
      return next
    })
  }

  return (
    <section className="competitive-coding-page">
      <div className="page-heading">
        <div>
          <p>Practice & compete</p>
          <h1>Competitive Coding</h1>
        </div>
        <div className="contest-summary">
          <Trophy size={16} />
          <span>{contestSites.length} platforms</span>
        </div>
      </div>

      <div className="contest-site-list">
        {contestSites.length === 0 ? (
          <div className="empty-contest-platforms" style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-secondary, #09090b)', border: '1px solid var(--border-color, #27272a)', borderRadius: '12px' }}>
            <Trophy size={36} style={{ color: 'var(--text-tertiary, #71717a)', marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary, #ffffff)' }}>No Contest Sources Enabled</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary, #a1a1aa)', fontSize: '14px' }}>
              All contest platforms are turned off. You can turn on contest details for Codeforces, CodeChef, and LeetCode in Settings.
            </p>
          </div>
        ) : (
          contestSites.map((site) => {
          const isOpen = openSites.has(site.id)
          const visibleContests = showAll[site.id]
            ? site.contests
            : site.contests.slice(0, 2)

          return (
            <article className={`contest-site-card ${isOpen ? 'open' : ''}`} key={site.id}>
              <button
                className="contest-site-header"
                onClick={() => toggleSite(site.id)}
                aria-expanded={isOpen}
              >
                <span className="contest-site-logo">{site.shortName}</span>
                <span className="contest-site-copy">
                  <strong>{site.name}</strong>
                  <small>{site.description}</small>
                </span>
                <span className="contest-upcoming-count">
                  {site.contests.length} upcoming
                </span>
                <ChevronDown size={18} />
              </button>

              {isOpen && (
                <div className="contest-site-content">
                  <div className="contest-list">
                    {visibleContests.map((contest) => {
                      const startDate = new Date(contest.startsAt)

                      return (
                        <div className="contest-row" key={contest.id} data-record-id={contest.id}>
                          <div className="contest-date-tile">
                            <span>
                              {startDate.toLocaleDateString(undefined, {
                                month: 'short',
                              })}
                            </span>
                            <strong>{startDate.getDate()}</strong>
                          </div>
                          <div className="contest-info">
                            <strong>{contest.name}</strong>
                            <div>
                              <span>
                                <CalendarDays size={13} />
                                {startDate.toLocaleDateString(undefined, {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              <span>
                                <Clock3 size={13} />
                                {startDate.toLocaleTimeString(undefined, {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span>{contest.duration}</span>
                            </div>
                          </div>
                          {contest.url ? (
                            <a
                              className="contest-status"
                              href={contest.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open
                            </a>
                          ) : (
                            <span className="contest-status">Upcoming</span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {site.contests.length > 2 && (
                    <button
                      className="contest-show-all"
                      onClick={() =>
                        setShowAll((current) => ({
                          ...current,
                          [site.id]: !current[site.id],
                        }))
                      }
                    >
                      {showAll[site.id]
                        ? 'Show latest two'
                        : `Show all ${site.contests.length} contests`}
                    </button>
                  )}
                </div>
              )}
            </article>
          )
        })
        )}
      </div>
    </section>
  )
}
