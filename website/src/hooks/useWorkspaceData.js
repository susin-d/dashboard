import { useEffect, useMemo, useState } from 'react'
import { loadDocuments } from '../lib/documentsApi'
import { loadPlatformCodingStats } from '../lib/codingStatsApi'
import { loadGithubData } from '../lib/githubApi'
import { loadTodos } from '../lib/todosApi'
import { loadGoogleCalendarData } from '../lib/googleCalendar'
import {
  loadContests,
  loadHackathons,
  loadJobs,
  loadNotifications,
  loadProjects,
} from '../lib/workspaceApi'
import { buildCalendarEventIndex } from '../utils/calendarEvents'
import {
  buildCalendarReminders,
  CALENDAR_REMINDER_PREFIX,
} from '../utils/calendarReminders'

export function useWorkspaceData(currentUser, activePage) {
  const [projects, setProjects] = useState([])
  const [jobs, setJobs] = useState([])
  const [documents, setDocuments] = useState([])
  const [codingStats, setCodingStats] = useState(() => ({
    codeforces: {},
    codechef: {},
    leetcode: {},
    github: {},
  }))
  const [tasks, setTasks] = useState([])
  const [notifications, setNotifications] = useState([])
  const [contestSites, setContestSites] = useState([])
  const [hackathons, setHackathons] = useState([])
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState([])

  const calendarEventIndex = useMemo(
    () =>
      buildCalendarEventIndex({
        tasks,
        contestSites,
        hackathons,
        projects,
        jobs,
        googleCalendarEvents,
      }),
    [tasks, contestSites, hackathons, projects, jobs, googleCalendarEvents],
  )

  // Calendar Reminder Sync
  useEffect(() => {
    const syncReminders = () => {
      const generated = buildCalendarReminders(calendarEventIndex)
      setNotifications((current) => {
        const existingById = new Map(
          current.map((notification) => [notification.id, notification]),
        )
        const saved = current.filter(
          ({ id }) => !id.startsWith(CALENDAR_REMINDER_PREFIX),
        )
        const reminders = generated.map((notification) => ({
          ...notification,
          unread: existingById.get(notification.id)?.unread ?? true,
        }))
        return [...reminders, ...saved]
      })
    }

    syncReminders()
    const timer = window.setInterval(syncReminders, 60 * 1000)
    return () => window.clearInterval(timer)
  }, [calendarEventIndex])

  // Google Calendar & Documents Fetch
  useEffect(() => {
    let active = true
    if (!currentUser) {
      setDocuments([])
      setGoogleCalendarEvents([])
      return () => {
        active = false
      }
    }
    loadGoogleCalendarData()
      .then(({ events }) => {
        if (active) setGoogleCalendarEvents(events)
      })
      .catch((error) => {
        console.error('Could not load Google Calendar:', error)
        if (active) setGoogleCalendarEvents([])
      })
    loadDocuments()
      .then((savedDocuments) => {
        if (active) setDocuments(savedDocuments)
      })
      .catch((error) => {
        console.error('Could not load documents:', error)
        if (active) setDocuments([])
      })
    return () => {
      active = false
    }
  }, [currentUser])

  // Core Workspace Data Fetch
  useEffect(() => {
    let active = true
    if (!currentUser) {
      setJobs([])
      setHackathons([])
      setNotifications([])
      setContestSites([])
      return () => {
        active = false
      }
    }
    Promise.allSettled([
      loadJobs(),
      loadHackathons(),
      loadNotifications(),
      loadContests(),
      loadProjects(),
    ]).then(
      ([
        jobsResult,
        hackathonsResult,
        notificationsResult,
        contestsResult,
        projectsResult,
      ]) => {
        if (!active) return
        setJobs(jobsResult.status === 'fulfilled' ? jobsResult.value : [])
        setHackathons(
          hackathonsResult.status === 'fulfilled' ? hackathonsResult.value : [],
        )
        setNotifications(
          notificationsResult.status === 'fulfilled'
            ? notificationsResult.value
            : [],
        )
        setContestSites(
          contestsResult.status === 'fulfilled' ? contestsResult.value : [],
        )
        setProjects((current) => [
          ...(projectsResult.status === 'fulfilled' ? projectsResult.value : []),
          ...current.filter((project) => project.source === 'github'),
        ])
      },
    )
    return () => {
      active = false
    }
  }, [currentUser])

  // Todos Fetch
  useEffect(() => {
    let active = true
    if (!currentUser) {
      setTasks([])
      return () => {
        active = false
      }
    }
    loadTodos()
      .then((savedTasks) => {
        if (active) setTasks(savedTasks)
      })
      .catch((error) => {
        console.error('Could not load todos:', error)
        if (active) setTasks([])
      })
    return () => {
      active = false
    }
  }, [currentUser])

  // Competitive Coding Stats Fetch
  useEffect(() => {
    let active = true
    if (!currentUser || activePage !== 'stats') {
      return () => {
        active = false
      }
    }
    const codingPlatforms = ['codeforces', 'codechef', 'leetcode']
    codingPlatforms.forEach((platform) => {
      loadPlatformCodingStats(platform)
        .then((stats) => {
          if (active) {
            setCodingStats((current) => ({
              ...current,
              [platform]: stats,
            }))
          }
        })
        .catch((error) => {
          console.error(`Could not load ${platform} statistics:`, error)
          if (active) {
            setCodingStats((current) => ({ ...current, [platform]: {} }))
          }
        })
    })
    return () => {
      active = false
    }
  }, [currentUser, activePage])

  // GitHub Data Fetch
  useEffect(() => {
    let active = true
    if (!currentUser) {
      setProjects([])
      setCodingStats((current) => ({ ...current, github: {} }))
      return () => {
        active = false
      }
    }
    loadGithubData()
      .then((data) => {
        if (!active) return
        setCodingStats((current) => ({
          ...current,
          github: data.github ?? {},
        }))
        const githubProjects = (data.repositories ?? []).map((repository) => ({
          id: `github-${repository.owner.login}-${repository.name}`,
          name: repository.name,
          description: repository.description || 'No repository description.',
          status: repository.isArchived ? 'Completed' : 'Active',
          progress: repository.isArchived ? 100 : 0,
          updatedAt: repository.pushedAt,
          members: 1,
          technologies: repository.primaryLanguage
            ? [repository.primaryLanguage.name]
            : [],
          githubUrl: repository.url,
          liveUrl: repository.homepageUrl || repository.url,
          private: repository.isPrivate,
          stars: repository.stargazerCount,
          forks: repository.forkCount,
          source: 'github',
        }))
        setProjects((current) => [
          ...current.filter((project) => project.source === 'manual'),
          ...githubProjects,
        ])
      })
      .catch((error) => {
        console.error('Could not load GitHub data:', error)
        if (active) {
          setProjects((current) =>
            current.filter((project) => project.source === 'manual'),
          )
          setCodingStats((current) => ({ ...current, github: {} }))
        }
      })
    return () => {
      active = false
    }
  }, [currentUser])

  return {
    projects,
    setProjects,
    jobs,
    setJobs,
    documents,
    setDocuments,
    codingStats,
    setCodingStats,
    tasks,
    setTasks,
    notifications,
    setNotifications,
    contestSites,
    setContestSites,
    hackathons,
    setHackathons,
    googleCalendarEvents,
    setGoogleCalendarEvents,
    calendarEventIndex,
  }
}
