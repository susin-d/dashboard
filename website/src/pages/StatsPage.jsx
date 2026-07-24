import {
  ArrowUpRight,
  CircleCheckBig,
  Code2,
  FolderKanban,
  GitBranch,
  GitFork,
  Rocket,
  Trophy,
} from 'lucide-react'

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <article className="stats-metric-card">
      <span><Icon size={18} /></span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function stat(value) {
  return value === null || value === undefined || value === ''
    ? '—'
    : typeof value === 'number'
      ? value.toLocaleString()
      : value
}

function ProgressRow({ label, value, total, colorClass = '' }) {
  const percentage = total ? Math.min(100, Math.round((value / total) * 100)) : 0
  return (
    <div className="stats-progress-row">
      <div><strong>{label}</strong><span>{stat(value)}</span></div>
      <div className="stats-progress-track">
        <i className={colorClass} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

export function StatsPage({
  codingStats,
  contestSites,
  projects,
  hackathons,
  onNavigate,
}) {
  const allContests = contestSites.flatMap((site) => site.contests)
  const completedProjects = projects.filter(
    (project) => project.status.toLowerCase() === 'completed',
  ).length
  const activeProjects = projects.length - completedProjects
  const averageProgress = projects.length
    ? Math.round(
        projects.reduce((sum, project) => sum + project.progress, 0) /
          projects.length,
      )
    : 0
  const onlineHackathons = hackathons.filter(
    (hackathon) => hackathon.mode.toLowerCase() === 'online',
  ).length
  const { codeforces, codechef, leetcode } = codingStats
  const github = codingStats.github ?? {}
  const githubWeeks = github.weeklyContributions ?? []
  const githubLanguages = github.languages ?? []

  return (
    <section className="stats-page">
      <div className="page-heading">
        <div>
          <p>Performance</p>
          <h1>Stats</h1>
        </div>
        <span className="stats-updated">Updated from workspace data</span>
      </div>

      <div className="stats-metric-grid">
        <MetricCard icon={Trophy} label="Codeforces rating" value={stat(codeforces.rating)} detail={`${stat(codeforces.rank)} · Max ${stat(codeforces.maxRating)}`} />
        <MetricCard icon={Code2} label="CodeChef rating" value={stat(codechef.rating)} detail={`${stat(codechef.stars)} star · Max ${stat(codechef.maxRating)}`} />
        <MetricCard icon={CircleCheckBig} label="LeetCode solved" value={stat(leetcode.solved)} detail={`Contest rating ${stat(leetcode.contestRating)}`} />
        <MetricCard icon={FolderKanban} label="Project progress" value={`${averageProgress}%`} detail={`${activeProjects} active · ${completedProjects} completed`} />
        <MetricCard icon={Rocket} label="Hackathons" value={hackathons.length} detail={`${onlineHackathons} online · ${hackathons.length - onlineHackathons} onsite/hybrid`} />
      </div>

      <div className="stats-detail-grid">
        <article className="stats-detail-card stats-github-card">
          <header>
            <span><GitFork size={19} /></span>
            <div><p>Open source activity</p><h2>GitHub</h2></div>
            {github.profileUrl && <a href={github.profileUrl} target="_blank" rel="noreferrer" aria-label="Open GitHub profile"><ArrowUpRight size={17} /></a>}
          </header>
          <div className="stats-github-overview">
            <div><strong>{stat(github.contributions)}</strong><span>Contributions this year</span></div>
            <div className="stats-contribution-chart" aria-label="Weekly contribution activity">
              {githubWeeks.map((value, index) => (
                <i key={`${index}-${value}`} style={{ height: `${Math.max(18, (value / Math.max(...githubWeeks, 1)) * 100)}%` }} />
              ))}
            </div>
          </div>
          <div className="stats-github-numbers">
            <span><strong>{stat(github.repositories)}</strong>Repositories</span>
            <span><strong>{stat(github.stars)}</strong>Stars earned</span>
            <span><strong>{stat(github.commits)}</strong>Commits</span>
            <span><strong>{stat(github.pullRequests)}</strong>Pull requests</span>
          </div>
          <div className="stats-language-list">
            {githubLanguages.map((language) => (
              <div key={language.name}>
                <span><strong>{language.name}</strong><em>{language.percentage}%</em></span>
                <div className="stats-progress-track"><i style={{ width: `${language.percentage}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="stats-github-footer">
            <span><GitBranch size={14} /> {stat(github.commits)} commits</span>
            <span>{stat(github.reviews)} reviews</span>
            <span>{stat(github.issues)} issues</span>
          </div>
        </article>

        <article className="stats-detail-card">
          <header>
            <span><Code2 size={19} /></span>
            <div><p>Competitive coding</p><h2>Codeforces</h2></div>
            <button onClick={() => onNavigate('competitive-coding')} aria-label="Open competitive coding"><ArrowUpRight size={17} /></button>
          </header>
          <div className="stats-rating-display">
            <div><strong>{stat(codeforces.rating)}</strong><span>Current rating</span></div>
            <em>{codeforces.ratingChange == null ? '—' : `${codeforces.ratingChange > 0 ? '+' : ''}${codeforces.ratingChange}`}</em>
          </div>
          <div className="stats-inline-values">
            <span><strong>{stat(codeforces.maxRating)}</strong>Max rating</span>
            <span><strong>{stat(codeforces.contests)}</strong>Contests joined</span>
            <span><strong>{allContests.length}</strong>Upcoming</span>
          </div>
        </article>

        <article className="stats-detail-card">
          <header>
            <span><Trophy size={19} /></span>
            <div><p>Competitive coding</p><h2>CodeChef</h2></div>
            <button onClick={() => onNavigate('competitive-coding')} aria-label="Open competitive coding"><ArrowUpRight size={17} /></button>
          </header>
          <div className="stats-rating-display">
            <div><strong>{stat(codechef.rating)}</strong><span>Current rating</span></div>
            <em>{codechef.ratingChange == null ? '—' : `${codechef.ratingChange > 0 ? '+' : ''}${codechef.ratingChange}`}</em>
          </div>
          <div className="stats-inline-values stats-four-values">
            <span><strong>{stat(codechef.maxRating)}</strong>Max rating</span>
            <span><strong>{codechef.stars == null ? '—' : `${codechef.stars}★`}</strong>Current level</span>
            <span><strong>{stat(codechef.contests)}</strong>Contests joined</span>
            <span><strong>{codechef.globalRank == null ? '—' : `#${codechef.globalRank.toLocaleString()}`}</strong>Global rank</span>
          </div>
        </article>

        <article className="stats-detail-card">
          <header>
            <span><CircleCheckBig size={19} /></span>
            <div><p>Problem solving</p><h2>LeetCode</h2></div>
          </header>
          <div className="stats-solved-heading"><strong>{stat(leetcode.solved)}</strong><span>of {stat(leetcode.total)} problems solved</span></div>
          <ProgressRow label="Easy" value={leetcode.easy} total={leetcode.solved} colorClass="easy" />
          <ProgressRow label="Medium" value={leetcode.medium} total={leetcode.solved} colorClass="medium" />
          <ProgressRow label="Hard" value={leetcode.hard} total={leetcode.solved} colorClass="hard" />
          <div className="stats-inline-values stats-leetcode-values">
            <span><strong>{stat(leetcode.contestRating)}</strong>Contest rating</span>
            <span><strong>{stat(leetcode.contests)}</strong>Contests joined</span>
            <span><strong>{leetcode.globalRank == null ? '—' : `#${leetcode.globalRank.toLocaleString()}`}</strong>Global rank</span>
          </div>
        </article>

        <article className="stats-detail-card stats-wide-card">
          <header>
            <span><FolderKanban size={19} /></span>
            <div><p>Build progress</p><h2>Projects</h2></div>
            <button onClick={() => onNavigate('projects')} aria-label="Open projects"><ArrowUpRight size={17} /></button>
          </header>
          <div className="stats-project-rows">
            {projects.map((project) => (
              <div key={project.id}>
                <div><strong>{project.name}</strong><span>{project.status} · {project.progress}%</span></div>
                <div className="stats-progress-track"><i style={{ width: `${project.progress}%` }} /></div>
              </div>
            ))}
          </div>
        </article>

        <article className="stats-detail-card stats-wide-card">
          <header>
            <span><Rocket size={19} /></span>
            <div><p>Event activity</p><h2>Hackathons</h2></div>
            <button onClick={() => onNavigate('hackathons')} aria-label="Open hackathons"><ArrowUpRight size={17} /></button>
          </header>
          <div className="stats-hackathon-list">
            {hackathons.map((hackathon) => (
              <div key={hackathon.id}>
                <span className="stats-date-box"><strong>{new Date(hackathon.startsAt).getDate()}</strong><small>{new Date(hackathon.startsAt).toLocaleDateString(undefined, { month: 'short' })}</small></span>
                <div><strong>{hackathon.title}</strong><span>{hackathon.organizer}</span></div>
                <em>{hackathon.mode}</em>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}
