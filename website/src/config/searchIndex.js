import {
  Bell,
  Bot,
  Brain,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  ChartNoAxesCombined,
  CheckSquare,
  Code2,
  Contact,
  Files,
  FolderKanban,
  History,
  Layers,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Mail,
  MessageCircle,
  MessageSquare,
  Moon,
  Palette,
  Phone,
  PhoneCall,
  PlusCircle,
  Rocket,
  Settings,
  Shield,
  Sparkles,
  SquareTerminal,
  UserCheck,
  UserRound,
} from 'lucide-react'

export const SEARCH_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'pages', label: 'Pages' },
  { id: 'settings', label: 'Settings' },
  { id: 'eve', label: 'Eve AI' },
  { id: 'records', label: 'Records' },
  { id: 'actions', label: 'Actions' },
]

export const STATIC_SEARCH_ITEMS = [
  // ── Pages: Work ──
  {
    id: 'page-dashboard',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'Dashboard',
    subtitle: 'Workspace overview, daily planner, quick metrics & widgets',
    badge: 'Work > Dashboard',
    icon: LayoutDashboard,
    page: 'dashboard',
    keywords: ['home', 'overview', 'summary', 'widgets', 'daily', 'planner', 'metrics'],
  },
  {
    id: 'page-todo',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'Todo List',
    subtitle: 'Task management, priorities, deadlines, and task checklist',
    badge: 'Work > Todo',
    page: 'todo',
    icon: ListTodo,
    keywords: ['tasks', 'todos', 'checklist', 'actions', 'done', 'pending', 'priority'],
  },
  {
    id: 'page-projects',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'Projects',
    subtitle: 'Active projects, repositories, lifecycle pipelines, and milestones',
    badge: 'Work > Projects',
    page: 'projects',
    icon: FolderKanban,
    keywords: ['kanban', 'repos', 'git', 'lifecycle', 'idea', 'build', 'ship', 'code'],
  },
  {
    id: 'page-documents',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'Documents',
    subtitle: 'Notes, technical specs, markdown editor, and project documents',
    badge: 'Work > Documents',
    page: 'documents',
    icon: Files,
    keywords: ['docs', 'notes', 'markdown', 'wiki', 'specs', 'writing', 'files'],
  },
  {
    id: 'page-workspace',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'Workspace Files',
    subtitle: 'Code workspace, Monaco editor, file tree & embedded terminal',
    badge: 'Work > Workspace',
    page: 'workspace',
    icon: SquareTerminal,
    keywords: ['editor', 'monaco', 'terminal', 'tree', 'code', 'filesystem', 'ide'],
  },

  // ── Pages: Eve AI ──
  {
    id: 'page-eve-chat',
    type: 'page',
    category: 'eve',
    group: 'Eve AI Assistant',
    title: 'Eve AI Chat',
    subtitle: 'Intelligent AI assistant powered by OpenAI, Anthropic & Gemini',
    badge: 'Eve AI > Chat',
    page: 'eve',
    icon: Bot,
    keywords: ['assistant', 'ai', 'chat', 'llm', 'gpt', 'claude', 'gemini', 'prompts', 'eve'],
  },
  {
    id: 'page-eve-sessions',
    type: 'page',
    category: 'eve',
    group: 'Eve AI Assistant',
    title: 'Eve Chat Sessions',
    subtitle: 'Browse past AI conversations and preserved chat histories',
    badge: 'Eve AI > Sessions',
    page: 'eve-sessions',
    icon: History,
    keywords: ['conversations', 'history', 'saved chats', 'archive', 'sessions'],
  },
  {
    id: 'page-eve-memory',
    type: 'page',
    category: 'eve',
    group: 'Eve AI Assistant',
    title: 'Eve Long-Term Memory',
    subtitle: 'Facts, learned user preferences, and persistent workspace context',
    badge: 'Eve AI > Memory',
    page: 'eve-memory',
    icon: Brain,
    keywords: ['facts', 'knowledge', 'preferences', 'context', 'memory', 'recall'],
  },
  {
    id: 'page-eve-call',
    type: 'page',
    category: 'eve',
    group: 'Eve AI Assistant',
    title: 'Eve Voice & AI Call',
    subtitle: 'Real-time bidirectional voice conversation with Eve AI',
    badge: 'Eve AI > Voice Call',
    page: 'eve-call',
    icon: PhoneCall,
    keywords: ['voice', 'speech', 'webrtc', 'call', 'talk', 'mic', 'groq', 'audio'],
  },
  {
    id: 'page-eve-schedules',
    type: 'page',
    category: 'eve',
    group: 'Eve AI Assistant',
    title: 'Eve Schedules & Reminders',
    subtitle: 'Automated background cron & one-time prompts and voice call triggers',
    badge: 'Eve AI > Schedules',
    page: 'eve-schedules',
    icon: CalendarClock,
    keywords: ['cron', 'recurring', 'reminders', 'timers', 'automated', 'schedule'],
  },

  // ── Pages: Growth ──
  {
    id: 'page-competitive-coding',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'Competitive Coding',
    subtitle: 'Contest radar, LeetCode, Codeforces, CodeChef & contest schedules',
    badge: 'Growth > Coding',
    page: 'competitive-coding',
    icon: Code2,
    keywords: ['leetcode', 'codeforces', 'codechef', 'contests', 'problems', 'dsa', 'rating'],
  },
  {
    id: 'page-hackathons',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'Hackathons',
    subtitle: 'Hackathon discovery, submission deadlines, prizes, and teams',
    badge: 'Growth > Hackathons',
    page: 'hackathons',
    icon: Rocket,
    keywords: ['devpost', 'unstop', 'mlh', 'devfolio', 'prizes', 'events', 'competitions'],
  },
  {
    id: 'page-jobs',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'Job Tracker',
    subtitle: 'Job application pipeline, resume tracker, status & interview log',
    badge: 'Growth > Jobs',
    page: 'jobs',
    icon: BriefcaseBusiness,
    keywords: ['applications', 'interviews', 'careers', 'offers', 'resume', 'companies'],
  },
  {
    id: 'page-stats',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'Analytics & Stats',
    subtitle: 'Coding heatmaps, project velocity, problem solving metrics & stats',
    badge: 'Growth > Stats',
    page: 'stats',
    icon: ChartNoAxesCombined,
    keywords: ['analytics', 'metrics', 'heatmap', 'graph', 'performance', 'charts'],
  },

  // ── Pages: Communication ──
  {
    id: 'page-calendar',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'Calendar',
    subtitle: 'Daily agenda, Google Calendar events, ICS schedules & reminders',
    badge: 'Communication > Calendar',
    page: 'calendar',
    icon: CalendarDays,
    keywords: ['agenda', 'schedule', 'google calendar', 'events', 'deadlines', 'ics'],
  },
  {
    id: 'page-mails',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'Mail',
    subtitle: 'Gmail inbox, messages, category tabs (Primary, Promotions, Updates)',
    badge: 'Communication > Mail',
    page: 'mails',
    icon: Mail,
    keywords: ['gmail', 'inbox', 'emails', 'messages', 'google mail'],
  },
  {
    id: 'page-whatsapp',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'WhatsApp',
    subtitle: 'Multi-device WhatsApp web bridge, chats, messages & reactions',
    badge: 'Communication > WhatsApp',
    page: 'whatsapp',
    icon: MessageCircle,
    keywords: ['whatsapp', 'chats', 'messages', 'qr', 'pairing', 'contacts'],
  },
  {
    id: 'page-chats',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'Direct Chats',
    subtitle: 'Peer-to-peer workspace chats and real-time team messaging',
    badge: 'Communication > Chats',
    page: 'chats',
    icon: MessageSquare,
    keywords: ['direct messages', 'dm', 'chat', 'team'],
  },
  {
    id: 'page-calls',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'Calls',
    subtitle: 'WebRTC voice & video calls, dialing directory, and call history',
    badge: 'Communication > Calls',
    page: 'calls',
    icon: Phone,
    keywords: ['video call', 'voice call', 'webrtc', 'dialer', 'phone', 'ring'],
  },
  {
    id: 'page-contacts',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'Contacts',
    subtitle: 'Address book, Google Contacts sync, email and phone directory',
    badge: 'Communication > Contacts',
    page: 'contacts',
    icon: Contact,
    keywords: ['address book', 'phonebook', 'google contacts', 'people', 'directory'],
  },

  // ── Pages: Account ──
  {
    id: 'page-profile',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'Profile',
    subtitle: 'User details, display name, account credentials and role',
    badge: 'Account > Profile',
    page: 'profile',
    icon: UserRound,
    keywords: ['user', 'profile', 'avatar', 'name', 'account', 'identity'],
  },
  {
    id: 'page-themes',
    type: 'page',
    category: 'pages',
    group: 'Pages & Views',
    title: 'Themes & Appearance',
    subtitle: 'Monochrome theme customizer, font presets, radius & density',
    badge: 'Account > Themes',
    page: 'themes',
    icon: Palette,
    keywords: ['appearance', 'customizer', 'fonts', 'styling', 'dark mode', 'radius', 'monochrome'],
  },
  {
    id: 'page-setting',
    type: 'page',
    category: 'settings',
    group: 'Pages & Views',
    title: 'Settings',
    subtitle: 'Global workspace settings, connected integrations, and accounts',
    badge: 'Account > Settings',
    page: 'setting',
    icon: Settings,
    keywords: ['configuration', 'preferences', 'options', 'setup', 'integrations'],
  },

  // ── Settings Sections (Deep Anchors) ──
  {
    id: 'setting-profile',
    type: 'section',
    category: 'settings',
    group: 'Settings & Preferences',
    title: 'Profile Settings',
    subtitle: 'Change display name, manage user credentials & identity info',
    badge: 'Settings > Profile',
    page: 'setting',
    hash: 'settings-profile',
    icon: UserCheck,
    keywords: ['profile', 'display name', 'email', 'avatar', 'user info', 'name change'],
  },
  {
    id: 'setting-themes',
    type: 'section',
    category: 'settings',
    group: 'Settings & Preferences',
    title: 'Themes & UI Appearance',
    subtitle: 'Configure monochrome design tokens, border radius, density & fonts',
    badge: 'Settings > Themes',
    page: 'setting',
    hash: 'settings-themes',
    icon: Palette,
    keywords: ['themes', 'appearance', 'dark theme', 'light theme', 'typography', 'radius', 'density'],
  },
  {
    id: 'setting-apps',
    type: 'section',
    category: 'settings',
    group: 'Settings & Preferences',
    title: 'Connected Apps & Integrations',
    subtitle: 'Manage Google Calendar, Gmail, GitHub, Google Chat & Drive integrations',
    badge: 'Settings > Integrations',
    page: 'setting',
    hash: 'settings-apps',
    icon: Layers,
    keywords: ['integrations', 'google', 'github', 'gmail', 'google drive', 'google chat', 'oauth', 'ics feeds'],
  },
  {
    id: 'setting-whatsapp',
    type: 'section',
    category: 'settings',
    group: 'Settings & Preferences',
    title: 'WhatsApp Bridge Settings',
    subtitle: 'Pair WhatsApp account, view QR code, check connection and webhook status',
    badge: 'Settings > WhatsApp',
    page: 'setting',
    hash: 'settings-whatsapp',
    icon: MessageCircle,
    keywords: ['whatsapp', 'pairing', 'qr code', 'bridge', 'phone', 'service worker', 'session'],
  },
  {
    id: 'setting-ai-models',
    type: 'section',
    category: 'settings',
    group: 'Settings & Preferences',
    title: 'AI Models & Providers',
    subtitle: 'Configure OpenAI (GPT-5, GPT-4o), Anthropic (Claude 3.7) & Google Gemini',
    badge: 'Settings > AI Models',
    page: 'setting',
    hash: 'settings-ai-models',
    icon: Sparkles,
    keywords: ['ai models', 'openai', 'gpt-5', 'gpt-4o', 'anthropic', 'claude', 'gemini', 'api key', 'llm'],
  },
  {
    id: 'setting-coding',
    type: 'section',
    category: 'settings',
    group: 'Settings & Preferences',
    title: 'Coding Profiles',
    subtitle: 'Sync LeetCode, Codeforces, CodeChef, and AtCoder usernames',
    badge: 'Settings > Coding',
    page: 'setting',
    hash: 'settings-coding',
    icon: Code2,
    keywords: ['leetcode username', 'codeforces handle', 'codechef', 'atcoder', 'coding sync', 'ranking'],
  },
  {
    id: 'setting-hackathons',
    type: 'section',
    category: 'settings',
    group: 'Settings & Preferences',
    title: 'Hackathon Sources',
    subtitle: 'Toggle external hackathon feeds from Devpost, Unstop, MLH & Devfolio',
    badge: 'Settings > Hackathons',
    page: 'setting',
    hash: 'settings-hackathons',
    icon: Rocket,
    keywords: ['hackathon sources', 'devpost feed', 'unstop feed', 'mlh sources', 'devfolio'],
  },
  {
    id: 'setting-eve-voice',
    type: 'section',
    category: 'settings',
    group: 'Settings & Preferences',
    title: 'Eve Voice & Speech Settings',
    subtitle: 'Configure STT/TTS engine, Groq Whisper, Google Cloud TTS, voices & pitch',
    badge: 'Settings > Eve Voice',
    page: 'setting',
    hash: 'settings-eve-voice',
    icon: PhoneCall,
    keywords: ['eve voice', 'tts', 'stt', 'groq whisper', 'google cloud tts', 'speech synthesis', 'mic'],
  },
  {
    id: 'setting-account',
    type: 'section',
    category: 'settings',
    group: 'Settings & Preferences',
    title: 'Account & Security',
    subtitle: 'Reset password, verify email, combine duplicate accounts, and sign out',
    badge: 'Settings > Account',
    page: 'setting',
    hash: 'settings-account',
    icon: Shield,
    keywords: ['password reset', 'security', 'combine accounts', 'verify email', 'logout', 'sign out'],
  },

  // ── Quick Actions ──
  {
    id: 'action-create-todo',
    type: 'action',
    category: 'actions',
    group: 'Quick Actions',
    title: 'Create New Task',
    subtitle: 'Quickly add a new item to your todo list',
    badge: 'Action',
    actionId: 'create-todo',
    icon: PlusCircle,
    keywords: ['new task', 'add todo', 'create task', 'new todo', 'add item'],
  },
  {
    id: 'action-create-project',
    type: 'action',
    category: 'actions',
    group: 'Quick Actions',
    title: 'Add New Project',
    subtitle: 'Start a new project with lifecycle tracking and repository linking',
    badge: 'Action',
    actionId: 'create-project',
    icon: FolderKanban,
    keywords: ['new project', 'add project', 'start repo', 'create project'],
  },
  {
    id: 'action-create-job',
    type: 'action',
    category: 'actions',
    group: 'Quick Actions',
    title: 'Log Job Application',
    subtitle: 'Track a new job application, company, role, and interview timeline',
    badge: 'Action',
    actionId: 'create-job',
    icon: BriefcaseBusiness,
    keywords: ['log job', 'new application', 'apply job', 'job tracker', 'add job'],
  },
  {
    id: 'action-create-document',
    type: 'action',
    category: 'actions',
    group: 'Quick Actions',
    title: 'Create New Document',
    subtitle: 'Start a new markdown document, spec, or notes page',
    badge: 'Action',
    actionId: 'create-document',
    icon: Files,
    keywords: ['new document', 'add doc', 'new note', 'create note', 'write'],
  },
  {
    id: 'action-new-eve-chat',
    type: 'action',
    category: 'actions',
    group: 'Quick Actions',
    title: 'New Eve AI Chat Session',
    subtitle: 'Start a clean chat conversation with Eve AI Assistant',
    badge: 'Action',
    actionId: 'new-eve-chat',
    icon: Bot,
    keywords: ['new chat', 'fresh session', 'reset eve', 'clear chat', 'ask ai'],
  },
  {
    id: 'action-open-eve',
    type: 'action',
    category: 'actions',
    group: 'Quick Actions',
    title: 'Open Eve Assistant Drawer',
    subtitle: 'Launch the Eve AI assistant quick drawer from anywhere',
    badge: 'Action',
    actionId: 'open-eve',
    icon: Bot,
    keywords: ['open eve', 'eve drawer', 'assistant popup', 'ask eve'],
  },
  {
    id: 'action-call-eve',
    type: 'action',
    category: 'actions',
    group: 'Quick Actions',
    title: 'Start Voice Call with Eve',
    subtitle: 'Instantly initiate a live voice session with Eve AI',
    badge: 'Action',
    actionId: 'call-eve',
    icon: PhoneCall,
    keywords: ['call eve', 'voice chat', 'speak to ai', 'voice call', 'eve talk'],
  },
  {
    id: 'action-toggle-theme',
    type: 'action',
    category: 'actions',
    group: 'Quick Actions',
    title: 'Toggle Dark / Light Theme',
    subtitle: 'Switch interface between dark and light monochrome modes',
    badge: 'Action',
    actionId: 'toggle-theme',
    icon: Moon,
    keywords: ['toggle theme', 'dark mode', 'light mode', 'switch theme', 'night mode'],
  },
  {
    id: 'action-open-notifications',
    type: 'action',
    category: 'actions',
    group: 'Quick Actions',
    title: 'View Notifications',
    subtitle: 'Open the notifications drawer and check alerts',
    badge: 'Action',
    actionId: 'open-notifications',
    icon: Bell,
    keywords: ['notifications', 'alerts', 'inbox', 'unread', 'messages'],
  },
  {
    id: 'action-sign-out',
    type: 'action',
    category: 'actions',
    group: 'Quick Actions',
    title: 'Sign Out',
    subtitle: 'Log out of current StarWaves session',
    badge: 'Action',
    actionId: 'sign-out',
    icon: LogOut,
    keywords: ['logout', 'sign out', 'disconnect', 'leave', 'exit'],
  },
]

/**
 * Builds the full searchable index by combining static items with live workspace data.
 */
export function buildSearchIndex(workspaceData = {}) {
  const items = [...STATIC_SEARCH_ITEMS]
  const {
    projects = [],
    jobs = [],
    documents = [],
    hackathons = [],
    tasks = [],
  } = workspaceData

  // Live Projects
  projects.forEach((project) => {
    if (!project?.title && !project?.name) return
    const title = project.title || project.name
    items.push({
      id: `record-project-${project.id}`,
      type: 'record',
      category: 'records',
      group: 'Projects',
      title,
      subtitle: project.description || `Phase: ${project.lifecycle_phase || 'Active'}`,
      badge: 'Project Record',
      page: 'project-detail',
      recordId: project.id,
      recordType: 'project',
      icon: FolderKanban,
      keywords: [
        'project',
        title.toLowerCase(),
        project.lifecycle_phase || '',
        project.status || '',
        ...(project.tags || []),
      ].filter(Boolean),
    })
  })

  // Live Jobs
  jobs.forEach((job) => {
    if (!job?.title && !job?.role && !job?.company) return
    const title = job.title || job.role || 'Job Application'
    const company = job.company || 'Unknown Company'
    items.push({
      id: `record-job-${job.id}`,
      type: 'record',
      category: 'records',
      group: 'Job Applications',
      title: `${title} — ${company}`,
      subtitle: `Status: ${job.status || 'Applied'} • ${job.location || 'Remote'}`,
      badge: 'Job Record',
      page: 'jobs',
      recordId: job.id,
      recordType: 'job',
      icon: BriefcaseBusiness,
      keywords: [
        'job',
        'application',
        title.toLowerCase(),
        company.toLowerCase(),
        job.status || '',
        job.location || '',
      ].filter(Boolean),
    })
  })

  // Live Documents
  documents.forEach((doc) => {
    if (!doc?.title && !doc?.name) return
    const title = doc.title || doc.name
    items.push({
      id: `record-doc-${doc.id}`,
      type: 'record',
      category: 'records',
      group: 'Documents',
      title,
      subtitle: doc.content ? `${doc.content.slice(0, 60)}…` : 'Workspace Document',
      badge: 'Document Record',
      page: 'document-opener',
      recordId: doc.id,
      recordType: 'document',
      icon: Files,
      keywords: ['doc', 'document', 'note', title.toLowerCase()].filter(Boolean),
    })
  })

  // Live Hackathons
  hackathons.forEach((hack) => {
    if (!hack?.title && !hack?.name) return
    const title = hack.title || hack.name
    items.push({
      id: `record-hack-${hack.id}`,
      type: 'record',
      category: 'records',
      group: 'Hackathons',
      title,
      subtitle: hack.description || hack.source || 'Hackathon Event',
      badge: 'Hackathon Record',
      page: 'hackathon-detail',
      recordId: hack.id,
      recordType: 'hackathon',
      icon: Rocket,
      keywords: [
        'hackathon',
        title.toLowerCase(),
        hack.source || '',
        hack.location || '',
      ].filter(Boolean),
    })
  })

  // Live Tasks
  tasks.forEach((task) => {
    if (!task?.text && !task?.title) return
    const title = task.text || task.title
    items.push({
      id: `record-task-${task.id}`,
      type: 'record',
      category: 'records',
      group: 'Tasks',
      title,
      subtitle: task.completed ? 'Completed' : `Priority: ${task.priority || 'Medium'}`,
      badge: 'Task Record',
      page: 'todo',
      recordId: task.id,
      recordType: 'task',
      icon: CheckSquare,
      keywords: ['task', 'todo', title.toLowerCase(), task.completed ? 'completed' : 'pending'].filter(Boolean),
    })
  })

  return items
}

/**
 * Filter and score search results based on query and category.
 */
export function filterSearchItems(items, query = '', selectedCategory = 'all') {
  const trimmed = query.trim().toLowerCase()
  const terms = trimmed.split(/\s+/).filter(Boolean)

  let filtered = items
  if (selectedCategory && selectedCategory !== 'all') {
    filtered = items.filter((item) => item.category === selectedCategory)
  }

  if (!terms.length) {
    return filtered
  }

  const scored = []

  for (const item of filtered) {
    const title = (item.title || '').toLowerCase()
    const subtitle = (item.subtitle || '').toLowerCase()
    const badge = (item.badge || '').toLowerCase()
    const keywords = (item.keywords || []).map((k) => String(k).toLowerCase())

    let score = 0
    let matchedAll = true

    for (const term of terms) {
      let termMatched = false

      // Exact start match on title
      if (title.startsWith(term)) {
        score += 100
        termMatched = true
      } else if (title.includes(term)) {
        score += 50
        termMatched = true
      }

      // Keyword matches
      for (const kw of keywords) {
        if (kw === term) {
          score += 40
          termMatched = true
        } else if (kw.startsWith(term)) {
          score += 25
          termMatched = true
        } else if (kw.includes(term)) {
          score += 15
          termMatched = true
        }
      }

      // Subtitle / Badge match
      if (badge.includes(term)) {
        score += 20
        termMatched = true
      }
      if (subtitle.includes(term)) {
        score += 10
        termMatched = true
      }

      if (!termMatched) {
        matchedAll = false
        break
      }
    }

    if (matchedAll && score > 0) {
      scored.push({ item, score })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => s.item)
}
