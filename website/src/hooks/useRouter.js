import { useCallback, useEffect, useMemo, useState } from 'react'

const workspacePages = new Set([
  'dashboard',
  'stats',
  'todo',
  'calendar',
  'mails',
  'chats',
  'competitive-coding',
  'hackathons',
  'projects',
  'jobs',
  'documents',
  'profile',
  'setting',
])

export function workspaceStateFromPath(pathname) {
  const [, root, page, detailId] = pathname.split('/')
  if (root !== 'app') return { page: 'dashboard', projectId: null }
  if (page === 'competitive') {
    return { page: 'competitive-coding', projectId: null }
  }
  if (page === 'projects' && detailId) {
    return { page: 'project-detail', projectId: detailId }
  }
  return {
    page: workspacePages.has(page) ? page : 'dashboard',
    projectId: null,
  }
}

export function useRouter() {
  const [route, setRoute] = useState(() => window.location.pathname)
  const initialWorkspace = useMemo(
    () => workspaceStateFromPath(window.location.pathname),
    [],
  )
  const [activePage, setActivePage] = useState(initialWorkspace.page)
  const [selectedProjectId, setSelectedProjectId] = useState(
    initialWorkspace.projectId,
  )

  useEffect(() => {
    const syncRoute = () => {
      const pathname = window.location.pathname
      const workspace = workspaceStateFromPath(pathname)
      setRoute(pathname)
      if (pathname.startsWith('/app')) {
        setActivePage(workspace.page)
        setSelectedProjectId(workspace.projectId)
      }
    }

    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  const navigate = useCallback((page, options = {}) => {
    let path = '/app/dashboard'

    if (page === 'landing') path = '/'
    else if (page === 'auth') path = '/login'
    else if (page === 'privacy') path = '/privacy'
    else if (page === 'terms') path = '/terms'
    else if (page === 'onboarding') path = '/onboarding'
    else if (page === 'project-detail' && options.projectId) {
      path = `/app/projects/${options.projectId}`
    } else if (page === 'competitive-coding') {
      path = '/app/competitive'
    } else if (workspacePages.has(page)) {
      path = `/app/${page}`
    }

    window.history.pushState({}, '', path)
    setRoute(path)

    if (path.startsWith('/app')) {
      setActivePage(page)
      setSelectedProjectId(options.projectId ?? null)
    }
  }, [])

  return {
    route,
    setRoute,
    activePage,
    setActivePage,
    selectedProjectId,
    setSelectedProjectId,
    navigate,
  }
}
