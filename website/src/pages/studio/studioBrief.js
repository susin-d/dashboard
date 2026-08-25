const BRIEF_STORAGE_PREFIX = 'starwaves.studio.brief.'

export function setStudioBrief(projectId, brief) {
  try {
    sessionStorage.setItem(BRIEF_STORAGE_PREFIX + projectId, JSON.stringify(brief))
  } catch {
    // sessionStorage unavailable — the builder simply opens without the pre-filled brief.
  }
}

export function takeStudioBrief(projectId) {
  try {
    const raw = sessionStorage.getItem(BRIEF_STORAGE_PREFIX + projectId)
    if (!raw) return null
    sessionStorage.removeItem(BRIEF_STORAGE_PREFIX + projectId)
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function composeBriefText(prompt, attachments = []) {
  if (!attachments.length) return prompt
  const fileBlocks = attachments.map((file) => (
    `\n\n--- File: ${file.name} ---\n${file.textContent || '[Binary file — content not included]'}`
  ))
  return `${prompt}${fileBlocks.join('')}`
}
