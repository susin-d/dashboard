import {
  LayoutDashboard,
  CheckCircle2,
  CalendarDays,
  Code2,
  Rocket,
  FolderKanban,
  Bot,
  Sparkles,
  PhoneCall,
  Brain,
  Layers,
  Orbit,
  ShieldCheck,
  Zap,
  FileText,
  MessageCircle,
  MonitorPlay,
} from 'lucide-react'

export const navLinks = [
  { label: 'Story', href: '#manifesto' },
  { label: 'Showcase', href: '#showcase' },
  { label: 'Eve AI', href: '#eve' },
  { label: 'Workflow', href: '#workflow' },
]

export const manifesto = [
  {
    kicker: 'Act I — Consolidate',
    title: 'One calm surface\nfor everything',
    body: 'Tasks, calendars, contests, hackathons, jobs, projects, docs, mail and chat — stitched into a single sharp black canvas so you never lose the thread.',
    icon: Layers,
    accent: 'mono',
  },
  {
    kicker: 'Act II — Accelerate',
    title: 'Velocity without\nthe noise',
    body: 'Monaco workspace, modular dashboard, live contest radar and pipeline tracking. Built for deep work, not dashboards that shout.',
    icon: Orbit,
    accent: 'mono',
  },
  {
    kicker: 'Act III — Remember',
    title: 'An assistant that\nlives in your work',
    body: 'Eve reads your files, remembers every decision, browses the web, manages WhatsApp and calls you when it matters.',
    icon: Brain,
    accent: 'mono',
  },
]

export const showcaseScenes = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    headline: 'Your command center',
    copy: 'Drag, resize, curate. Presets for builder, competitor and job-seeker archetypes — all in one live grid.',
    bullets: ['12 widget types', 'Grid memory per user', 'Keyboard command palette'],
    color: '#FFFFFF',
  },
  {
    id: 'workspace',
    label: 'Code Workspace',
    icon: MonitorPlay,
    headline: 'A real editor, inside',
    copy: 'Monaco, file tree, search, breadcrumbs and Eve file tools. No mock IDE — the actual one.',
    bullets: ['Monaco Editor + minimap', 'File sync to projects', 'Eve writes & reads files'],
    color: '#FFFFFF',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: CalendarDays,
    headline: 'One timeline to rule them',
    copy: 'Tasks, Google Calendar, contest dates, interviews and hackathons merged into an ICS-aware unified calendar.',
    bullets: ['Google sync + ICS import', 'Reminder engine', 'Contest auto-feed'],
    color: '#FFFFFF',
  },
  {
    id: 'eve',
    label: 'Eve AI',
    icon: Bot,
    headline: 'Chat. Voice. Memory.',
    copy: 'Six providers, streaming replies, persistent sessions and semantic memory via pgvector.',
    bullets: ['Sessions + vector recall', 'Voice calls with captions', 'Cron schedules'],
    color: '#FFFFFF',
  },
]

export const eveCapabilities = [
  {
    icon: Sparkles,
    title: 'Conversational memory',
    desc: 'OpenAI, Anthropic, Gemini and OpenRouter via one tool loop. Sessions persist, memories are embedded with pgvector and surfaced when relevant.',
    points: ['Tool-aware workspace search', 'Web browsing built-in', 'Auto-remember key facts'],
  },
  {
    icon: PhoneCall,
    title: 'Voice that calls you',
    desc: 'Bidirectional WebRTC calls. Browser STT/TTS or server Groq Whisper + Google TTS. Live captions, echo guard and a pulse visualizer.',
    points: ['Hold-to-talk + transcripts', 'Eve can trigger calls', 'Waveform + captions'],
  },
  {
    icon: CalendarDays,
    title: 'Schedules that run alone',
    desc: 'One-time and cron prompts or voice calls — executed by Vercel cron every 15 minutes even when you are away.',
    points: ['Cron + one-time', 'Prompt or call', 'Schedule via chat'],
  },
]

export const features = [
  { icon: CheckCircle2, title: 'Tasks', desc: 'Priorities, filters and focus modes that stay out of your way.', tint: '#FFFFFF' },
  { icon: CalendarDays, title: 'Unified Calendar', desc: 'Merged Google, ICS and contest timelines with reminders.', tint: '#FFFFFF' },
  { icon: Code2, title: 'Competitive Hub', desc: 'Codeforces, LeetCode, CodeChef ratings and upcoming rounds.', tint: '#FFFFFF' },
  { icon: FolderKanban, title: 'Projects', desc: 'Lifecycle phases idea → maintain with tech stacks and links.', tint: '#FFFFFF' },
  { icon: Rocket, title: 'Jobs & Hackathons', desc: 'Pipelines for applications, interviews, submissions and docs.', tint: '#FFFFFF' },
  { icon: LayoutDashboard, title: 'Dashboard', desc: 'Reorderable grid with live widgets for your current mode.', tint: '#FFFFFF' },
  { icon: FileText, title: 'Documents', desc: 'Project-linked docs with Monaco preview and Drive import.', tint: '#FFFFFF' },
  { icon: MessageCircle, title: 'Mail & Chat', desc: 'Gmail tabs, WhatsApp bridge and persistent chats.', tint: '#FFFFFF' },
]

export const workflow = [
  {
    step: '01',
    title: 'Land & connect',
    text: 'Create account, link Google, import ICS, add coding handles. Your sources pour into one timeline in under a minute.',
    icon: ShieldCheck,
  },
  {
    step: '02',
    title: 'Shape your stage',
    text: 'Arrange the modular dashboard, pick a theme, spin up a workspace folder. Eve learns your context as you work.',
    icon: Layers,
  },
  {
    step: '03',
    title: 'Move at will',
    text: 'Eve remembers, reminds and calls. You stay in flow — no tab cemetery, no scattered state.',
    icon: Zap,
  },
]

export const faqs = [
  {
    q: 'What is StarWaves exactly?',
    a: 'A personal productivity workspace for developers and builders. It merges tasks, projects, jobs, hackathons, coding stats, calendar, documents, mail, WhatsApp and an AI assistant into one cohesive dark canvas.',
  },
  {
    q: 'Which integrations are first-class?',
    a: 'Google Calendar (live sync + ICS), Gmail (tabs + compose), Drive, Google Chat, GitHub, Codeforces / LeetCode / CodeChef contests, and WhatsApp via the Go bridge.',
  },
  {
    q: 'What can Eve do beyond chat?',
    a: 'Eve searches your workspace, reads and writes files, browses the web, summarizes WhatsApp chats, manages schedules and initiates voice calls. All tools run through the same six-provider engine.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Workspace data is isolated per user, scoped by auth, and least-privilege per integration. Disconnect any service in Settings. No data is sold or used for training.',
  },
  {
    q: 'How does voice work?',
    a: 'Browser Web Speech for instant use, plus optional server Groq Whisper STT and Google Cloud / OpenRouter TTS. Captions stream live during calls with an echo guard.',
  },
  {
    q: 'What about Google data usage?',
    a: 'Calendar (readonly) for events, Gmail (readonly/modify/send) only after you connect, Drive (metadata + files you open), and openid/email/profile for sign-in. Revoke anytime.',
  },
]
