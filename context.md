# Starwaves Context

Living snapshot for AI agents. `AGENTS.md` holds permanent rules; this file holds the **current state**. See `CHANGELOG.md` for history and `PROJECT_MAP.md` for the file index.

Last updated: 2026-09-01 — Glassmorphism design system: 15 new --glass-* tokens (light/dark), radial gradient body mesh, glassmorphism.css layer covering 12 surfaces (topbar, sidebar, cards, modals, dropdowns, settings cards, search palette, metric cards, alerts, Eve panel, tab nav, backdrops) with prefers-reduced-motion support + ADR 0010

## Contents
1. [Overview](#1-overview) · 2. [Repository structure](#2-repository-structure) · 3. [Backend](#3-backend) · 4. [Frontend](#4-frontend) · 5. [Design system](#5-design-system) · 6. [Current snapshot](#6-current-snapshot) · 7. [Limitations](#7-limitations) · 8. [Verification](#8-verification)

## 1. Overview
Personal productivity workspace: projects, jobs, tasks, documents, code workspace, calendars, email, WhatsApp, hackathons, competitive programming, and EVE AI assistant.

- **Frontend** (`/website`): React 19 + Vite + Vanilla CSS (monochrome) + Monaco Editor. Docker multi-stage + Nginx. `vite define __APP_VERSION__` + updaters (`updatesApi`, `desktopUpdater`, `androidUpdater`, `otaUpdater`, `useAutoUpdater`, `UpdateBanner`, `UpdateSection` in Settings).
- **Backend** (`/server`): FastAPI + Supabase PostgreSQL 16 + pgvector + Async SQLAlchemy 2.0. Mount `server/static/updates` at `/updates` (StaticFiles) + `/api/v1/updates` (check/latest/android/ota).
- **Desktop** (`/website/src-tauri`): Tauri v2 + bundle `msi/nsis` + `tauri-plugin-updater/process` (pubkey in tauri.conf, endpoints `api.starwaves.../updates/latest.json`).
- **Worker** (`/services/whatsapp-worker`): Go (WhatsMeow) bridge.
- **Build** (`/scripts`): `build-{android,desktop,ota,all}.{ps1,sh}` + `lib/common.ps1` (sign via env `TAURI_SIGNING_PRIVATE_KEY`/`ANDROID_KEYSTORE_*`, version sync `package.json→gradle/tauri.conf`, `cap sync`, `gradlew/tauri build`, scp publish).
- **Auth:** Bearer `itsdangerous` tokens + Google OAuth (web popup + native deep-link `com.starwaves.app://` / `app.starwaves.workspace://` via `platform` state → 302, Capacitor Browser/App + Tauri deep-link, `isNativeApp` landing→login, 16px mobile inputs). Deploy targets Vercel (serverless) or Docker VM.

## 2. Repository structure
```text
starwaves/
├── website/            React 19 + Vite (monochrome, Monaco, lucide-react, Framer Motion)
├── server/             FastAPI backend (app/api, app/core, app/db/sql, models, repos, schemas, services)
├── services/whatsapp-worker/  Go bridge
├── sql/                extensions.sql, schema.sql (18 tables incl. user_sessions+ai_usage), migrations.sql, indexes.sql (incl. HNSW)
├── nginx/              reverse proxy (10r/s burst 60, /api /ws /updates + Gzip; alias /updates → server_backend)
├── scripts/            build-android/desktop/ota/all (.ps1+.sh, lib/common) + deploy (vm-*, pc-*)
├── docs/adr/           ADRs (0001 no-sub-agents, 0002 eve-tool-calling, 0003 build scripts, 0004 auto-update, 0005 ai-provider-hardening, 0006 canonical-domain, 0007 diff-errors, 0008 oauth-deep-link + _template + README)
├── docs/BUILD.md       Build guide (Android APK/AAB + Desktop MSI/NSIS + OTA)
├── PROJECT_MAP.md      Compact index for agents — read first (Tier 1)
├── context.md          This file — current snapshot (Tier 2, <15k)
├── CHANGELOG.md        History log
├── AGENTS.md           Permanent agent rules (incl. §1.6 no-sub-agents, §1.7 ADRs, §1.8 no-demo-data, §1.9 no-temp-fixes)
└── opencode.json       Preloads AGENTS.md + PROJECT_MAP.md via instructions
```
For full maps see `PROJECT_MAP.md`. Keep this section brief; expand there.

## 3. Backend
- **Factory:** `server/app/main.py` `create_app()` — lifespan (CORS, `/api/v1` router, `/ws/calls`, `/ws/whatsapp`, `ServerBackgroundWorker`).
- **Worker:** `core/worker.py` `ServerBackgroundWorker` (Docker) + Vercel Cron `vercel.json` → `/api/v1/cron/execute-schedules` `*/15 * * * *` (serverless, rewrites `((?!api/).*)`). Verify `CRON_SECRET`.
- **Prefix:** `/api/v1`. Auth via `core/auth.py`. Errors via `core/errors.py`. Pagination via `core/pagination.py` (cursor `created_at,id` + `limit+1`).
- **Layering:** Routes → Services/Repos → Core/Models. Never import FastAPI types in Services/Repos. Use `CurrentUser`/`CurrentUserId`/`DbClient` from `core/dependencies.py`.
- **Route groups:** `auth/` (oauth/credentials/password/account/combine/sessions), `workspace/` (jobs/hackathons/projects/notifications/contests/calendar), `whatsapp/` (status/chats/messages/settings/webhook+`_shared`), `workspace_files`, `whatsapp_ws`+`calls_ws`+`twilio-relay`, `eve`+`eve_stream` (SSE), `calls`+`calls_twilio`, `ai_models`, `eve_speech`, `ui_preferences` (`/ui/preferences` tokens/CSS/visibility/history + `GET /history`), `cron`, `health`.
  - **Repos:** one per entity (`helpers.py` soft-delete/snapshot, `pagination.py` facade). **Services:** `eve/` (chat/stream/tools/handlers/memories/RAG + `ui` tools), `ui_preferences` (per-user `ui-preferences` doc, `users/{uid}/settings/ui-preferences` v1, sanitize CSS, allowlist tokens, history 20), `ai_models/` (contracts `AIServiceError(kind/status/retry_after)` + `classify_provider_error` rate_limit 429/auth 401/model 404/context 422/server 503; catalog/config/discovery/loop + adapters — `openai_compat` converts flat→nested `function` + OpenRouter Referer/Title + Ollama auth fix; default universally `openai`/`gpt-4o-mini` with first-available fallback `openai→anthropic→gemini→groq→openrouter→ollama→opencode`; `groq` now `3.3-70b`; ADR 0005; Gemini thought + Anthropic 8192; discovery prefix `gpt-5/o4` broadened; unified live 5min; ADR 0007 differentiated errors), `speech/` (Groq/Deepgram STT, Google/OpenRouter TTS), `twilio/`, `oauth/` (also `FRONTEND_URL` for email/OAuth targetOrigin — now canonical `starwaves.susindran.in`, ADR 0006), `web_browsing/`, `embeddings` (text-embedding-3-small 1536-dim).
- **DB:** `models/` (`UserSession` for devices) + mixins. SQL in `sql/` (idempotent, now `user_sessions` + indexes `ix_user_sessions_*`). `db/sql/` modular handlers + `registry.py` dispatch + `base.py` CRUD + RLS `SET LOCAL app.current_user_id`. Device sessions 30d expiry, 10 cap LRU.
  - **Performance:** hot reads `async+to_thread`, composite indexes (`ix_*_user_deleted_created`, `ix_calls_status_updated`), pools `5/5 recycle 300`, Redis/LRU `core/cache.py` (`CACHE_TTL_SHORT=30`/`MEDIUM=60`/`LONG=300`, `cached` decorator with per-user `prefix:user_id:hash` keys, Pydantic-aware `cache_set`, `cache_invalidate_prefix` + `cache_clear` + autouse test fixture), workspace disk `WORKSPACE_STORAGE_PATH`. `usage:summary/logs` now `SHORT 30s` + `log_usage` invalidates `usage:summary|logs:{user_id}` + dict-direct token extraction (`prompt/completion/total` fallback). Rate-limit: Nginx `10r/s burst 60` (was 30, double for OPTIONS preflight) → CORS via `$cors_allow_origin` map (susindran.in+vercel.app+localhost) + conditional `$cors_allow_*` maps (fix 429 leak to evil) + `RateLimitMiddleware` `Retry-After`.

## 4. Frontend
- **Entry:** `website/src/main.jsx` → `App.jsx` (routing + workspace state). **Layout:** `layouts/AppLayout.jsx`.
- **UI primitives** `components/ui/` (`Modal`, `MailModal`, `ConfirmDialog`, `PageHeader`, `EmptyState`, `CustomDropdown`, `CalendarPicker`, `Markdown`, `TabNav`, `SectionHeading`, `SettingsCard`, `MetricCard`, `SearchBar`, `Pagination`, `FilterBar`, `Alert`, `LoadingState`, `Avatar`, `Badge`, `EveUiBanner`) — must reuse before creating ad-hoc.
- **Hooks:** `hooks/` (`useAuth` + storage/BroadcastChannel sync, `useRouter`, `useThemeCustomizer`, `useWorkspaceData` (single debounced effect, uid-stable, **staggered 0/120/150/300/450ms tiers + 600ms GitHub**), `useCustomUI` + `CustomUIProvider` (single fetch, per-nav reuse), `useDevices`, `useSyncEvents` (debounced 300ms, selective invalidation), `call/` `useWebRTC`/`useEveVoice`/`useCallCenter` (multi-device ring, BroadcastChannel)) + `usePersistentState`.
 - **API clients** `lib/` — one per backend feature, all via `request.js` `apiRequest` (dedup + **default GET cache 30s / 15s for `/usage/` + 60s/120s per-path TTL + `useCache:false` opt-out** + `invalidateCacheForPath` + **concurrency 6 + GET retries 2 (jitter, Retry-After, Failed-to-fetch) + mode cors + Vercel localhost warn** + `X-Device-Id/Name`, 401 auto-logout). `usageApi` now respects 15s per-path cache (was `useCache:false`), `aiModelsApi.listProviderModels` `useCache 60s + retries 2`, `authApi.js` device-aware, `useDevices`, `uiPreferencesApi`, `firebase.js`.
- **Pages:** Dashboard, Projects, ProjectDetail, Jobs, Hackathons, Todo, Documents, Workspace (IDE + Eve + Browser), Studio (hero → builder/apps/templates), Eve (chat+memory+voice+schedules), Calls (WebRTC+Twilio), WhatsApp, Mails, Calendar, Contacts, CompetitiveCoding, Stats, `UsagePage` (honest empty state + `EmptyState`, column-major 26×7 heatmap, Daily/Weekly/Cumulative, dynamic months, clamp tooltips, formatTokens), Settings (`DeviceSection` + `AppearanceSection`), `CustomPage`, Themes, Profile, Onboarding, Landing, etc.
- **Config:** `config/navigation.js`, `config/search/` (7 modules), `dashboard/dashboardConfig.js`, `themes/` 22 presets, `utils/` pure transformers, `styles/` tokens→base→utilities→responsive→components (`eve-ui.css`, `device-section.css`)→pages→`layout-symmetry.css`.
- **Performance:** lazy heavy pages, Vite `manualChunks` (vendor/firebase/monaco/grid), `request.js` default cache + dedup + **concurrency 6** (navigation is cache-hit within TTL, workspace bust only via 300ms-debounced `sync_invalidate`; staggered 600ms spreads dashboard burst well under Nginx 60).

## 5. Design system
- **Palette:** monochrome base (`#000`/`#09090b`/`#121212`/`#18181b`, `#fff`/`#fafafa`/`#f4f4f5`, grays `#27272a`/`#3f3f46`/`#71717a`/`#e4e4e7`) + 12 curated duotones (abyss teal, ember, aurum etc. via `presets.js` 22 total). No arbitrary colors outside presets.
- **Tokens first:** `styles/tokens.css` CSS vars (8pt scale `--space-3xs`→`--space-3xl`, `--content-max-width` 1440, `--content-gutter` clamp, `--section-gap` clamp, `--card-padding` clamp, `--header-height` 68/62, `--sidebar-collapsed/expanded`). Import order `tokens→base→utilities→responsive→components→pages→layout-symmetry` via `App.css`.
- **One CSS per component/page**, `kebab-case` classes scoped (`studio-prompt-attachment-chip`), use vars (`var(--radius-lg)`), dark overrides in `styles/themes/dark.css`.
- **Full-page, no clip:** `min-height:100vh` accounting for chrome, natural scroll. Responsive mobile-first with `clamp()`. Geometry now single-source in `layout-symmetry.css` (centered `max-width:1440` + symmetric `content-gutter` + `safe-area` insets; fullscreen exceptions for Workspace/WhatsApp/Studio/Eve).
- Icons `lucide-react` only.

## 6. Current snapshot
- Simple GET caching: `core/cache.py` `cached(ttl,prefix)` wraps all hot-read GETs (`/todos`, `/contacts`, `/documents`, `/profiles`, `/workspace/projects|jobs|notifications`, `/eve/sessions|memories`, `/settings/*`, `/usage/*` now `SHORT 30s` + `log_usage` invalidates, `/auth/me`, `/calls/*`, `/eve/schedules`, `/ui/preferences`, `/settings/eve-memory`) with `prefix:user_id:hash` keys and `cache_invalidate_prefix` on mutations; Redis SETEX else LRU-1000; `tests` autouse `cache_clear`.
- Multi-device B+C+E: `user_sessions` (device_id/name, jti, expires 30d, 10 cap) via `create_session_token` (X-Device-Id/Name) + `GET/PATCH/DELETE /auth/sessions` + `POST /revoke-others` + WS `session_revoked`/`sync_invalidate` (`whatsapp_ws_manager` multi) + `request.js` 401→`starwaves:session-revoked` + `useAuth` storage/BroadcastChannel + `DeviceSection` settings + `useSyncEvents` (invalidate → `workspaceRefreshKey`) + `todos`/`workspace_files` broadcast.
- Workspace IDE folder-first + Monaco tabs/breadcrumb + Explorer + Eve Agent SSE panel (`useEveAgentChat.js`, `workspace_id` required on file tools, now also dispatches `eve-ui-update` for UI tools) + Browser side panel (`htmlContent` srcdoc, `initialUrl`, `starwaves.workspace.browser-url:{id}`).
- Studio: `StudioHero` (Add files picker + attachment chips + `studioBrief.js` brief) → builder fixed-viewport IDE; hero `flex:1` full-bleed; `StudioAppsPage` lists `build_status: ready` apps.
- EVE: multi-provider (OpenAI/Anthropic/Gemini/OpenRouter/Ollama/OpenCode/Groq) with live `/v1/models` discovery; `openai_compat` converts EVE flat tools to Chat Completions nested `function` shape (fixes OpenRouter/Ollama/OpenCode/Groq tool calling; ADR 0002); `stream_chat_with_eve` SSE (`delta/tool_start/tool_end/done/error+[DONE]`); pgvector RAG (top-5, HNSW `ix_eve_memories_embedding`, fallback 40 recent); auto-remember (capped 3, deduped, toggle `users/{uid}/settings/eve-memory`); tools: `read/write/list/search/run` workspace files (require `workspace_id`), web `browse/search/fetch`, WhatsApp, `open_workspace_browser`, schedule (`create/list/delete`), UI (`get_ui_state`/`update_ui_theme`/`update_ui_styles`/`manage_ui_visibility`/`reset_ui`/`list_ui_history`/`create_custom_page` → `ui-preferences` + `apply_ui_overrides`/`reset_ui`/`open_custom_page` actions + `eve-ui-update` event + `useCustomUI` + `EveUiBanner`), `QuestionCard` plan UI, `ModelSelectorDropdown` with key filtering; `eve/chat_context` shared resolver.
- Voice: dual path — `voice_fast.py` Groq `llama-3.1-8b-instant` sentence-chunked TTS + `POST /eve/voice/stream` + `streamEveVoice` queue + Twilio `ConversationRelay` `/ws/twilio-relay` (~0.7–1.2s); STT: browser/Groq Whisper/Deepgram `nova-3` via `POST /eve/transcribe`; TTS: browser/Google Cloud/OpenRouter Fish `s2.1-pro-free` via `POST /eve/synthesize`; Settings `eve-speech` catalog with fallback.
- Calls: `in_app` (WebRTC) vs Twilio PSTN (`TWILIO_*`, `provider/external_sid/phone_number`, `useCallCenter dial(provider,phone)` + barge-in). **Multi:** `CallWSManager policy=multi`, ringing broadcasts to all devices, `handleCallEvent` active→teardown incoming on other devices, `BroadcastChannel('starwaves-call')` per-tab sync.
- Search: `⌘K` palette across pages/settings/Eve/records/actions with pills + keyboard nav.
- Landing: sharp Linear cinema (`LandingPage.jsx` 87L + 8 Framer Motion sections + `cinema.css` scoped 373L, fixed dark #000).
  - Security: RLS `SET LOCAL` via `set_rls_user` in `sql/base` generic handlers, `starwaves_app` role, `SECURITY.md`, rate-limit 10r/s burst 60 (was 30, 429 had No Allow-Origin → now conditional maps + vercel regex, 443 server inherits http-level to avoid override) + `RateLimitMiddleware` `Retry-After`, `pickle→json`, CORS allowlist (susindran.in canonical + vercel.app previews + localhost/capacitor, wildcard `*.vercel.app` via regex; ADR 0006 — vercel.app 308s to susindran.in to avoid Safe Browsing flag), `realpath`, `DOMPurify`, pip `no-build-isolation` + npm `--ignore-scripts`, UI CSS sanitized (blocks `@import`/`javascript:`/external `url`/`< >`) + allowlisted tokens + history-capped 20.
   - Infra: compose lean e2-micro (pgvector 128M, redis 96M, server 512M), Nginx 10r/s burst 60 + Gzip (now `$cors_allow_origin`+`$cors_allow_*` conditional maps + `burst 60` for /api /ws + 443 inherits http-level), Vercel cron `/cron/execute-schedules` + `vercel.json` 308 `starwaves.vercel.app → starwaves.susindran.in` (canonical) + `api.starwaves.susindran.in` backend (ADR 0006).
  - Process: no sub-agents — direct execution only (`AGENTS.md` §1.6, `PROJECT_MAP.md` fast-path) + tiered context (`context.md` <15k as living snapshot, `CHANGELOG.md` for history) + ADRs required (`docs/adr/0001` + `_template.md` + `README.md` index, `NNNN-kebab-case` numbering) + no demo/mock UI data (§1.8) + no temp/easy fixes (§1.9).

## 7. Limitations
- Calendar create/edit not implemented. Mail attachments/forwarding/rich-text/drafts not implemented. Calls use STUN only — TURN needed for strict NAT. Frontend bundle emits size advisory.

## 8. Verification
```text
# Frontend (website/)
npm run lint && npm run build && npm test
# Backend (server/)
python -m pytest tests -q
# Docker
docker compose config && curl -i http://localhost/health
```
Tests: pytest `asyncio_mode=auto`, harness `tests/support/` (SQLite, real tokens, scripted AI providers), `tests/{unit,api,services,e2e}` — mocks only external (AI/HTTP/Twilio/WhatsApp).
