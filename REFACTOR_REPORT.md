# REFACTOR_REPORT — Single Source of Truth (2026-09-10)

> Scope per user mandate: audit → canonicals → dedup → config → contracts/state → docs. Behavior **strictly preserved**; database **read-only** (no migrations). Commits: `b36f553` (Phase 1 audit) · `7e715fe` (ADRs 0043–0046 + errors) · `b088521` (backend + frontend canonicals) · `464a9d9` (docs) · follow-ups below.

## Follow-up (2026-09-10, same mandates)
- Debt #3 closed: second `0034` ADR renumbered → `0047-avatar-studio-zoom-fix.md` (+ README row; header notes the rename).
- Debt #4 closed: spent one-offs `server/gen_memories.py` + `server/write_memories.py` deleted (history preserved in `f3310ac`).
- Debt #2 closed: `models/__init__.py` (409) split into `user/workspace/calls/eve/settings/workspace_files/whatsapp/sessions/usage` + `_shared` + facade `__init__` (import path preserved; 18 tables verified identical; circular-import order unchanged from baseline — see note in commit).
- Intentionally deferred: `services/whatsapp.py` (549) stays one class — single responsibility per external system, routes already split (`whatsapp/status/chats/messages/webhook`), and tests mock `WhatsAppService.*` paths; splitting would add seams without removing duplication (§17: one module suffices). Same for the 19 oversized frontend files (no duplication; splitting needs visual QA).

---

## Removed
- Raw `raise HTTPException(` from **31 backend route modules** (156 sites) → `core/errors.py` helpers (same codes/messages, incl. preserved `400`-vs-`422` inconsistencies).
- `os.getenv` bypasses in `server/app/main.py` (serverless detection, updates-dir) → `settings.is_serverless` / `settings.updates_dir`.
- Per-module `BACKEND_API_URL` constants (`googleContacts.js`, `googleMail.js`) and `VITE_API_URL` read in `popupOAuth.js` → shared `API_URL` from `request.js`.
- Duplicated WS base derivation (`callsSocket.js` + `whatsappSocket.js`, 12 lines each) → `getWsBase()` in `request.js`.
- Duplicated legacy `api_key→api_keys` migration blocks (`ai_models.py`, `unified_models.py`, plus inline copy in `resolve_ai_config`) → `extract_user_keys()` in `services/ai_models/config.py`.
- `from fastapi import HTTPException` from 30 route modules (kept only where still used: `auth/password.py` except-clause, `google_chat.py` upstream passthrough); orphaned `status` imports in 12 modules.
- Inline `HTTPException` import inside `repositories/pagination.py` → `core/errors.bad_request` (Repo→Core direction preserved).

## Merged
- Pagination: `repositories/pagination.py` is now a documented facade over `core/pagination.py` (re-export + collection helpers).
- AI key handling: one `_extract_user_keys` implementation behind `extract_user_keys()` (routes keep thin wrappers where call sites exist).
- Avatar/UI cache key: `AVATAR_CACHE_KEY` ≡ `UI_CACHE_KEY` (single value, both export paths preserved).
- Overlay position key: two `OVERLAY_POSITION_KEY` definitions → one in `storageKeys.js`.

## Moved
- All `localStorage`/`sessionStorage` keys (≈55 literals across 30 files) → `website/src/lib/storageKeys.js` (values verbatim; zero storage literals remain outside it — verified by Grep).
- Filter keys missed in first pass (`jobs.*`, `mail.*`, `projects.*`, `todo.filter`) → same module.
- (Deferred) `models/__init__.py` monolith split, oversized-component splits — see Remaining Debt.

## Canonical Sources of Truth
`repositories/*` (data API) · `core/errors.py` · `core/pagination.py` · `core/config.py Settings` · `lib/request.js` (`apiRequest`/`API_URL`/`getWsBase`) · `lib/storageKeys.js` · `services/ai_models/config.extract_user_keys` · `styles/tokens.css` · `sql/schema.sql` (persistent truth, untouched).

## Business Logic Ownership
Routes thin (validate→delegate→respond); services own orchestration/AI/external APIs; repositories own data access; clients UX-validation only. No rule moved layers with changed semantics — mechanical canonicalization only.

## API Changes
**None.** Same paths, verbs, status codes, messages, cursor format, WS URLs. Two additive helpers (`conflict` 409, `internal` 500) cover codes the helper module lacked.

## Database Changes
**None** (read-only mandate honored).

## Tests
- Backend: `tests/unit` + `test_whatsapp.py` + `test_eve_routes.py` + `test_services_units.py` — exit 0 (incl. extended `test_errors.py` for the two new helpers). Full `tests/` suite exceeds 180s locally (pre-existing; e2e/services need live deps).
- Frontend: `npm run lint` exit 0 (pre-existing warnings only) · `npm test` 40/40 · `npm run build` exit 0 (caught + fixed 3 misplaced imports during key migration).
- Grep gates: `temp fix|easy fix|quick fix|workaround` clean · zero storage literals outside `storageKeys.js` · one documented raw-`HTTPException` remainder (dynamic upstream status passthrough).

## Remaining Technical Debt
1. **Oversized files** (limit ~400/hard 500): BE `services/whatsapp.py:549`; FE 19 files >400 (`SceneViewport:560`, `useEveVoice:521` known audio exception, `App.jsx:506`, …). Split via facade packages when touched.
2. **`models/__init__.py` (328-line monolith)** → `models/*.py` + facade (import path preserved).
3. **ADR `0034` number collision** (`avatar-modeling-studio-projects` + `avatar-studio-zoom-fix`) + README index ordering — rename second to next free + reorder (docs-only).
4. **Committed one-off scripts** `server/gen_memories.py` / `write_memories.py` (landed via `f3310ac`) — move to `server/scripts/` with README or delete once `memories.py` stabilizes.
5. **Pre-existing ruff F401s** (unused `ArrayUnion`, `SERVER_TIMESTAMP`, etc.) and `E402`s in `eve.py` — untouched (out of scope).
6. **`useAuth` storage-event prefix** (`startsWith('starwaves:')`) only matches colon-form keys — verify intended coverage in a behavior ADR (left as-is).
7. **Deploy-script sprawl** (4× compose, `vm-quick-fix.sh` naming) + **event/channel-name centralization** — follow-ups, not started.
8. Full `pytest tests -q` runtime (>180s) — investigate slow e2e/service tests separately.

## Known Risks
- Codemod breadth (156 sites) mitigated by verbatim preservation + green subset suites; full-suite run recommended in CI.
- Key migration (30 files) mitigated by verbatim values + build gate; users keep stored data (no renames).
- `f3310ac` (memory functions) landed mid-refactor from another session; its `memories.py` changes were not re-audited here — confirm no duplicate memory-cache logic vs `_rag_cache`/`_memories_cache` in a follow-up.

## Final Architecture
See `ARCHITECTURE.md`. Dependency direction holds: UI → API/Controller → Service → Repository → Database; Repositories → Core; Core → nothing. Cache never authoritative. One implementation per concept per table in `ARCHITECTURE.md` §5.
