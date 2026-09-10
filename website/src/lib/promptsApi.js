import { apiRequest } from './request'

// Canonical UI prompt catalog — served by GET /api/v1/prompts (ADR 0049).
// The frontend holds no prompt content; all preset/starter/template text
// comes from the backend's services/prompts.py through this module.
export function fetchPrompts() {
  return apiRequest('/prompts', {
    method: 'GET',
    useCache: true,
    errorMessage: 'Could not load Eve prompts.',
  })
}
