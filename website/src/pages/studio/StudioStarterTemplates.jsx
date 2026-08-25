import { ArrowRight, Code2, Database, LayoutDashboard, Layers, Rocket } from 'lucide-react'

const CURATED_STARTERS = [
  {
    id: 'fullstack-fastapi-react',
    name: 'Fullstack App',
    description: 'React + Vite frontend with FastAPI backend and SQLite database.',
    stack: 'React · FastAPI · SQLite',
    icon: Layers,
    prompt: 'Build a fullstack web application with FastAPI REST API backend, React frontend, SQLite persistence, and responsive UI.',
  },
  {
    id: 'saas-starter',
    name: 'SaaS Dashboard',
    description: 'Subscription dashboard with analytics cards, data tables, and settings.',
    stack: 'React · Vite · Tailwind',
    icon: LayoutDashboard,
    prompt: 'Build a modern SaaS Dashboard with KPI cards, interactive charts, table filters, user management, and dark theme support.',
  },
  {
    id: 'web-react-vite',
    name: 'React SPA',
    description: 'Lightning-fast single-page web app with modular components.',
    stack: 'React 19 · Vite · CSS',
    icon: Rocket,
    prompt: 'Build a responsive React single-page application with modern UI components, client-side routing, and clean animations.',
  },
  {
    id: 'api-fastapi',
    name: 'FastAPI Backend',
    description: 'Clean RESTful API service with automatic docs and schema validation.',
    stack: 'Python · FastAPI · Pydantic',
    icon: Database,
    prompt: 'Build a production-ready FastAPI backend with structured REST endpoints, SQLite repository layer, and OpenAPI Swagger documentation.',
  },
]

export function StudioStarterTemplates({ templates = [], onSelectStarter }) {
  // Merge curated fallback with loaded backend templates if available
  const starters = templates.length > 0
    ? templates.slice(0, 4).map((t, index) => ({
        id: t.id,
        name: t.name,
        description: t.description || 'Pre-configured project foundation ready for Eve to build upon.',
        stack: t.stack || 'Fullstack',
        icon: [Layers, LayoutDashboard, Rocket, Database][index % 4] || Code2,
        prompt: `Build a new project based on ${t.name} template with complete UI and logic.`,
        templateId: t.id,
      }))
    : CURATED_STARTERS

  return (
    <section className="studio-section" aria-label="Starter templates">
      <div className="studio-section-header">
        <h2 className="studio-section-title">Start with a foundation</h2>
      </div>
      <div className="studio-starters-grid">
        {starters.map((starter) => {
          const Icon = starter.icon
          return (
            <article key={starter.id} className="studio-starter-card">
              <div>
                <div className="studio-starter-header">
                  <div className="studio-starter-icon">
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="studio-starter-title">{starter.name}</h3>
                  </div>
                </div>
                <p className="studio-starter-desc">{starter.description}</p>
              </div>
              <div className="studio-starter-footer">
                <span className="studio-stack-tag">{starter.stack}</span>
                <button
                  type="button"
                  className="secondary-button studio-starter-btn"
                  onClick={() => onSelectStarter(starter.prompt, starter.templateId || '')}
                >
                  Use <ArrowRight size={12} aria-hidden="true" />
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
