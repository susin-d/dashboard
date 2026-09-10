# ADR 0049 — One canonical prompts file; no prompts in frontend

## Status

Accepted

- Date: 2026-09-10
- Deciders: refactor agent (user directive: all prompts in one file, none in frontend)
- Tags: `prompts`, `single-source-of-truth`, `backend`, `frontend`

## Context

Prompt strings lived in ~25 places: `services/eve/instructions.py`, `voice_fast.py`, `auto_memory.py`, `document_reader.py`, `handlers/call.py`, `services/whatsapp.py` templates, 17 `services/eve/tools/*.py` description strings — plus a full frontend copy (`eveConstants.js` preset/tools/starter lists, a second copy inside `EveAssistantModal.jsx`, studio `PROMPT_SUGGESTIONS`). The two frontend Eve lists had already drifted (modal missing the `call` command). Any wording change required N edits with no authoritative copy.

## Decision

- Chosen approach: `server/app/services/prompts.py` owns every prompt string (leaf module — no service/route imports, avoiding circular imports). Sections: system/voice/extraction instructions, call greeting, WhatsApp draft/summary builders, preset prompts, tools list, starter messages (one per surface), studio templates.
- Original modules become thin facades or import the canonical names (`instructions.py` re-exports `EVE_INSTRUCTIONS`; `voice_fast` aliases `VOICE_INSTRUCTIONS`). Counts owned by logic (`auto_memory.MAX_EXTRACTED_MEMORIES`) stay with logic; only text moves (builders take counts as args).
- UI-facing subset served via `GET /api/v1/prompts` (cached read); frontend fetches via `promptsApi` + `usePrompts()` hook with `LoadingState` while loading. All hardcoded frontend prompt arrays deleted. `EVE_TABS`/`TAB_PAGE_ID`/status labels/parsers stay (nav config + logic, not prompts). `questionUtils.js` fallback labels stay (parser behavior, documented boundary). WhatsApp placeholder microcopy stays (UX copy, user-approved).
- Deliberate exception to the ~400-line file rule (§3.3): one concept = one file wins; sections are bannered and independently reviewable.

## Consequences

- **Positive:** one edit point for every prompt; frontend/backend can never drift; tool descriptions version with the prompts they describe.
- **Negative / Cost:** Eve shell modal gains the `call` chip (drift fix, visible one-chip addition); prompts ship with backend deploys; first paint of preset chips waits on one cached GET.
- **Follow-up:** none planned; future prompt additions go to `prompts.py` + endpoint schema only.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| One file per prompt domain | Directly contradicts the directive; reintroduces scattering. |
| Single frontend canonical file | Leaves prompts in the shipped bundle and keeps the backend/frontend fork. |
| Freeze modal's 8-item list via frontend filter | Preserves exact modal UI but keeps prompt knowledge in frontend. |

## References

- `server/app/services/prompts.py`
- `server/app/api/routes/prompts.py`, `server/app/schemas/prompts.py`
- `website/src/lib/promptsApi.js`, `website/src/hooks/usePrompts.js`
- `CODEBASE_AUDIT.md` (prompt inventory was an unlisted duplicate class)
