import { getStoredAuthToken } from './authApi'
import { fetchWithTimeout } from './request'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

async function request(path, options = {}, authenticated = true) {
  const headers = {}
  if (authenticated) {
    const token = getStoredAuthToken()
    if (!token) throw new Error('Sign in to access workspace data.')
    headers.Authorization = `Bearer ${token}`
  }
  if (options.body) headers['Content-Type'] = 'application/json'
  const response = await fetchWithTimeout(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  })
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    throw new Error(failure?.detail || 'Workspace data is unavailable.')
  }
  return response.status === 204 ? null : response.json()
}

function mapJob(job) {
  return {
    id: job.id,
    company: job.company,
    role: job.role,
    status: job.status,
    location: job.location,
    workType: job.work_type,
    salary: job.salary,
    appliedDate: job.applied_date ?? '',
    interviewDate: job.interview_date ?? '',
    deadline: job.deadline ?? '',
    resumeId: job.resume_id,
    jobUrl: job.job_url,
    notes: job.notes,
  }
}

export async function loadJobs(cursor = null) {
  const page = await request(`/jobs?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`)
  return { ...page, items: page.items.map(mapJob) }
}

export async function createJob(job) {
  return mapJob(
    await request('/jobs', {
      method: 'POST',
      body: JSON.stringify({
        company: job.company,
        role: job.role,
        status: job.status,
        location: job.location,
        work_type: job.workType,
        salary: job.salary,
        applied_date: job.appliedDate || null,
        interview_date: job.interviewDate || null,
        deadline: job.deadline || null,
        resume_id: job.resumeId,
        job_url: job.jobUrl,
        notes: job.notes,
      }),
    }),
  )
}

export async function updateJob(jobId, job) {
  const payload = {}
  if ('company' in job) payload.company = job.company
  if ('role' in job) payload.role = job.role
  if ('status' in job) payload.status = job.status
  if ('location' in job) payload.location = job.location
  if ('workType' in job) payload.work_type = job.workType
  if ('salary' in job) payload.salary = job.salary
  if ('appliedDate' in job) payload.applied_date = job.appliedDate || null
  if ('interviewDate' in job) payload.interview_date = job.interviewDate || null
  if ('deadline' in job) payload.deadline = job.deadline || null
  if ('resumeId' in job) payload.resume_id = job.resumeId
  if ('jobUrl' in job) payload.job_url = job.jobUrl
  if ('notes' in job) payload.notes = job.notes

  return mapJob(
    await request(`/jobs/${encodeURIComponent(jobId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  )
}

export function deleteJob(jobId) {
  return request(`/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' })
}

export async function loadHackathons(cursor = null) {
  const page = await request(`/hackathons?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`)
  return { ...page, items: page.items.map((record) => ({
    id: record.id,
    title: record.title,
    organizer: record.organizer,
    startsAt: record.starts_at,
    endsAt: record.ends_at,
    mode: record.mode,
    teamSize: record.team_size,
    tags: record.tags,
    url: record.url,
    source: record.source ?? 'manual',
  })) }
}

export function loadHackathonSources() {
  return request('/hackathon-sources')
}

export function setHackathonSourceEnabled(sourceId, enabled) {
  return request(
    `/hackathon-sources/${encodeURIComponent(sourceId)}?enabled=${enabled}`,
    { method: 'PUT' },
  )
}

export async function createHackathon(hackathon) {
  const record = await request('/hackathons', {
    method: 'POST',
    body: JSON.stringify({
      title: hackathon.title,
      organizer: hackathon.organizer,
      starts_at: new Date(hackathon.startsAt).toISOString(),
      ends_at: new Date(hackathon.endsAt).toISOString(),
      mode: hackathon.mode,
      team_size: hackathon.teamSize,
      tags: hackathon.tags,
      url: hackathon.url,
    }),
  })
  return {
    id: record.id,
    title: record.title,
    organizer: record.organizer,
    startsAt: record.starts_at,
    endsAt: record.ends_at,
    mode: record.mode,
    teamSize: record.team_size,
    tags: record.tags,
    url: record.url,
    source: record.source ?? 'manual',
  }
}

export async function updateHackathon(hackathonId, hackathon) {
  const payload = {}
  if ('title' in hackathon) payload.title = hackathon.title
  if ('organizer' in hackathon) payload.organizer = hackathon.organizer
  if ('startsAt' in hackathon) payload.starts_at = new Date(hackathon.startsAt).toISOString()
  if ('endsAt' in hackathon) payload.ends_at = new Date(hackathon.endsAt).toISOString()
  if ('mode' in hackathon) payload.mode = hackathon.mode
  if ('teamSize' in hackathon) payload.team_size = hackathon.teamSize
  if ('tags' in hackathon) payload.tags = hackathon.tags
  if ('url' in hackathon) payload.url = hackathon.url

  const record = await request(`/hackathons/${encodeURIComponent(hackathonId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return {
    id: record.id,
    title: record.title,
    organizer: record.organizer,
    startsAt: record.starts_at,
    endsAt: record.ends_at,
    mode: record.mode,
    teamSize: record.team_size,
    tags: record.tags,
    url: record.url,
    source: record.source ?? 'manual',
  }
}

export function deleteHackathon(hackathonId) {
  return request(`/hackathons/${encodeURIComponent(hackathonId)}`, { method: 'DELETE' })
}

function cleanProjectId(projectId) {
  return String(projectId).replace(/^project-/, '')
}

function mapProject(project) {
  return {
    id: `project-${project.id}`,
    name: project.name,
    description: project.description,
    status: project.status,
    progress: project.progress,
    members: project.members,
    technologies: project.technologies,
    githubUrl: project.github_url,
    liveUrl: project.live_url,
    lifecyclePhase: project.lifecycle_phase,
    updatedAt: project.updated_at,
    source: 'manual',
  }
}

export async function loadProjects(cursor = null) {
  const page = await request(`/projects?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`)
  return { ...page, items: page.items.map(mapProject) }
}

export async function createProject(project) {
  return mapProject(
    await request('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: project.name,
        description: project.description,
        status: project.status,
        progress: Number(project.progress),
        members: Number(project.members),
        technologies: project.technologies,
        github_url: project.githubUrl,
        live_url: project.liveUrl,
        lifecycle_phase: project.lifecyclePhase ?? 'idea',
      }),
    }),
  )
}

export async function updateProject(projectId, project) {
  const rawId = cleanProjectId(projectId)
  const payload = {}
  if ('name' in project) payload.name = project.name
  if ('description' in project) payload.description = project.description
  if ('status' in project) payload.status = project.status
  if ('progress' in project) payload.progress = Number(project.progress)
  if ('members' in project) payload.members = Number(project.members)
  if ('technologies' in project) payload.technologies = project.technologies
  if ('githubUrl' in project) payload.github_url = project.githubUrl
  if ('liveUrl' in project) payload.live_url = project.liveUrl
  if ('lifecyclePhase' in project) payload.lifecycle_phase = project.lifecyclePhase

  return mapProject(
    await request(`/projects/${encodeURIComponent(rawId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  )
}

export function deleteProject(projectId) {
  const rawId = cleanProjectId(projectId)
  return request(`/projects/${encodeURIComponent(rawId)}`, { method: 'DELETE' })
}

export function loadNotifications(cursor = null) {
  return request(`/notifications?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`)
}

export function updateNotification(notificationId, unread) {
  return request(`/notifications/${encodeURIComponent(notificationId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ unread }),
  })
}

export function deleteNotification(notificationId) {
  return request(`/notifications/${encodeURIComponent(notificationId)}`, {
    method: 'DELETE',
  })
}

export function markAllNotificationsRead() {
  return request('/notifications/mark-all-read', { method: 'POST' })
}

export function registerDeviceToken(token, deviceName = null) {
  return request('/notifications/device-token', {
    method: 'POST',
    body: JSON.stringify({ token, device_name: deviceName }),
  })
}

export function unregisterDeviceToken(tokenId) {
  return request(`/notifications/device-token/${encodeURIComponent(tokenId)}`, {
    method: 'DELETE',
  })
}

export function getRegisteredDevices() {
  return request('/notifications/devices')
}

export function sendPushNotification(title, body, data = null, targetDeviceToken = null) {
  return request('/notifications/send', {
    method: 'POST',
    body: JSON.stringify({
      title,
      body,
      data,
      target_device_token: targetDeviceToken,
    }),
  })
}

export function loadContests(cursor = null) {
  return request(`/contests?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, {}, false)
}

export function loadCalendarData() {
  return request('/calendar-data')
}

export function sendCalendarReminderTest(window = '1h', eventTitle = 'Team Sync & Code Review') {
  return request('/email/send-calendar-reminder-test', {
    method: 'POST',
    body: JSON.stringify({ window, event_title: eventTitle }),
  })
}


