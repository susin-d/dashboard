# ARCHITECTURE.md — Starwaves Single Source of Truth

> Companion to `CODEBASE_AUDIT.md` (Phase 1 findings), ADRs `0043–0046` (canonical decisions), and `REFACTOR_REPORT.md` (what changed). `context.md` holds the living snapshot; this file holds the durable rules.

---

## 1. System architecture

```text
Browser / Tauri / Capacitor
  React 19 + Vite (`website/src`) ── HTTPS ──► FastAPI (`server/app`)
        │                                        │  ├─ Services (business logic)
        │                                        │  ├─ Repositories (sole data-access API)
        │                                        │  ├─ db/sql (internal driver) → PostgreSQL 16 + pgvector
        │                                        │  └─ Core (config/auth/errors/cache/pagination)
        └── WebSockets /ws/calls, /ws/whatsapp ──┘
Go WhatsMeow bridge (`services/whatsapp-worker`) ── webhook ──► /api/v1/whatsapp/*
Vercel Cron ──► /api/v1/cron/execute-schedules (serverless)  |  ServerBackgroundWorker (Docker)
```

## 2. Data flow & source of truth

```text
DATABASE (sql/schema.sql + models mirror, read-only this refactor)
   ↓
BACKEND DOMAIN (services/*) — owns ALL business rules
   ↓
API CONTRACT (schemas/* Pydantic; routes thin: validate → delegate → respond)
   ↓
CLIENT (UX validation only; backend authoritative)
```

- **Persistent data:** database wins. `localStorage` mirrors are best-effort caches (private-mode failures ignored); server state wins on conflict.
- **Cache is NEVER truth:** `core/cache.py` (Redis/LRU, TTLs 30/60/300s) and `request.js` GET cache (30s default, per-path overrides) are optimizations only.
- **One implementation per concept:** auth, errors, pagination, config, logging, API transport, WS base URL, storage keys — each has exactly one canonical module (§5).

## 3. Business logic ownership

| Layer | Owns | Must NOT |
|---|---|---|
| `api/routes/*` | request parsing, auth DI, response shape | business rules, SQL, FastAPI types in services |
| `services/*` | orchestration, AI, external APIs, multi-repo flows | FastAPI imports (`Request`, `HTTPException`) |
| `repositories/*` | CRUD, queries, pagination, soft-delete (sole public data API, ADR 0043) | HTTP semantics (uses `core/errors`, never raw `HTTPException`) |
| `db/sql/*` | SQL/Firestore driver internals | imported by routes/services (Grep gate) |
| `core/*` | config, auth, errors, cache, pagination, RLS | business logic |
| `website/src` | presentation + UX validation | duplicated business rules; real data only (no demo/mock) |

## 4. Authentication & authorization

- Bearer `itsdangerous` tokens (`core/auth.py`) + Google/GitHub OAuth with native deep-link.
- DI aliases only: `CurrentUser` / `CurrentUserId` / `DbClient` (`core/dependencies.py`).
- Multi-device: `user_sessions` (30d expiry, 10-cap LRU) + `X-Device-Id` headers + `session_revoked`/`sync_invalidate` events.
- Row-level isolation via `SET LOCAL app.current_user_id` (`core/rls.py`); all mutating endpoints require auth DI. Cron endpoints verify `CRON_SECRET`.

## 5. Canonical modules (do not duplicate)

| Concept | Canonical | Notes (ADR) |
|---|---|---|
| Data access | `repositories/*` public; `db/sql/*` internal | 0043 |
| Errors (BE) | `core/errors.py` (`not_found/bad_request/unauthorized/forbidden/conflict/unprocessable/service_unavailable/bad_gateway/internal`) | 0044; one raw-`HTTPException` exception: dynamic upstream passthrough in `google_chat.py` (commented) |
| Pagination (BE) | `core/pagination.py`; `repositories/pagination.py` is a facade | 0043; cursor `created_at,id` + `limit+1` |
| Config (BE) | `core/config.py Settings` incl. `is_serverless`, `updates_dir` | 0045 |
| API transport (FE) | `lib/request.js` (`apiRequest`, `fetchWithTimeout`, `API_URL`, `getWsBase`) | 0046; raw `fetch` only for OAuth popup, binary, SSE/MediaSource (inline justification) |
| Storage keys (FE) | `lib/storageKeys.js` (verbatim values) + `usePersistentState` | 0045 |
| AI user keys (BE) | `services/ai_models/config.extract_user_keys` (incl. legacy `api_key`) | 0046; `/settings/ai-models` = preference CRUD, `/models` = live discovery |
| Prompts (BE only) | `services/prompts.py` (leaf module); frontend holds zero prompt content | 0049 (serving half superseded — menu UI deleted, nothing fetched); system/tool/extraction/voice prompts never leave the backend |
| Design tokens | `styles/tokens.css` + `themes/dark.css` (ADR 0022) | `var(--…)` only; no bare hex |

## 6. Database

- `sql/`: `extensions.sql → schema.sql → migrations.sql → indexes.sql` (idempotent). `models/__init__.py` mirrors schema via `Base.metadata.create_all`.
- Conventions: UUID string PKs, `created_at/updated_at` (UTC), soft-delete (`deleted` + `deleted_at`), `user_id` ownership with cascade, `WHERE deleted=false` + keyset pagination.
- No schema changes in this refactor (read-only); changes require migration + consumer/test updates + backward-compat check.

## 7. Caching

- Backend: `@cached(ttl, prefix)` per-user keys; manual `cache_invalidate_prefix` on mutation. TTLs preserved as-is (30/60/300s); do not retune without measurement.
- Frontend: GET dedup + TTL cache in `apiRequest` (`useCache:false` opts out). Sessions/auth endpoints always live.
- Invalidation rule: every mutating route invalidates its prefix; background reconciliations (WhatsApp sync, Eve auto-memory) run post-response so reads stay fast.

## 8. API conventions

- Prefix `/api/v1`; REST verbs; cursor pagination (`cursor` + `limit`, `PageResponse`); errors `{ "detail": "…" }`; SSE (`text/event-stream`, `X-Accel-Buffering: no`) for Eve streaming.
- WS at `/ws/calls`, `/ws/whatsapp` (token query); base derived once via `getWsBase()`.

## 9. State management (frontend)

- `SERVER` (fetched via `apiRequest`) / `UI` (local-only via `usePersistentState` + `storageKeys.js`) / `DERIVED` (`useMemo` from authoritative state) / `CACHE` (mirror, never persisted derived state).
- Event names / BroadcastChannels are transport, not state — not in `storageKeys.js`.

## 10. Error handling

- Backend: `core/errors.py` only (same codes/messages as before; `400`-vs-`422` inconsistencies preserved and documented for a future behavior ADR).
- Frontend: `apiRequest` formats `detail` (string/array/object), friendly network/timeout messages, 401 → session cleanup + `starwaves:session-revoked`. No leaked internals (prod 500 is generic).

## 11. Testing

- Backend: `pytest` (`asyncio_mode=auto`); `tests/unit|api|services|e2e`; SQLite harness + real tokens + scripted AI; mocks only for external (AI/HTTP/Twilio/WhatsApp).
- Frontend: `npm run lint` (oxlint, warnings-only baseline) + `npm test` (vitest) + `npm run build` (import/bundle gate).
- Rule: never disable/weaken tests to pass; add success/validation/ownership/edge tests for merged rules.

## 12. Deployment

- Docker Compose (pgvector + Redis + server + worker) with Nginx (rate-limit, Gzip); Vercel serverless (cron + SPA rewrites). Env-file ownership: local `server/.env`, prod `.env.prod`, examples for reference. Secrets never committed.
