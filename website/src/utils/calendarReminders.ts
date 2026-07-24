import type { CalendarEvent } from './calendarEvents'

export const CALENDAR_REMINDER_PREFIX = 'calendar-reminder-'

type ReminderNotification = {
  id: string
  type: string
  destination: string
  title: string
  message: string
  time: string
  unread: boolean
}

function localDateAt(dateKey: string, time = '09:00:00') {
  return new Date(`${dateKey}T${time}`)
}

function eventStart(event: CalendarEvent, dateKey: string) {
  if (event.type === 'contest' || event.type === 'hackathon') {
    return new Date(event.source.startsAt)
  }

  if (event.type === 'task') {
    return localDateAt(dateKey, '23:59:59')
  }

  if (event.type === 'job') {
    if (event.source.calendarKind === 'Applied') return null
    return localDateAt(dateKey)
  }

  return null
}

function reminderType(event: CalendarEvent) {
  if (event.type === 'contest') return 'contest'
  if (event.type === 'job') return 'job'
  return 'calendar'
}

function reminderDestination(event: CalendarEvent) {
  const destinations: Record<CalendarEvent['type'], string> = {
    task: 'todo',
    contest: 'competitive-coding',
    hackathon: 'hackathons',
    project: 'projects',
    job: 'jobs',
    google: 'calendar',
  }

  return destinations[event.type] ?? 'calendar'
}

export function buildCalendarReminders(
  eventIndex: Map<string, CalendarEvent[]>,
  now = new Date(),
): ReminderNotification[] {
  const reminders: ReminderNotification[] = []
  const oneHour = 60 * 60 * 1000
  const oneDay = 24 * oneHour

  eventIndex.forEach((events, dateKey) => {
    events.forEach((event) => {
      const startsAt = eventStart(event, dateKey)
      if (!startsAt || Number.isNaN(startsAt.getTime())) return

      const remaining = startsAt.getTime() - now.getTime()
      if (remaining <= 0 || remaining > oneDay) return

      const threshold = remaining <= oneHour ? '1-hour' : '1-day'
      const time =
        threshold === '1-hour'
          ? `Starts in ${Math.max(1, Math.ceil(remaining / 60000))} min`
          : `Starts in ${Math.max(1, Math.ceil(remaining / oneHour))} hr`

      reminders.push({
        id: `${CALENDAR_REMINDER_PREFIX}${event.id}-${threshold}`,
        type: reminderType(event),
        destination: reminderDestination(event),
        title:
          threshold === '1-hour'
            ? 'Starting within 1 hour'
            : 'Coming up within 1 day',
        message: event.label,
        time,
        unread: true,
      })
    })
  })

  return reminders.sort((left, right) => left.time.localeCompare(right.time))
}
