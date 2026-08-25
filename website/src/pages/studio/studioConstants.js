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

const PROMPT_NAME_WORD_COUNT = 6
const PROMPT_NAME_MAX_LENGTH = 48

export function deriveProjectName(prompt) {
  const words = prompt
    .trim()
    .split(/\s+/)
    .slice(0, PROMPT_NAME_WORD_COUNT)
    .join(' ')
    .replace(/[^\w\s-]/g, '')
    .trim()
  if (!words) return 'Untitled App'
  const titled = words.replace(/\b\w/g, (char) => char.toUpperCase())
  return titled.slice(0, PROMPT_NAME_MAX_LENGTH)
}
