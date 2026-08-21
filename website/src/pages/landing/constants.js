import {
  CalendarDays,
  CheckCircle2,
  Code2,
  FolderKanban,
  LayoutDashboard,
  Rocket,
  Layers,
  Zap,
  Bot,
  SquareTerminal,
} from 'lucide-react'

export const previewTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'coding', label: 'Coding', icon: Code2 },
  { id: 'jobs', label: 'Jobs', icon: Rocket },
  { id: 'eve', label: 'Eve AI', icon: Bot },
]

export const features = [
  {
    icon: CheckCircle2,
    badge: 'Organize',
    title: 'Smart Task Management',
    copy: 'Plan daily work, categorize priorities, and keep every milestone visible with intuitive filters and focus modes.',
  },
  {
    icon: CalendarDays,
    badge: 'Timeline',
    title: 'Unified Workspace Calendar',
    copy: 'Merge task deadlines, contests, interviews, hackathons and Google Calendar into one clear, monochrome timeline.',
  },
  {
    icon: Code2,
    badge: 'Growth',
    title: 'Competitive Coding Hub',
    copy: 'Track live contest schedules, ratings and problem stats across Codeforces, LeetCode and CodeChef in one place.',
  },
  {
    icon: FolderKanban,
    badge: 'Projects',
    title: 'Project Command Center',
    copy: 'Follow lifecycle phases, store tech stacks, link repositories and coordinate deliverables without the chaos.',
  },
  {
    icon: Rocket,
    badge: 'Careers',
    title: 'Job & Hackathon Tracker',
    copy: 'Manage application pipelines, interview stages, hackathon submissions and document links in a single pipeline.',
  },
  {
    icon: LayoutDashboard,
    badge: 'Custom',
    title: 'Modular Dashboard',
    copy: 'Resize, rearrange and curate widgets to match your workflow. Presets for builders, job-seekers and competitors.',
  },
  {
    icon: Bot,
    badge: 'Intelligence',
    title: 'Eve AI Assistant',
    copy: 'Chat, remember, schedule, call and work across your workspace with persistent memory, voice and web browsing.',
  },
  {
    icon: SquareTerminal,
    badge: 'Workspace',
    title: 'Code Workspace',
    copy: 'Monaco-powered editor, file tree, terminal and Eve coding tools — your lightweight IDE inside the workspace.',
  },
]

export const integrations = [
  { name: 'Google Calendar' },
  { name: 'Gmail' },
  { name: 'Google Drive' },
  { name: 'Google Chat' },
  { name: 'GitHub' },
  { name: 'Codeforces' },
  { name: 'LeetCode' },
  { name: 'WhatsApp' },
]

export const proofItems = [
  'Custom dashboard',
  'Unified calendar',
  'Competitive stats',
  'Career pipeline',
]

export const cinemaStats = [
  { target: 8, suffix: '+', label: 'Integrated Modules', sub: 'Tasks, code, jobs & comms' },
  { target: 100, suffix: '%', label: 'Monochrome Focus', sub: 'Zero clutter, pure clarity' },
  { text: 'Real-time', label: 'Live Sync', sub: 'Synced across devices' },
  { target: 50, prefix: '< ', suffix: 'ms', label: 'Instant Load', sub: 'Built for velocity' },
]

export const workflowSteps = [
  {
    step: '01',
    title: 'Consolidate Everything',
    description: 'Connect tasks, calendars, coding handles, job applications, docs, mail and chat into a single calm dashboard.',
    icon: Layers,
  },
  {
    step: '02',
    title: 'Tailor Your Space',
    description: 'Arrange modular widgets, toggle Kanban, Calendar and List layouts, and pick a theme that fits your focus.',
    icon: LayoutDashboard,
  },
  {
    step: '03',
    title: 'Achieve with Velocity',
    description: 'Stay in flow without context-switching. Eve remembers, reminds and calls when it matters.',
    icon: Zap,
  },
]

export const eveHighlights = [
  {
    title: 'Conversational & Persistent',
    desc: 'Multi-provider chat (OpenAI, Anthropic, Gemini) with sessions, long-term memory and workspace-aware tools.',
    points: ['Sessions & memory', 'Workspace tools', 'Web browsing'],
  },
  {
    title: 'Voice & Presence',
    desc: 'Bidirectional voice calls with real-time captions, STT/TTS and an elegant pulse visualizer for natural interaction.',
    points: ['Browser + Groq/Google voices', 'Live captions', 'Mute & controls'],
  },
  {
    title: 'Schedules & Automation',
    desc: 'One-time and cron-powered reminders that run as chat prompts or automatic Eve calls — even when you are away.',
    points: ['Cron & one-time', 'Auto chat or call', 'Vercel cron backed'],
  },
]

export const faqItems = [
  {
    question: 'How does StarWaves keep my work focused?',
    answer: 'StarWaves unifies your essential developer tools — tasks, calendar, coding tracker, hackathons, jobs, projects, docs, mail and chat — inside a calm, distraction-free monochrome interface designed for deep work.',
  },
  {
    question: 'Can I sync Google Calendar or import external schedules?',
    answer: 'Yes. Connect Google Calendar for live sync and import ICS files for contests, interviews or personal calendars. Everything merges into one unified timeline with reminders.',
  },
  {
    question: 'Which competitive coding platforms are supported?',
    answer: 'Codeforces, LeetCode and CodeChef for contest schedules and rating analytics, plus GitHub for commit and contribution insights.',
  },
  {
    question: 'What can Eve AI actually do?',
    answer: 'Eve chats with memory, searches your workspace, browses the web, reads and writes files, manages WhatsApp, schedules reminders, and can call you with voice. It runs on your chosen provider — OpenAI, Anthropic or Gemini.',
  },
  {
    question: 'Is my workspace data private and secure?',
    answer: 'Your data is isolated per user with strict authentication and scoped access. Integrations use least-privilege scopes and you can disconnect any service at any time from Settings.',
  },
  {
    question: 'How does StarWaves use my Google account data?',
    answer: 'StarWaves only requests access to services you explicitly connect — Calendar to display events, Gmail to manage messages, Drive to import documents. Data is used solely within your workspace and never sold or shared. Disconnect anytime.',
  },
]
