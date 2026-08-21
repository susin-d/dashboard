export const STUDIO_BUILD_STATUS_LABELS = {
  draft: 'Draft',
  planned: 'Planned',
  building: 'Building',
  ready: 'Ready',
  error: 'Error',
}

export const STUDIO_PLAN_STATUS_LABELS = {
  none: 'No plan yet',
  proposed: 'Awaiting approval',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const DB_PREFERENCE_OPTIONS = [
  { id: 'sqlite', label: 'SQLite (default)' },
  { id: 'postgres', label: 'PostgreSQL' },
  { id: 'supabase', label: 'Supabase' },
  { id: 'mongodb', label: 'MongoDB' },
  { id: 'none', label: 'No database' },
]

export const BUILDER_CENTER_TABS = [
  { id: 'code', label: 'Code' },
  { id: 'preview', label: 'Preview' },
]

export function buildStatusLabel(status) {
  return STUDIO_BUILD_STATUS_LABELS[status] ?? status
}

export function planStatusLabel(status) {
  return STUDIO_PLAN_STATUS_LABELS[status] ?? status
}
