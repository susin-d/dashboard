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
  Rocket,
  Settings,
} from 'lucide-react'

export const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'stats', label: 'Stats', icon: ChartNoAxesCombined },
  { id: 'todo', label: 'Todo List', icon: ListTodo },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'mails', label: 'Mails', icon: Mail },
  { id: 'competitive-coding', label: 'Competitive Coding', icon: Code2 },
  { id: 'hackathons', label: 'Hackathons', icon: Rocket },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { id: 'documents', label: 'Documents', icon: Files },
  { id: 'setting', label: 'Setting', icon: Settings },
]
