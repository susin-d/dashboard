import { useState } from 'react'
import { StarWavesLogo } from '../../../components/StarWavesLogo'
import { previewTabs } from '../constants'
import { Clock, TrendingUp, Code2, Briefcase, Check, Bot, Sparkles } from 'lucide-react'

export function ShowcaseSection({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [demoTasks, setDemoTasks] = useState([
    { id: 1, text: 'Review Codeforces Round #980 solutions', done: true, priority: 'High' },
    { id: 2, text: 'Prepare system architecture doc for StarWaves v2', done: false, priority: 'High' },
    { id: 3, text: 'Submit application for Senior Full-Stack Engineer', done: false, priority: 'Medium' },
  ])

  const toggleDemoTask = (id) => {
    setDemoTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  return (
    <section className="landing-showcase" id="landing-showcase">
      <div className="showcase-inner">
        <div className="landing-section-heading text-center scroll-reveal">
          <p className="section-eyebrow">See it in action</p>
          <h2>A workspace that works the way you do</h2>
          <span className="section-subtitle">Switch contexts without losing context. Interactive preview — try toggling a task.</span>
        </div>
        <div className="landing-product-preview scroll-reveal reveal-delay-2" aria-label="StarWaves interactive workspace preview">
          <div className="landing-preview-top">
            <div className="landing-preview-brand">
              <StarWavesLogo size={18} />
              <span>starwaves.app</span>
            </div>
            <div className="landing-preview-dots"><i /><i /><i /></div>
          </div>

          <div className="landing-preview-tab-bar" role="tablist" aria-label="Workspace preview tabs">
            {previewTabs.map(({ id, label, icon: TabIcon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                className={`preview-tab-btn ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <TabIcon size={14} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="landing-preview-shell">
            {activeTab === 'dashboard' && (
              <div className="preview-tab-content fade-in">
                <div className="preview-header"><small>WORKSPACE OVERVIEW</small><h2>Dashboard</h2></div>
                <div className="preview-grid-cards">
                  <div className="preview-card"><div className="preview-card-meta"><Clock size={14} aria-hidden="true" /><small>TODAY&apos;S SCHEDULE</small></div><strong>4 Events</strong><span>2 tasks, 1 contest, 1 interview</span></div>
                  <div className="preview-card"><div className="preview-card-meta"><TrendingUp size={14} aria-hidden="true" /><small>PROJECT PROGRESS</small></div><strong>78% Completed</strong><span>12 active tasks in sprint</span></div>
                  <div className="preview-card"><div className="preview-card-meta"><Code2 size={14} aria-hidden="true" /><small>CODEFORCES RATING</small></div><strong>1,648 Expert</strong><span>+42 gain this month</span></div>
                  <div className="preview-card"><div className="preview-card-meta"><Briefcase size={14} aria-hidden="true" /><small>JOB PIPELINE</small></div><strong>3 Active</strong><span>1 interview scheduled</span></div>
                </div>
              </div>
            )}
            {activeTab === 'tasks' && (
              <div className="preview-tab-content fade-in">
                <div className="preview-header"><small>PRIORITY QUEUE</small><h2>Tasks — Interactive</h2></div>
                <div className="preview-demo-task-list">
                  {demoTasks.map((t) => (
                    <button key={t.id} type="button" className={`preview-task-item ${t.done ? 'completed' : ''}`} onClick={() => toggleDemoTask(t.id)} aria-pressed={t.done}>
                      <span className="task-checkbox" aria-hidden="true">{t.done && <Check size={12} />}</span>
                      <span className="task-text">{t.text}</span>
                      <span className="task-priority-badge">{t.priority}</span>
                    </button>
                  ))}
                  <p className="preview-hint">Click any task to toggle — no account needed for this preview</p>
                </div>
              </div>
            )}
            {activeTab === 'calendar' && (
              <div className="preview-tab-content fade-in">
                <div className="preview-header"><small>TIMELINE</small><h2>Unified Calendar</h2></div>
                <div className="preview-calendar-grid">
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day,i)=> (
                    <div key={day} className={`calendar-day-col ${i===2?'today':''}`}>
                      <span className="day-name">{day}</span>
                      <span className="day-num">{20+i}</span>
                      {i===1 && <div className="cal-event-pill">Codeforces Div 2</div>}
                      {i===2 && <div className="cal-event-pill highlight">Sprint Demo</div>}
                      {i===4 && <div className="cal-event-pill">Tech Interview</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'coding' && (
              <div className="preview-tab-content fade-in">
                <div className="preview-header"><small>COMPETITIVE STATS</small><h2>Contests & Performance</h2></div>
                <div className="preview-coding-stats">
                  <div className="coding-stat-box"><span className="platform-tag">Codeforces</span><strong>1,648</strong><small>Max: 1,720 • Specialist</small></div>
                  <div className="coding-stat-box"><span className="platform-tag">LeetCode</span><strong>1,912</strong><small>Knight • 450+ solved</small></div>
                  <div className="coding-stat-box full-width">
                    <div className="contest-upcoming-row"><div><strong>Codeforces Round #982 (Div. 2)</strong><span>Tomorrow • 14:35 UTC</span></div><button className="contest-remind-btn" onClick={() => onNavigate('/signup')}>Remind me</button></div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'jobs' && (
              <div className="preview-tab-content fade-in">
                <div className="preview-header"><small>CAREER & OPPORTUNITIES</small><h2>Application Pipeline</h2></div>
                <div className="preview-kanban">
                  <div className="kanban-col"><span>Applied (2)</span><div className="kanban-card"><strong>Frontend Engineer</strong><small>Stripe • 2d ago</small></div></div>
                  <div className="kanban-col"><span>Interviewing (1)</span><div className="kanban-card highlight"><strong>Staff AI Engineer</strong><small>Anthropic • Technical round</small></div></div>
                  <div className="kanban-col"><span>Offer (1)</span><div className="kanban-card"><strong>Systems Architect</strong><small>Vercel • Offer review</small></div></div>
                </div>
              </div>
            )}
            {activeTab === 'eve' && (
              <div className="preview-tab-content fade-in">
                <div className="preview-header"><small>EVE AI — WORKSPACE ASSISTANT</small><h2>Ask, remember, automate</h2></div>
                <div className="eve-preview-grid">
                  <div className="eve-preview-card"><div className="eve-preview-icon"><Bot size={16} aria-hidden="true" /></div><strong>Chat with memory</strong><span>Long-term recall across sessions</span></div>
                  <div className="eve-preview-card"><div className="eve-preview-icon"><Sparkles size={16} aria-hidden="true" /></div><strong>Voice calls</strong><span>Call Eve or be called — with captions</span></div>
                  <div className="eve-preview-card wide"><div className="eve-preview-code"><span className="code-prompt">you → eve</span> “Remind me every Monday 9am to review applications and call me if I miss it.”<span className="code-reply">eve → schedule created • cron 0 9 * * 1 • action: call</span></div></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
