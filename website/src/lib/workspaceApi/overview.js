import { request } from './_shared'

export function loadDashboardOverview(limit = 3) {
  const safeLimit = Math.max(1, Math.min(limit, 20))
  return request(`/dashboard-overview?limit=${safeLimit}`, { useCache: true })
}
