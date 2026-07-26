import {
  BriefcaseBusiness,
  ChartNoAxesCombined,
  CalendarDays,
  Code2,
  FolderKanban,
  Files,
  LayoutDashboard,
  ListTodo,
  Mail,
  MessageSquare,
  Rocket,
  Settings,
} from 'lucide-react'

export const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  { id: 'stats', label: 'Stats', icon: ChartNoAxesCombined, group: 'Overview' },
  { id: 'todo', label: 'Todo List', icon: ListTodo, group: 'Plan' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, group: 'Plan' },
  { id: 'mails', label: 'Mail', icon: Mail, group: 'Communicate' },
  { id: 'chats', label: 'Chats', icon: MessageSquare, group: 'Communicate' },
  { id: 'competitive-coding', label: 'Competitive Coding', icon: Code2, group: 'Build & grow' },
  { id: 'hackathons', label: 'Hackathons', icon: Rocket, group: 'Build & grow' },
  { id: 'projects', label: 'Projects', icon: FolderKanban, group: 'Build & grow' },
  { id: 'jobs', label: 'Jobs', icon: BriefcaseBusiness, group: 'Build & grow' },
  { id: 'documents', label: 'Documents', icon: Files, group: 'Build & grow' },
  { id: 'setting', label: 'Settings', icon: Settings },
]
