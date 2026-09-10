import { Brain, CalendarClock, History, MessageSquare, PhoneCall } from 'lucide-react'

export const EVE_TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'sessions', label: 'Sessions', icon: History },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'call', label: 'Voice Call', icon: PhoneCall },
  { id: 'schedules', label: 'Schedules', icon: CalendarClock },
]

export const TAB_PAGE_ID = {
  chat: 'eve',
  sessions: 'eve-sessions',
  memory: 'eve-memory',
  call: 'eve-call',
  schedules: 'eve-schedules',
}
