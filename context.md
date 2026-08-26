# Starwaves Context

Living project snapshot for AI agents. `AGENTS.md` holds the permanent rules;
this file holds the **current state** of the codebase and must be kept up to
date whenever the implementation changes.

> **Last updated:** 2026-08-26 (Security Phase 3 — Twilio hard enforce + docs prod-gate + worker HMAC + RLS role + SECURITY.md: `calls_twilio.py` `verify_twilio_request` enforce in prod (skip in dev/test), `main.py` `docs_url/openapi_url=None` in prod, `webhook.go` `X-Worker-Signature` hex HMAC-SHA256 emission, `sql/migrations.sql` `starwaves_app` least-privilege role + grants, `SECURITY.md` gitleaks/pip-audit runbook; Phase 2: rate-limit prod-only token-bucket, `pickle→json`, Twilio verify soft, RLS policies; Phase 1: fail-closed secrets, `secrets` OTP, HMAC, BOLA guards, SSRF, CORS, HSTS/CSP, preview, OAuth, `realpath`, `DOMPurify`, Docker/git.
> **Also 2026-08-25:** (Complete elimination of Firestore/Google Cloud dependencies — removed `from google.cloud.firestore_v1 import Client`, `from firebase_admin import firestore`, `FieldFilter`, and all Google Cloud Firestore SDK imports across 88+ backend files; unified entire database access layer on native `SqlClient`, `DbClient`, and SQLAlchemy 2.0 ORM; added native `FieldFilter` and `Query` enums directly in `app/db`; all 137 unit tests passing)
> **Also 2026-08-25:** (Ollama Cloud / Local set as system default AI provider — added `DEFAULT_AI_PROVIDER=ollama` in `Settings` and configured `server/.env` with `OLLAMA_API_KEY`, `OLLAMA_URL=https://ollama.com/v1`, and `OLLAMA_MODEL=gpt-oss:120b-cloud`; updated `DEFAULT_PROVIDER` in `catalog.py` to use `settings.default_ai_provider`; updated `has_server_key` to check both `ollama_url` and `ollama_api_key`; added all server environment variables with clean organized documentation; 137 backend tests OK, frontend lint OK)
> **Also 2026-08-25:** (Ollama as top-priority voice provider — `resolve_voice_config` in `voice_fast.py` now tries Ollama first (`OLLAMA_URL` + `settings.ollama_model`) before groq/gpt-4o-mini, so Eve voice calls use the local Ollama model whenever `OLLAMA_URL` is configured; priority chain: Ollama → groq 8b instant → gpt-4o-mini (standard OpenAI only) → user resolved config; 137 backend tests OK)
> **Also 2026-08-25:** (Eve Memory page: fixed vertical scroll (`.eve-active-view-container` now has `overflow-y: auto` so non-chat tabs scroll within the fixed-height viewport); memories now display as a compact horizontal list instead of a multi-column card grid)
> **Also 2026-08-25:** (Mails connect screen one-page fit — refined geometry of `.mail-connect-hero-card` and `.mail-connect-features-grid` in `mails.css` with balanced padding, 48px icon badge, compact 10px feature cards, and streamlined action row so the full Connect Google Mail screen and buttons fit entirely within the viewport on a single page with zero scrolling; lint/build OK)
> **Also 2026-08-25:** (HTML live preview in Workspace IDE — `WorkspaceBrowser` accepts a new `htmlContent` prop; when set, renders via `srcdoc` in a sandboxed iframe instead of a URL, showing "HTML Preview" in a read-only address bar label; `WorkspaceEditor` gains a `onRunHtml` prop and renders a monochrome "Run" pill button in the breadcrumb bar whenever the active file is `.html`; `WorkspacePage` wires `handleRunHtml` + derives `activeHtmlContent` from the active tab so clicking Run opens the browser panel with the live rendered HTML — no server required; CSS: `breadcrumb-run-btn` + `workspace-browser-url-label` added to `workspace.css`; lint/build OK)
> **Also 2026-08-25:** (API-only model discovery — removed all static hardcoded fallback model arrays in `AI_PROVIDERS` across `catalog.py` and `discovery.py` (`models: [] # API-only — no static fallback`); removed restrictive OpenAI prefix filter so custom endpoints/proxies return all hosted models; tested and verified with 137 passing tests; lint/build OK)
> **Also 2026-08-25:** (Reusable ModelSelectorDropdown with API key filtering & search + Inline Plan Approval — added `ModelSelectorDropdown.jsx` and `model-selector-dropdown.css`; fetches real configured models from `/settings/ai-models` and strictly filters to providers with configured user/server keys; includes real-time search input inside the dropdown; adopted across Eve Chat, Studio Hero, and Studio Builder; added inline `studio-plan-inline-card` in `BuilderChat` providing 1-click Approve & Build / Request Changes buttons on plan messages; lint/build OK)
> **Also 2026-08-25:** (Workspace Eve Agent → browser panel connection — new `open_workspace_browser` Eve tool (`tools/files.py`) + handler (`handlers/workspace_files.py`) + registered in `dispatcher.py`; emits `{type: "open_browser_url", url}` action in the SSE done event; `useEveAgentChat.js` now accepts `onAction` callback and fires it for every action in the done payload; `WorkspaceEvePanel.jsx` threads `onAction` through; `WorkspacePage.jsx` adds `browserUrl` state + `handleEveAction` that calls `setBrowserUrl`/`setBrowserVisible(true)` on `open_browser_url` actions; `WorkspaceBrowser.jsx` accepts `initialUrl` prop so Eve can drive the address bar; lint/build/137 tests OK)
> **Also 2026-08-25:** (Studio interactive planning questions UI — added `QuestionCard.jsx` and `questionUtils.js`; when Eve asks questions during Plan Mode, an interactive questionnaire card renders automatically under the message with `✦ Recommended` option pills, alternative choices, and a "Type your own answer" custom input with direct one-click send/submit; lint/build OK)
> **Also 2026-08-25:** (Studio one-page layout — removed extra sections below the Studio prompt landing page; `StudioProjectsPage` and `StudioHero` now render cleanly as a single full-bleed, full-height creation view with AI badge, refined prompt card, multi-file attachments, and quick suggestion chips without any vertical page scrolling; lint/build OK)
> **Also 2026-08-25:** (Eve chat spacing fix — removed `min-height: 480px` from `.eve-chat-section` and `min-height: 320px`, `max-height: 600px`, `flex: 1 1 auto` from `.eve-messages-feed`; feed is now `flex: 0 0 auto` so the quick-prompt cards and the composer/input box sit immediately adjacent with no dead whitespace gap between them)
> **Also 2026-08-25:** (Workspace overview card spacing fix — `workspace.css` updated: `.ws-overview-grid` min card width raised from `240px` to `320px` and max container width raised to `1240px`, eliminating cramped 4-card rows; `.ws-card-open` right padding reduced from 72px to 20px so full width is available for the meta file count and date without truncation; `.ws-card-name` given isolated top-right action clearance; `.ws-card-flag` placed cleanly inside the card without hanging over the border)
> **Also 2026-08-25:** (Todo checkbox shape fix — `.todo-check` button in `todo.css` given explicit `min-width: 20px`, `min-height: 20px`, `max-width: 20px`, `max-height: 20px`, `aspect-ratio: 1 / 1`, `padding: 0`, `flex: 0 0 20px`, and `border-radius: 5px` to eliminate vertical elongation/pill-stretching and ensure a clean square rounded checkbox shape; `TodoPage.jsx` sets `type="button"` and `size={12}` on Check)
> **Also 2026-08-25:** (Talk-over edge cases: in-app barge-in - `useEveVoice.interruptEve` aborts stream+drains audio queue+cancels TTS, hold-to-talk press cuts Eve off, new CircleStop Interrupt button on CallScreen, newer speech supersedes in-flight turn via AbortController (no silent drop); server `CallRepository.update_status` terminal guard (`declined/ended/missed` final - fixes missed-vs-accept race), relay sends hardened vs mid-turn hangup; tests 131->137 OK)
> **Also 2026-08-25:** (Studio hero "+" → "Add files" — the advanced `CreateProjectModal` is removed entirely (file, `StudioProjectsPage` wiring, `DB_PREFERENCE_OPTIONS` constant); the prompt card's "+" is now an "Add files" pill button (`StudioHero.jsx`) opening a multi-file picker with removable attachment chips (Paperclip + name + size, monochrome `.studio-prompt-attachment-*` styles). Text-like files are read at attach time (truncated at 40k chars); on submit the prompt + attachments become a "brief" handed to the builder via new `studioBrief.js` (sessionStorage `starwaves.studio.brief.{projectId}`, consumed once) and `BuilderChat` pre-fills the composer draft with `composeBriefText` (prompt + `--- File: name ---` blocks; binaries noted as not included) so Eve actually receives the files when the user sends. `formatFileSize` deduped into `utils/fileSize.js` (Eve composer now imports it). Lint/build/test OK)
> **Also 2026-08-25:** (Studio builder fixed-viewport IDE — builder no longer scrolls as a page: `.content:has(.studio-builder)` joined the full-bleed rule in `layout-symmetry.css` (padding 0, overflow hidden, height 100%; ≤820px reverts to page scroll for the stacked layout), `.studio-builder` is now `height: 100%` instead of `calc(100vh - 64px)` + `min-height: 480px` which overflowed by topbar/padding; left rail gets `overflow-x: hidden` + `min-width: 0` and the git connect/commit rows `min-width: 0` so the 250px rail no longer shows a phantom horizontal scrollbar from grid-item min-content overflow. Panels scroll internally like the Workspace IDE)
> **Also 2026-08-25:** (Workspace Eve Agent — IDE "Eve Agent" panel wired to the real Eve chat API: new `pages/workspace/useEveAgentChat.js` hook (SSE `streamEveMessage` with live deltas, `Using tool:` chip, Stop button, one-shot REST fallback via `sendEveMessage`); `WorkspaceEvePanel.jsx` renders streaming/tool/error states and refreshes the file tree after file-mutating tools (`write_workspace_file`/`run_workspace_command` or `changed_resources: workspace-files`); per-turn workspace context (workspace_id + name + open file path) prefixed to the user turn; backend `eve/tools/files.py` — all 5 workspace file tools now require `workspace_id` (handlers already accepted it, previously stuck on "default"); tests 131 backend OK, lint/build/test OK)
> **Also 2026-08-25:** (Studio hero phantom-scroll fix — hero no longer sizes itself `calc(100dvh - 68px)` on top of uncancelled `.content` (32/36px) + `.studio-page` (24px) padding which made the page ~92px taller than the viewport with nothing to scroll; hero is now `flex: 1` inside a flex-filled `.content:has(.studio-hero)`/`.studio-page` (top/bottom padding zeroed in `layout-symmetry.css`) so it exactly fills the visible area, still full-bleed via negative side margins, and scrolls naturally only when real content (e.g. error banner) appears below)
> **Also 2026-08-25:** (Twilio ConversationRelay - `POST /calls/twilio` + `/trigger-eve-twilio` + Eve tools now dial `relay-twiml/{id}` -> `<Connect><ConversationRelay>`; new `/ws/twilio-relay` WebSocket (setup/prompt/interrupt/dtmf) streams fast-model text tokens verbatim (groq 8b-instant, thread->asyncio queue bridge, barge-in cancels in-flight turn, auto `ringing->active` + WS call_updated on setup); PSTN turns drop to ~0.7-1.2s with caller interruption; tests 122->131 OK)
> **Also 2026-08-25:** (Flat text inputs — removed the 3D emboss `--shadow-inset` from ALL text inputs/selects/textareas: dropped `input:not(checkbox|radio), select, textarea` from the `base.css` inset-shadow rule (buttons/cards keep it) + removed explicit inset on `.mail-page-indicator`; fixed browser URL input placeholder/text size — `.workspace-browser-url` → `input.workspace-browser-url` so the intended 12px font + compact padding win the cascade over the global `input[type="text"]` `font: inherit`/`padding: 10px 12px` rule that was previously overriding them)
> **Previously (same day):** Studio page Lovable-style rebuild — `StudioProjectsPage` is now a full-bleed hero prompt only: aurora-free monochrome `--bg-primary`→`--bg-secondary` fade, centered "Build something with Eve" title, rounded prompt card (`StudioHero.jsx`: autogrow textarea, "+" attach button (now the "Add files" picker — the advanced `CreateProjectModal` was later removed), `CustomDropdown` template picker defaulting to "Build", circular send button) that creates a project via `createStudioProject` (name derived from prompt via `deriveProjectName` in `studioConstants.js`) and jumps into the builder. Projects grid + delete flow moved to `StudioAppsPage` as an "In progress" `SectionHeading` section above finished apps. Previous: Deepgram STT option — `DEEPGRAM_API_KEY`/`DEEPGRAM_STT_URL`/`DEEPGRAM_STT_MODEL` (`nova-3` default) third server STT provider in `services/speech/_shared` catalog alongside browser/groq; `services/speech/deepgram.py` REST transcriber (`/v1/listen`, Token auth, smart_format); `/eve/transcribe` dispatches via `_STT_TRANSCRIBERS` map (no more groq-only 422); Settings EveVoice model picker generalized to any provider with models + `DEEPGRAM_API_KEY` hint; tests 113->122 OK)
> **Previously (same day):** Workspace browser — embedded side panel in the Workspace IDE (`WorkspaceBrowser.jsx`, Globe toolbar toggle, address bar + reload + open-in-new-tab, sandboxed iframe, per-workspace URL in localStorage). Previous: Studio Apps page — new `studio-apps` route + sidebar item under the Studio group listing finished apps (`build_status: ready`) with Open Builder + Run App; Eve `WORKSPACE_PAGES` + search palette entry. Earlier: <1s Eve voice: `POST /eve/voice/stream` fast path — groq `llama-3.1-8b-instant` (`GROQ_VOICE_MODEL`) streaming, sentence-chunked TTS frames, no RAG/tools; Twilio `/gather-fast`; frontend `streamEveVoice` sequential chunk playback with blocking fallback; measured 462ms first audio mock)

---

## 1. Project overview

StarWaves is a personal productivity workspace that brings projects, job
applications, tasks, documents, code workspace, calendars, email, WhatsApp, hackathons, competitive
programming, and an AI assistant into one dashboard.

- **Frontend** (`/website`): React 19 + Vite + Vanilla CSS (monochrome design system) + Monaco Editor. Containerized with Docker multi-stage build & Nginx.
- **Desktop Shell** (`/website/src-tauri`): Tauri v2 scaffold with native FS, dialog, shell, and file watching plugins.
- **Backend** (`/server`): FastAPI (Python) + Supabase (PostgreSQL) / Async SQLAlchemy 2.0. Containerized with Docker & Nginx.
- **WhatsApp Worker** (`/services/whatsapp-worker`): Go (WhatsMeow) bridge containerized for multi-device WhatsApp pairing, chat/message synchronization, reaction handling, and real-time webhook dispatching.
- **Auth**: Bearer token authentication & Google OAuth; serverless deployment targets Vercel, dockerized server for standalone VM/cloud deployment.

## 2. Repository structure

```text
Starwaves/
├── website/                 React frontend
│   ├── src/components/      Shared UI components (+ ui/ primitives, whatsapp/ components + whatsapp/conversation/ subcomponents)
│   ├── src/hooks/           Auth, routing, theme, workspace data hooks + call/ subhooks (callConstants, callHelpers, useWebRTC, useEveVoice)
│   ├── src/lib/             Frontend API clients (whatsappApi, whatsappSocket, workspaceFilesApi, workspaceApi/ split by feature)
│   ├── src/config/          Search index split into search/ (categories, pages, evePages, settingsSections, actions, staticItems, buildSearchIndex, filterSearchItems)
│   ├── src/pages/           Workspace pages (+ settings/ feature sections, workspace/ components + projects/ + contacts/ + landing/ Framer Motion cinema)
│   ├── src/styles/          Tokens, components, and page styles (pages/landing.css deprecated stub + landing-auth.css; landing cinema.css lives in pages/landing/)
│   ├── src/themes/          Theme presets (22: 10 mono + 12 Two-Color duotone) + customizer options/engine
│   ├── src/utils/           Pure parsers/transformers
│   ├── src-tauri/           Tauri v2 desktop shell scaffold
│   ├── Dockerfile           Multi-stage Node.js build + Nginx runtime
│   ├── nginx.conf           SPA routing & caching Nginx config
│   └── .dockerignore        Container build exclusions
├── server/                  FastAPI backend
│   ├── app/
│   │   ├── api/routes/      HTTP endpoints, WebSockets, and OAuth callbacks (whatsapp/ package `status|chats|messages|settings|webhook` + `_shared`, whatsapp_ws.py, workspace_files.py)
│   │   ├── core/            Configuration, authentication, and reusable systems (`errors.py`, `http.py`, `pagination.py`, `dependencies.py`, `ws/base.py` + facades `ws_manager.py`/`whatsapp_ws_manager.py`)
│   │   ├── db/              SQLAlchemy async engine, session factory, models, and compat adapter
│   │   │   └── sql/         Modular entity handlers + reusable `registry.py` (dict-driven dispatch) + `base.py` (generic CRUD) + `_shared._TIMESTAMP_KEYS`
│   │   ├── models/          SQLAlchemy declarative models for PostgreSQL + reusable `mixins.py` (TimestampMixin/SoftDeleteMixin/UserOwnedMixin)
│   │   ├── repositories/    Data access & file storage (`helpers.py` soft-delete/snapshot helpers, `pagination.py` facade over `core/pagination`, whatsapp.py, workspace_files.py)
│   │   ├── schemas/         API request and response models (whatsapp.py, workspace_files.py)
│   │   └── services/        External integration services (`helpers.py` pagination fetcher, whatsapp.py, eve/ package with handlers/tools, web_browsing, speech)
│   ├── tests/               # Backend pytest suite (unit/api/services/e2e + support scaffolding)
│   ├── templates/email/     Email HTML templates
│   ├── Dockerfile           Python 3.12-slim container build
│   └── .dockerignore        Container build exclusions
├── services/                Microservices and background workers
│   └── whatsapp-worker/     Go WhatsMeow WhatsApp bridge service
│       ├── internal/        Internal modular packages (models, parser, contacts, webhook, events, session, api)
│       ├── Dockerfile       Alpine multi-stage Go build
│       └── main.go          Service entry point & router initialization
├── nginx/                     Nginx reverse proxy (e2-micro: 5r/s limit_req on /api/ & /ws/, 20M cap, Gzip)
│   ├── nginx.conf           Global config with limit_req_zone api 5r/s
│   └── conf.d/default.conf  VM api domain (api.starwaves.susindran.in) — /health, /ws/ 3600s, /api/ 60s, optional SPA
├── sql/                       Canonical database SQL (PostgreSQL 16, idempotent, run in listed order)
│   ├── extensions.sql         pgvector extension (CREATE EXTENSION vector)
│   ├── schema.sql             16 CREATE TABLE statements mirroring server/app/models/__init__.py
│   ├── migrations.sql         Idempotent init_db backfill ALTERs (calls.messages, WhatsApp columns, eve_memories.embedding)
│   └── indexes.sql            Model indexes + performance composites + partial ringing index + pgvector HNSW
├── docker-compose.yml       Lean e2-micro compose: pgvector/pgvector 0.8.0-pg16 (128M/50 conns) + redis 96M + server 512M/0.8cpu + workspace-data + redis-data + whatsapp-data
├── .env.docker.example      Docker env template + REDIS_URL + WORKSPACE_STORAGE_PATH + CRON_SECRET + Vercel split + swap warning
├── DOCKER.md                Lean e2-micro + Vercel split + swap 1G + down -v warning
├── SPEECH_PROVIDERS.md      TTS/STT provider comparison for Eve voice
└── vercel.json              Vercel SPA rewrites (frontend only; VM handles /api via api.* domain)
```

## 3. Backend (FastAPI)

- **App factory**: `server/app/main.py` → `create_app()` with `@asynccontextmanager` `lifespan` manager (CORS + `/api/v1` router + `/ws/calls` and `/ws/whatsapp` WebSocket endpoints + `ServerBackgroundWorker` daemon thread); startup logs include active OpenAI model + base URL.
  - **Background Worker Daemon**: `server/app/core/worker.py` -> `ServerBackgroundWorker` runs in long-running server environments (Docker / Uvicorn daemons / systemd) to auto-execute due Eve schedules, trigger voice calls, and expire stale calls every 30s (stale-call expiry no longer runs per-request on `GET /calls/incoming|recent` for latency).
  - **Dual Call Option (2026-08-25):** `in_app` (WebRTC P2P, existing `calls`/`calls_ws` + `useCallCenter`/`useWebRTC`) vs `twilio` (PSTN). Backend: `app/core/config` adds `TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER/CALLBACK_BASE_URL/enabled`, `app/models.Call` adds `provider/external_sid/phone_number` + `db/session._ensure_call_provider_columns`, `app/services/twilio` (`client.py` `is_twilio_configured`/`initiate_twilio_call`/`map_twilio_status` + `twiml.py` `build_eve_twiml/build_human_twiml`) via `httpx` BasicAuth to `api.twilio.com/Calls.json`, `app/repositories/calls` adds `provider` param + `set_external_sid`, `app/api/routes/calls_twilio.py` (`/twilio/config` auth, `/twilio` human PSTN, `/trigger-eve-twilio` Eve PSTN, `/twilio/twiml/{id}` public TwiML, `/twilio/gather` speech→`chat_with_eve`→Eve reply, `/twilio/status` `CallStatus→internal` + WS `call_updated`). Eve tools: `trigger_eve_call` now `provider`/`phone_number` + new `make_twilio_call` tool; `app/services/eve/handlers/call.py` branches `in_app` vs `twilio` (uses `initiate_twilio_call` + `StatusCallback`/`Gather`). Frontend: `lib/callsApi` adds `triggerEveTwilioCall/createTwilioCall/getTwilioConfig`, `hooks/call/useCallCenter` adds `callProvider` state + `dial(phone,mode,provider,phoneNumber)` → `createTwilioCall` path and `requestEveCall(mode,provider,phone)` → `triggerEveTwilioCall`, `pages/CallsPage.jsx` provider toggle + phone E.164 inputs + `Eve Call My Phone` button, gated by `twilioEnabled` fetched at mount. Latency: warm `trigger-eve` 14ms in_app, Twilio `initiated` 80-150ms (Twilio API hop) + PSTN ring `3-6s` before `answered→active`; TwiML `Gather`→Eve LLM 1.5-3s. Fails `503` when not configured, public TwiML needs `TWILIO_CALLBACK_BASE_URL` reachable from Twilio cloud.
  - **<1s Eve Voice Fast Path (2026-08-25):** `app/services/eve/voice_fast.py` — bypasses RAG/tool loop; `resolve_voice_config` prefers groq `GROQ_VOICE_MODEL` (default `llama-3.1-8b-instant`, ~250-350ms TTFT) → `gpt-4o-mini` → user's resolved config; `stream_voice_reply` streams deltas and synthesizes TTS **per sentence** (`_SENTENCE_RE` + 80-char force split) yielding `delta`/`audio{sentence,audio_base64,mime,provider}`/`done` events (provider `browser` = client-side SpeechSynthesis); `voice_reply_blocking` one-shot variant for TwiML. Route `POST /eve/voice/stream` (`eve_stream.py`) resolves speech prefs via `to_thread`. Twilio: `build_eve_twiml` Gather now posts to new `/calls/twilio/gather-fast` (fast model, no tools, `<Say>` + chained Gather). Frontend `lib/eveApi.streamEveVoice` + `useEveVoice.sendVoiceToEve` — plays base64 audio chunks sequentially (Blob URL queue) or speaks browser chunks per sentence, transcript resets per turn, falls back to blocking `/eve/chat` when stream fails. Groq catalog adds `llama-3.1-8b-instant` + `whisper-large-v3-turbo`; `GROQ_STT_MODEL` default now turbo; `ai_models.get_provider_client(config)` factory matches `chat_context` pattern. Verified mock pipeline (300ms TTFT + 100ms TTS): **first audio 462ms**, full stream 604ms; 113 backend tests OK, lint/build/test OK.
  - **Reusable Core Systems** (2026-08-25): `core/errors.py` (`not_found`/`bad_request`/etc.), `core/http.py` (`create_async_client`/`create_sync_client` with shared limits + User-Agent), `core/pagination.py` (`resolve_limit`/`encode_cursor`/`decode_cursor`/`PageResponse` canonical; `repositories/pagination.py` is facade), `core/dependencies.py` (`CurrentUser`/`CurrentUserId`/`DbClient` Annotated aliases), `core/ws/base.py` (`BaseWSManager` policy single|multi) with `ws_manager.py` (single, CallWSManager) and `whatsapp_ws_manager.py` (multi) as facades; `core/auth.py` DRY via `_validate_token_payload` + `create_serializer` + `try_get_user_from_token` (used by `auth/_shared.get_current_user_optional`).
  - **Route registry**: `server/app/api/router.py` includes all top-level routers.
  - **Prefix**: `/api/v1` (see `server/app/core/config.py`).
  - **Auth**: Bearer `itsdangerous` tokens via `server/app/core/auth.py`.
  - **Performance Layer (2026-08-21, rev e2-micro 1-10 users)**: Hot reads non-blocking (`async def` + `to_thread`), pagination `WHERE deleted=false` + keyset `(created_at,id)` tie-breaker + `limit+1`, `todos/docs/contacts` now paginated (`cursor&limit` 50, legacy list capped 100) with composite indexes (`ix_*_user_deleted_created`, `ix_calls_status_updated`, `ix_whatsapp_*`, etc. via `_ensure_performance_indexes` + `to_thread` in `init_db`). Pools tuned for 1GB: `pool 5/5 recycle 300 timeout 30` (was 10/20). Worker scans bounded: stale calls `limit 200`, maintenance `limit 500` + Redis `SETNX` locks (VM redis). `POST /workspace-files/sync` capped `50 files/10MB` + `Semaphore(5)`. `GET /calls/incoming|recent` now `async+to_thread`. CORS exception handlers validate origin via `_is_allowed_origin` (regex + allowlist). Unified `is_serverless` (VERCEL/Lambda/IS_SERVERLESS). Redis abstraction `app/core/cache.py` (Redis SETEX else LRU 1000 local, 96M allkeys-lru on VM). Workspace local disk via `workspace-data` volume + `WORKSPACE_STORAGE_PATH`/`REDIS_URL`. Frontend `vite` split `manualChunks(vendor|firebase|monaco|grid)` + lazy (`Calendar/Eve/Workspace/WhatsApp/Calls/Chats/Mails/CompetitiveCoding`), `request.js` dedup+30s cache+429 retry, Nginx `limit_req 5r/s`. Postgres lean: `128M shared, 512M effective_cache, 8M work, 64M maint, 50 max_conn, log_min 1000`.

### Route groups

| Group           | Router module                                                                            | Notes                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Auth            | `app/api/routes/auth/`                                                                 | `oauth`, `credentials`, `password`, `account`, `combine`                                             |
| Workspace Data  | `app/api/routes/workspace/`                                                            | `jobs`, `hackathons`, `projects`, `notifications`, `contests`, `calendar`                          |
| Workspace Files | `app/api/routes/workspace_files.py`                                                    | `/workspace-files/workspaces` (list/create/rename/delete), `/tree`, `/{path}`, `/sync` (scoped by `workspace_id`) |
| WhatsApp        | `app/api/routes/whatsapp/` + `whatsapp_ws.py`                                          | `whatsapp/` package split 535L → `status` (`/status`/`/pair`/`/confirm-pairing`/`/disconnect`), `chats` (`/chats`/messages/summaries/draft), `messages` (`/send`/react/star/delete), `settings`, `webhook` (6 handlers) + `_shared` (mention/name); original file preserved as package `__init__` facade |
| Integrations    | `google_calendar`, `google_contacts`, `google_drive`, `gmail`, `github`, `google_chat` | OAuth callbacks under`/integrations/*/callback`                                                              |
| Features        | `documents`, `todos`, `contacts`, `profiles`, `notifications`, `email`, `eve`, `eve_stream`, `calls` + `calls_twilio` | EVE = AI assistant (`eve` non-streaming + `eve_stream` SSE `POST /eve/chat/stream`);`calls` = WebRTC `in_app` + `calls_twilio` = PSTN `provider=twilio` (`POST /calls/twilio`, `POST /calls/trigger-eve-twilio`, `GET/POST /calls/twilio/twiml|gather|status`); `contacts` = Address book  |
| Coding          | `coding_stats`, `competitive_coding_profile`                                         | Contests + profile stats                                                                                       |
| Settings        | `ai_models`, `eve_speech`                                                            | `/settings/ai-models` AI provider/model + `/settings/eve-speech` STT/TTS provider/voice preference for EVE |
| Misc            | `health`                                                                               | `/api/v1/health`                                                                                             |

### Repositories (`server/app/repositories/`)

`password`, `users`, `account_combine`, `account_deletion`, `jobs`, `projects`,
`notifications`, `pagination` (facade over `core/pagination`), `helpers` (`soft_delete_payload`/`restore_payload`/`dict_to_snapshot`), `documents`, `contacts`, `profiles`, `todos` (uses helpers), `eve`,
`eve_sessions`, `calls`, `workspace_files`, `whatsapp`.

### Services (`server/app/services/`)

`helpers` (`fetch_paginated` reusable pagination loop), `embeddings` (OpenAI `text-embedding-3-small` 1536-dim, `generate_embedding` with ollama skip + truncate 8000, availability via `is_embedding_available`), `coding_stats`, `contests`, `email`, `eve/` package (single-responsibility split: `constants.py`, `instructions.py`, `tools/` per-domain catalog `workspace|navigation|search|memory|schedule|files|whatsapp|web|studio`, `chat_context.py` (shared per-turn resolver: RAG instructions + resolved AI config + provider client), `workspace_records.py`, `workspace_insights.py`, `memories.py` (RAG: `build_memory_instructions(query)` pgvector top-5 else 40 recent, 60s cache), `dispatcher.py` (`dispatch_tool` routing via `handlers/` `memory|schedule|call|workspace_files|whatsapp|web|navigation|workspace|studio`, `chat.py` (blocking orchestrator: last user message → RAG query, `run_tool_loop` 6 rounds) + `chat_stream.py` (SSE orchestrator) + `__init__.py` facade; includes coding agent tools `read_workspace_file`, `write_workspace_file`, `list_workspace_files`, `search_workspace_files`, `run_workspace_command`, web browsing tools `browse_web`, `search_web`, `fetch_web_page`, and WhatsApp tools `list_whatsapp_chats`, `read_whatsapp_messages`, `send_whatsapp_message`, `summarize_whatsapp_chat`), `web_browsing` (open web search via DuckDuckGo HTML/API/Lite, web page text/markdown extraction, and unified browser), `whatsapp` (session pairing, message dispatch, Eve AI hooks), `github`, `google_calendar`, `google_contacts`,
`hackathon_sources`, `notifications`, plus `oauth/` package (`_shared.py`,
`google.py`, `github.py`) that centralizes provider-agnostic OAuth helpers
(`format_oauth_error`, state-serializer factory, `integration_account_id`,
`integration_accounts_reference`, `oauth_callback_html`) and provider flows
(authorize URL builders, token encryption/exchange/refresh, profile fetch),
and the `ai_models/` package — multi-provider tool-calling engine for EVE
split into single-responsibility modules (`contracts.py` shared types +
`ProviderClient` adapter interface, `catalog.py` static provider/model
catalog + `validate_preference`, `config.py` credential/config resolution +
per-user TTL cache, `discovery.py` live `/v1/models` listing with shared
HTTP helper + `provider_catalog`, `loop.py` blocking + streaming tool loops
sharing `_run_tool_call`; per-provider adapters `openai.py` Responses API,
`anthropic.py` Messages API, `gemini.py`, `openai_compat.py` for
OpenRouter/Ollama/OpenCode; `_shared.py` kept as a backward-compat facade;
`resolve_ai_config` reads the per-user preference with server-default
fallback via `has_server_key`/`effective_api_key`), plus the `speech/` package
(`_shared.py`, `groq.py`, `google_tts.py`) that provides server-side STT/TTS
for EVE voice calls: a provider catalog (browser + Groq Whisper for STT,
browser + Google Cloud TTS for TTS) with `available` flags driven by
server-side API keys, per-user preference persisted at
`users/{uid}/settings/eve-speech` with browser fallback
(`resolve_stt_engine`/`resolve_tts_engine`), `transcribe_audio` (Groq
OpenAI-compatible endpoint) and `synthesize_speech` (Google Cloud
Text-to-Speech REST, MP3).

### Config (`server/app/core/config.py`)

Environment-driven `Settings` dataclass: Firebase Admin creds, GitHub/Google
OAuth secrets, Gmail/Drive/Chat callbacks, AI provider keys for EVE
(`OPENAI_API_KEY`/`OPENAI_URL`/`OPENAI_MODEL`,
`ANTHROPIC_API_KEY`/`ANTHROPIC_URL`/`ANTHROPIC_MODEL`,
`GEMINI_API_KEY`/`GEMINI_URL`/`GEMINI_MODEL`), EVE speech keys
(`GROQ_API_KEY`/`GROQ_URL`/`GROQ_STT_MODEL`,
`GOOGLE_CLOUD_TTS_API_KEY`/`GOOGLE_CLOUD_TTS_URL`/`GOOGLE_CLOUD_TTS_VOICE`,
`OPENROUTER_API_KEY`/`OPENROUTER_TTS_MODEL`/`OPENROUTER_TTS_VOICE`/`OPENROUTER_TTS_URL`),
Twilio PSTN (`TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_PHONE_NUMBER`/`TWILIO_CALLBACK_BASE_URL`, `twilio_enabled` bool),
unified `is_serverless` (VERCEL|Lambda|IS_SERVERLESS), `workspace_storage_path`, `redis_url` (VM 96M),
SMTP, Firestore database id, CORS origins. Loads `.env.prod` before `.env`.

## 4. Frontend (React)

- **Entry**: `website/src/main.jsx` → `App.jsx` (routing + workspace state).
- **Layout**: `website/src/layouts/AppLayout.jsx` (Header, Sidebar, network status).
- **UI primitives**: `website/src/components/ui/` (`Avatar`, `Badge`, `Modal`,
  `MailModal`, `ModalHeader`, `ModalActions`, `ConfirmDialog`, `FormField`,
  `PageHeader`, `EmptyState`, `CustomDropdown`, `CalendarPicker`, `Markdown`,
  `TabNav`, `SectionHeading`, `SettingsCard`, `MetricCard`, `MetricGrid`, `SearchBar`,
  `Pagination`, `FilterBar`, `Alert`, `FilterPills`, `LoadingState`)
  re-exported via `index.js`. Dialogs across pages use the shared `Modal` /
  `MailModal` primitives (Portal-based, Escape + backdrop dismissal, focus
  management, `data-modal-initial-focus` support); destructive confirmations
  reuse `ConfirmDialog`. Filter, search, metric grids, loading indicators, and alerts across pages use the
  standardized `SearchBar`, `CustomDropdown`, `FilterBar`, `Pagination`, `FilterPills`, `MetricGrid`, `LoadingState`, and `Alert` primitives.
- **Hooks** (`src/hooks/`): `useAuth`, `useRouter`,
  `useThemeCustomizer`, `useWorkspaceData`, `useCallCenter` (facade → `call/` package: `callConstants`, `callHelpers`, `useWebRTC`, `useEveVoice`, `useCallCenter` orchestrator), plus
  `usePersistentState`, `useLocalNotifications`, `useDialogAccessibility`,
  `useSpeechVoices`.
- **API clients** (`src/lib/`): one per backend feature (`todosApi`,
  `workspaceApi/` (package split by feature: jobs, projects, hackathons,
  notifications, contests, calendar, email), `workspaceFilesApi`, `whatsappApi`, `whatsappSocket`, `gmailApi`, `googleCalendar`,
  `googleContacts`, `googleDriveApi`, `eveApi`, `eveSchedulesApi`, `emailApi`, `githubApi`,
  `googleChatApi`, `codingStatsApi`, `competitiveCodingProfileApi`,
  `documentsApi`, `contactsApi`, `callsApi`, `callsSocket`, `aiModelsApi`, `eveSpeechApi`), plus shared `request.js`
  (`API_URL` + `apiRequest` with dedup Map + 30s GET cache (100 bound) + 429/502 retry + `clearRequestCache`), `firebase.js`, `authApi.js`,
  `index.js`.
- **Themes** (`src/themes/`): `presets.js` holds `THEME_PRESETS` (22 presets — 10 mono + 12 fresh Two-Color duotone, parsed from
  CSS files in `src/styles/themes/`), option metadata (`PALETTE_GROUPS`,
  `FONT_OPTIONS`, `RADIUS_OPTIONS`, `DENSITY_OPTIONS`, `ELEVATION_OPTIONS`,
  `MOTION_OPTIONS`, `COLOR_VARIABLE_GROUPS`), and the DOM engine
  (`applyThemeVariables` / `resetThemeVariables`); `index.js` re-exports them
  plus `useThemeCustomizer`.
- **Utils** (`src/utils/`): `browserNotifications`, `calendarEvents`,
  `calendarReminders`, `icsParser`, `popupOAuth`, `projectLifecycle`,
  `callWebRTC`, `callDisplay`, `speech`.
- **Pages** (`src/pages/`): Dashboard, Projects (facade → `projects/` package: `constants`, `useProjectFilters`, `ProjectMetrics`, `ProjectGridCard`, `ProjectListCard`, `ProjectFormModal`), ProjectDetail, Jobs,
  Hackathons, HackathonDetail, Todo, Documents, DocumentOpener, Workspace, Mails,
  WhatsApp, Calendar, Chats, Calls, Contacts (facade → `contacts/` package: `constants`, `useContacts`, `useContactForm`, `useContactImport`, `ContactCard`, `ContactGrid`, `ContactFormModal`, `ContactImportModal`), CompetitiveCoding, Stats, Eve, Settings, Themes,
  Profile, Onboarding, Auth, ForgotPassword, Landing (facade `LandingPage.jsx` → `landing/` package: `data.js`, `cinema.css` scoped 373 lines, `sections/` `Nav`, `Hero` with parallax centerpiece, `Manifesto`, `Showcase` pinned reel, `Eve`, `Features`, `Workflow` pinned timeline, `FAQ`, `Finale`+`Footer` + `LandingPage.jsx` composer; sharp monochrome Linear, Framer Motion choreographed load + scroll-linked pinning/parallax/stagger), TermsOfService, PrivacyPolicy.
- **Studio pages** (`src/pages/studio/`): `StudioProjectsPage` (Lovable-style full-bleed hero prompt — `StudioHero.jsx` with "Add files" attachment picker, template dropdown, brief handoff via `studioBrief.js`; creates projects and navigates to the builder), `StudioAppsPage` (in-progress drafts via `ProjectCard` + delete flow, plus finished apps gallery `build_status: ready` with Open Builder + Run App), `StudioTemplatesPage` (curated + published templates, remix), `StudioBuilderPage` (Eve builder: file tree, Monaco, preview, console, git, plan chat) + shared `useStudioProjects`/`useStudioFiles` hooks and feature components.
- **Config** (`src/config/`): `searchIndex` (facade → `search/` package: `categories`, `pages`, `evePages`, `settingsSections`, `actions`, `staticItems`, `buildSearchIndex`, `filterSearchItems`).
- **Call components** (`src/components/calls/`): `CallScreen`,
  `IncomingCallOverlay`.
- **WhatsApp components** (`src/components/whatsapp/`): `WhatsAppChatList`, `WhatsAppConversation` (facade → `conversation/` package: `utils`, `useParticipantInfo`, `useConversationScroll`, `WhatsAppConversationHeader`, `WhatsAppMessagesFeed`, `WhatsAppMessageBubble`, `WhatsAppComposer`, `WhatsAppModals`), `WhatsAppQrModal`, `WhatsAppInfoDrawer`.
- **Settings sections** (`src/pages/settings/`): Profile, Account, Apps,
  WhatsAppSection, WorkspaceApps, Theme, Calendar, IcsCalendar, Gmail, Github, GoogleChat,
  Coding, HackathonSources, DataSources, PushNotifications, EveVoice,
  AiModels.
- **Dashboard config**: `src/dashboard/dashboardConfig.js` (React Grid Layout).
- **Navigation config**: `src/config/navigation.js`.

## 5. Design system

- Strict Monochrome only (black/white/gray: #000/#0A0A0A/#111/#1F1F23/#71717A/#A1A1AA/#E4E4E7/#fff; landing cinema is sharp Linear monochrome #000/#FFFFFF on #000). Tokens in `src/styles/tokens.css`, per-theme CSS overrides in
  `src/styles/themes/` (light `index.css` + dark `dark.css` + preset files),
  import order via `src/App.css` (tokens → base → utilities → responsive →
  components → pages including `pages/landing.css` deprecated stub after `landing-auth.css`; cinematic landing ships its own scoped `pages/landing/cinema.css` imported only by `LandingPage.jsx` so color/glow rules never leak).
- Light theme default, `html.dark-theme` for dark mode; landing cinema is fixed dark (#000) regardless of app theme — sharp, Linear-inspired, white-on-black with 8px radii, grid overlay and monochrome glows.
- Icons: `lucide-react` only.

## 6. Current implementation state

- **Workspace IDE Redesign (2026-08-21)**: Folder-first code workspace — each StarWaves workspace is an isolated folder (disk/cloud). Toolbar v2 with avatar + meta (Folder · N files), quick New File/New Folder actions, improved dropdown with file-count + id; Explorer with per-extension icons (FileCode/FileJson/FileText), New File/New Folder header + empty state (FolderOpen illustration + New File/New Folder CTA + src/app.js hint); Monaco editor with tabs (dirty dot), breadcrumb (FolderOpen + path segments), line/col tracking, footer (language, UTF-8, lines, saved/unsaved); center card (g-card + order + shadow-sm + adius 12); creation via placeholder .keep filtered from tree. Verified 
npm run lint/build.

- **Workspace Eve Agent (2026-08-25)**: The IDE's right-side Eve Agent panel
  (`WorkspaceEvePanel.jsx` + `useEveAgentChat.js`) is wired to the live Eve
  chat API - SSE streaming with tool-activity chips, Stop button, and REST
  fallback. Each turn injects the active workspace id/name and open file path
  as context, and the backend `read/write/list/search/run` workspace file
  tools now take a required `workspace_id` so Eve edits the workspace open in
  the IDE (the file tree auto-refreshes after file-mutating tool calls).
- Full persistent CRUD: Projects, Jobs, Hackathons, Documents, Todos.
- Jobs timeline: the `Jobs` page renders an "Application frequency" bar chart
  built from stored `appliedDate` values across the trailing 12 months
  (pure util `src/utils/jobTimeline.js` + `src/utils/__tests__/jobTimeline.test.js`).
- Gmail inbox tabs: when viewing the Inbox, the Mails page shows
  Primary/Promotions/Updates/Forums category tabs (persisted via
  `starwaves.mail.inbox-tab`). `loadGoogleMail` appends `category:<tab>` to the
  Gmail `q` parameter; tabs are only applied to the Inbox folder.
- Project lifecycle phases: `idea → design → build → test → ship → maintain`
  pipeline stored as `lifecycle_phase` on each project. Phase stepper +
  phase dots on the Project Detail page (`ProjectLifecycleCard.jsx`), phase
  select in add/edit forms, and advancing a phase auto-syncs `status`
  (build/test → "Active", ship/maintain → "Completed").
- Integrations: GitHub, Google Calendar, Google Drive, Gmail, Google Chat.
- Competitive programming: contests + profile stats.
- Hackathon discovery with configurable sources + manual entry.
- EVE AI assistant (multi-provider: OpenAI / Anthropic / Google Gemini) with navigation integrated directly in the main sidebar under an "EVE AI" group (`Chat & Assistant`, `Chat Sessions`, `Eve Memory`, `Voice & AI Call`, `Schedules & Reminders`), featuring persistent sessions, long-term memory, bidirectional voice calls, automated background cron/one-time schedules, code workspace tools, and open web browsing/search (`@web`, `browse_web`, `search_web`, `fetch_web_page`).
- Eve chat SSE streaming (2026-08-21): `POST /eve/chat/stream` (`app/api/routes/eve_stream.py`, registered in router) wraps `stream_chat_with_eve` (`app/services/eve/chat_stream.py`) as a sync-generator `StreamingResponse` (`text/event-stream`, `X-Accel-Buffering: no`), emitting frames `delta` / `tool_start` / `tool_end` / `done{message,changed_resources,actions,session_id}` / `error` terminated by `[DONE]`. Providers implement `call_stream()` returning `StreamChunk(text_delta|final)` — OpenAI Responses API (`responses.create(stream=True)`, final from `response.completed`), Anthropic (`messages.stream` + `get_final_message`), Gemini (`generate_content_stream` with synthesized raw for continuation), and OpenRouter/Ollama/OpenCode via OpenAI-compatible chat stream (tool-call argument fragments accumulated by index, synthetic raw for `continuation`). Shared streamed tool loop `run_tool_loop_stream` (`ai_models/loop.py`) mirrors `run_tool_loop` (same `MAX_TOOL_ROUNDS=6`, error handling) while yielding deltas/tool events. Session persisted only after success; auto-created when `session_id=null` with id returned in `done`. Non-streaming `/eve/chat` unchanged (voice calls, schedules executor, cron). Frontend: `streamEveMessage` (`lib/eveApi.js`, fetch + `getReader()` SSE parser, AbortController, 120s timeout); `EvePage.jsx` streams into a live bubble (typing dots → blinking caret → "Using tool: X…" chip → Stop button aborting via signal; partial text kept on mid-stream failure; auto-fallback to `/eve/chat` once when zero tokens received). Nginx dedicated `location /api/v1/eve/chat/stream` with `proxy_buffering off` + `proxy_read_timeout 300s`. Tests: `tests/test_eve_stream.py` (loop contract + endpoint SSE frames/error frame).
- Eve memory semantic recall via pgvector (2026-08-21): Postgres image is `pgvector/pgvector:0.8.0-pg16`; `_ensure_eve_memory_embedding` (`app/db/session.py`) runs in `init_db` → `CREATE EXTENSION IF NOT EXISTS vector` + `ALTER TABLE eve_memories ADD COLUMN IF NOT EXISTS embedding vector(1536)` + HNSW index `ix_eve_memories_embedding USING hnsw (embedding vector_cosine_ops)` (ivfflat fallback). `EveMemory.embedding = Vector(1536)` (`app/models/__init__.py`, JSON fallback when pgvector lib missing e.g. SQLite tests). Embeddings service `app/services/embeddings.py`: OpenAI `text-embedding-3-small` (1536 dims), skips ollama base URLs, truncates to 8000 chars, no-op returns None without `OPENAI_API_KEY`. `add_memory` best-effort attaches embedding on write; `search_eve_memories` (`app/db/sql/eve.py`) queries `ORDER BY embedding <=> CAST(:vec AS vector)` with python cosine fallback for SQLite; `search_memories` repo + `GET /eve/memories/search?q&limit` route. RAG wiring: `chat_with_eve` passes last user message to `build_memory_instructions(query=...)` → top-5 semantically relevant memories injected into prompt; without query or embeddings it falls back to recent-40 chronological.
- Eve Auto-Remember (2026-08-21): after every successful AI reply Eve extracts 0–3 durable facts and saves them as memories — covers all surfaces funneling through the chat orchestrators (REST `/eve/chat`, SSE `/eve/chat/stream`, WhatsApp auto-replies/Eve drafts, scheduled prompts in worker, voice-call transcripts). `app/services/eve/auto_memory.py` (`extract_and_save_memories`): one bounded provider call (`client.call(tools=[])`, same resolved config), strict JSON-array prompt + fenced/quoted fallback parsing, caps 3 facts × 500 chars, context truncated 2000 chars/turn, case-insensitive substring dedupe vs recent 100 memories; never raises (logs + returns []). Toggle: `users/{uid}/settings/eve-memory` doc `{auto_remember}` via `app/services/eve/memory_settings.py` (`resolve_auto_remember`, **default ON**) + `GET/PUT /api/v1/settings/eve-memory` (`app/api/routes/eve_memory_settings.py`). Frontend: new Settings "Eve memory" section (`AutoMemorySection.jsx`, monochrome `whatsapp-toggle-switch` reuse, optimistic PUT with revert) mounted between AI Models and Coding sections; `lib/eveMemoryApi.js`; command-palette entry `setting-eve-memory` in `config/search/settingsSections.js`. Explicit "remember this" tool calls work regardless of toggle. Tests: `tests/test_eve_memory_settings.py` (8: defaults ON, saved off, PUT persist+merge, 422 missing field, skip-when-disabled, save+dedupe, fenced parse, cap-at-3).
- AI Models settings: the Settings page exposes an "AI models" section (`AiModelsSection.jsx` + `aiModelsApi.js`) where users pick a provider and a model for EVE from a catalog of 6 providers (OpenAI, Anthropic `claude-*`, Google Gemini `gemini-*`, OpenRouter `vendor/model` 300+ models via one key, Ollama local models key-optional with `OLLAMA_URL`, OpenCode). Model dropdowns are populated **live from each provider's list API** (OpenAI `/v1/models`, Gemini `v1beta/models` filtered to `generateContent`-capable models — Gemini, Gemma, LearnLM, Anthropic `/v1/models`, and any OpenAI-compatible `/v1/models` for OpenRouter/Ollama/OpenCode) via `fetch_provider_models` + 300s cache (`app/services/ai_models/discovery.py`), falling back to the static catalog; `AiModelsSection.jsx` calls `GET /settings/ai-models/models/{provider}` on **every provider selection/load** (backend resolves saved user key → server env key → static fallback) and with the typed key (debounced) while entering one; the hint distinguishes "N available via provider API" (live) from "N in catalog" (static fallback). OpenAI-compatible providers share `OpenAiCompatibleClient` (`openai_compat.py`, chat.completions tool-calling). Providers configured via env vars on the server need no user key; other providers prompt for a user API key stored securely in `users/{uid}/settings/ai-models` (`app/api/routes/ai_models.py`). `resolve_ai_config` uses the environment key when available or the user's stored key, falling back to server default (`DEFAULT_PROVIDER`). Typing an API key in Settings triggers a debounced live model fetch showing "N available via API".
- WhatsApp settings (`WhatsAppSection.jsx`): Settings → WhatsApp exposes account pairing, global Eve auto-responder toggle, desktop/push notifications toggle, configurable **Eve trigger keywords** (tag-style add/remove UI with quick presets and reset-to-defaults; persisted to `users/{uid}/whatsapp_settings/default` via `PUT /whatsapp/settings`), custom Eve auto-reply prompt/instructions, and per-chat Eve auto-reply in the conversation info drawer. Incoming messages matching `@eve`, owner aliases, or any configured keyword activate Eve analysis/drafting (`app/services/whatsapp.py`, `app/schemas/whatsapp.py` `keywords` field).
- Eve speech backend: server-side STT/TTS providers for EVE voice calls in
  addition to the browser Web Speech API path. `GET/PUT /settings/eve-speech`
  (`app/api/routes/eve_speech.py`) returns a provider catalog (browser + Groq
  Whisper STT, browser + Google Cloud TTS + OpenRouter Fish S2.1 Pro Free TTS) with `available` flags and persists
  the user's `stt_provider`/`stt_model`/`tts_provider`/`tts_voice` choice to
  `users/{uid}/settings/eve-speech`. The catalog is curated in
  `app/services/speech/_shared.py` (Groq Whisper models, Google Cloud
  Standard voices, OpenRouter free-form voice). `POST /eve/transcribe` streams an
  audio upload to Groq and returns the transcript text; `POST /eve/synthesize`
  returns MP3 audio from Google Cloud or OpenRouter Fish S2.1 Pro Free (`fish-audio/s2.1-pro-free:free` via `POST /audio/speech` in `openrouter_tts.py`, MP3, 200 req/day free). `resolve_stt_engine` /
  `resolve_tts_engine` pick the active provider per user with a browser
  fallback when unset or when the chosen provider has no server-side key.
  Server-side env keys: `GROQ_API_KEY`/`GROQ_URL`/`GROQ_STT_MODEL`,
  `GOOGLE_CLOUD_TTS_API_KEY`/`GOOGLE_CLOUD_TTS_URL`/`GOOGLE_CLOUD_TTS_VOICE`, `OPENROUTER_API_KEY`/`OPENROUTER_TTS_MODEL`/`OPENROUTER_TTS_VOICE`.
- Eve speech Settings UI (`EveVoiceSection.jsx` + `eveSpeechApi.js`): the
  Settings "Eve voice" section now loads the server's speech provider catalog
  via `GET /settings/eve-speech` and lets users pick the STT provider
  (Browser / Groq Whisper + model) and TTS provider (Browser / Google Cloud + OpenRouter Fish S2.1 Pro Free +
  voice) with `PUT /settings/eve-speech`, mirroring the AI Models picker. The
  preview button uses the selected engine — browser `SpeechSynthesis` or the
  server `/eve/synthesize` endpoint (Google or Fish via OpenRouter, MP3, with browser
  pitch mapped 1-based → 0-based). Unavailable providers (no server
  key) are filtered out and a fallback warning is shown when a saved provider
  is no longer available. Browser-only controls (language, local voice, rate,
  pitch) remain localStorage-backed under `starwaves.eve_voice_prefs`; the
  language picker also drives which Google Cloud voices are offered; OpenRouter uses a free-form voice hint (e.g. `alloy`).
- Automated Eve Reminders & Schedules: create one-time or recurring (cron-based) automated prompts or voice calls.
  - Supports two action types: AI Chat Prompt execution (runs prompt, saves session & notifies user) or Eve Voice Call (automatically initiates an incoming voice call from Eve to user at scheduled time).
  - Tools added to Eve assistant (`create_eve_schedule`, `list_eve_schedules`, `delete_eve_schedule`) so users can schedule reminders conversationally in chat or via the `EveSchedulesCard` sidebar component.
  - Vercel Cron Integration: `vercel.json` registers background cron job (`/api/v1/cron/execute-schedules` every 15 minutes `*/15 * * * *`) targeting FastAPI backend route `app/api/routes/cron.py`.
- Calls & Eve AI Voice Calling: app-wide WebRTC voice/video calls between StarWaves users and bidirectional voice calls with Eve AI Assistant (`eve@starwaves.app` / `eve-bot`).
  - SQL-backed call records (`server/app/db/sql/calls.py` / `compat.py`): the `calls` collection now round-trips Firestore-shaped documents — nested `caller`/`callee` identities are reconstructed from the `users` table (with a built-in `eve-bot` identity), `messages` are persisted as a JSON column, participant queries (`array_contains` on `participants`) map to `caller_id`/`receiver_id` OR-checks, and both compat and `firebase_admin` `ArrayUnion` values are normalized on writes. `init_db` (`server/app/db/session.py`) idempotently backfills the `calls.messages` column on existing deployments (Postgres `ADD COLUMN IF NOT EXISTS` / SQLite PRAGMA check) since the project has no alembic migrations.
  - Modular SQL Compatibility Layer (`server/app/db/sql/`): the former monolithic `server/app/db/compat.py` is decomposed into a structured package with single-responsibility modules for entities (`users.py`, `calls.py`, `todos.py`, `jobs.py`, `projects.py`, `hackathons.py`, `documents.py`, `contacts.py`, `notifications.py`, `eve.py`, `settings.py`, `whatsapp.py`), shared timestamp/coercion utilities (`_shared.py`), Firestore query/collection emulation primitives (`query.py`), in-memory fallback store (`fallback.py`), and a central dispatcher (`client.py`). `server/app/db/compat.py` is preserved as a clean backward-compatibility facade re-exporting all symbols.
  - Real-time WebSocket signaling: uses persistent `/ws/calls` connection (`callsSocket.js` + `ws_manager.py`) with zero HTTP polling. Incoming calls, WebRTC offers/answers/ICE candidates, and call status transitions are pushed instantaneously to participants upon write operations.
  - Users can dial `eve` or `eve@starwaves.app`, click quick-action buttons ("Call Eve" / "Receive call from Eve"), or ask Eve in chat ("Eve, call me") to trigger immediate incoming voice calls.
  - Active Eve calls launch a dedicated monochrome AI pulse wave visualizer (`CallScreen.jsx`), integrated Web Speech API STT (Speech-to-Text) voice recognition, and TTS (Text-to-Speech) voice synthesis with real-time speech captions overlay and mute/audio controls.
  - Backend: `server/app/api/routes/calls.py` handles `eve-bot` resolution and `/calls/trigger-eve` endpoint; `server/app/api/routes/calls_ws.py` handles `/ws/calls` WebSocket lifecycle; `server/app/services/eve.py` includes the `trigger_eve_call` workspace tool.
  - Calls integrate with notifications: starting a call, missing a call, or declining a call automatically creates workspace notifications in Firestore via `NotificationRepository`, dispatches FCM push notifications to user devices, and triggers browser desktop notifications. Calls are also surfaced in the sidebar navigation, Header notification drawer (with dedicated call icons), and landing page "Remind me" CTA routes to signup.
- Eve voice call UX (Web Speech API, `for now` approach): Eve voice calls surface STT state via `sttSupported`/`sttStatus` (`listening`/`unsupported`/`permission`/`error`) in the `CallScreen.jsx` status line, and show an on-call text fallback input whenever voice input is not listening (unsupported browser, denied mic permission, or STT error). An echo-loop guard in `useCallCenter.js` ignores speech-recognition results while Eve's TTS is playing (plus a 700ms cooldown) so her own spoken words are never transcribed back into the conversation. Speech preferences (language, voice, rate, pitch) persist under `starwaves.eve_voice_prefs` via `src/utils/speech.js` (pure helpers + vitest suite), the `useSpeechVoices` hook, and the new Settings "Eve voice" section (`EveVoiceSection.jsx`). Note: Web Speech STT runs through the browser's speech service (Chrome uses Google servers, not on-device); TTS uses local OS voices.
- Eve voice call server STT/TTS integration: `useCallCenter.js` loads the user's speech provider choice (`loadEveSpeech` → `GET /settings/eve-speech`) whenever an Eve call becomes active and stores it in `speechPrefs` (`sttProvider`/`sttModel`/`ttsProvider`/`ttsVoice`). When the TTS provider is `google` or `openrouter` (Fish S2.1 Pro Free), Eve's replies are synthesized server-side via `synthesizeEveSpeech` (`POST /eve/synthesize`, Google Cloud or OpenRouter Fish MP3) and played through an `Audio` element with the same `isEveSpeaking`/echo-guard wiring as browser TTS. When the STT provider is `groq`, browser SpeechRecognition is skipped in favor of push-to-talk: `startSttRecording`/`stopSttRecording` capture mic audio (`MediaRecorder`, webm/opus) and `transcribeEveAudio` (`POST /eve/transcribe`, Groq Whisper) sends the transcript through the normal Eve reply path. `CallScreen.jsx` renders a hold-to-talk mic button when `sttProvider === 'groq'`, with release-to-send hints and the text fallback still available.
- Docker & Nginx containerization: Fullstack multi-container stack orchestrated via root `docker-compose.yml` with `.env.docker.example` and [`DOCKER.md`](file:///c:/project/starwaves/DOCKER.md). Includes React frontend (`/website`) multi-stage build (`node:20-alpine` + `nginx:alpine`) on port 3000/80 with SPA routing, `/server` containerized with Python 3.12-slim (`appuser`, Uvicorn), PostgreSQL 16 database, WhatsApp worker, and Nginx edge reverse proxy (`nginx/`) routing frontend SPA requests (`/`), API endpoints (`/api/`), WebSockets (`/ws/`), docs (`/docs`), and health checks (`/health`) with Gzip, 20MB payload ceiling, and security headers.
- Global CORS & Exception Middleware: `server/app/main.py` features outer CORS middleware and exception wrapping ensuring proper `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`, and allowed header response headers across all HTTP endpoints, preflight `OPTIONS` requests, 4xx/500 status responses, and unhandled server exceptions for local development (`localhost`, `127.0.0.1`, Capacitor `capacitor://localhost`, custom ports) and production (`https://starwaves.susindran.in`, `https://*.susindran.in`, `https://*.vercel.app`).
- Email & Google OAuth single-account unification: automatic merging of duplicate account records in Firestore (`merge_duplicate_user_accounts`), seamless password attachment to Google OAuth accounts upon signup (`create_user_with_password`), and on-demand `/api/v1/auth/merge-accounts` endpoint.
- User session signout: explicit Sign Out actions provided in the topbar profile dropdown (`Header.jsx`), Profile Card (`ProfileCard.jsx`), and Account & Security settings (`AccountSection.jsx`). Invoking sign out clears local authentication session tokens via `clearAuthSession()`, resets workspace state, and redirects the user to the `/login` route.
- Android shell via Capacitor (`website/android/`).
- Vercel cron hookup: `vercel.json` configures serverless cron job `/api/v1/cron/execute-schedules` scheduled every 15 minutes (`*/15 * * * *`).
- Cinematic Landing Page (2026-08-24 rebuild, sharp Linear monochrome): `LandingPage.jsx` facade re-exports `landing/LandingPage.jsx` (87 lines, `MotionConfig` + curtain intro 900ms) composing 8 single-responsibility Framer Motion sections (`Nav` sticky, `Hero` with choreographed container stagger + parallax glows + floating monochrome frame, `Manifesto` 3-act stagger, `Showcase` pinned 260vh reel with `useScroll`→`active` + `AnimatePresence` crossfade + progress rail, `Eve` spotlight with terminal + animated waveform bars, `Features` 8-card bento stagger, `Workflow` pinned 220vh timeline with `useTransform` rail, `FAQ` `AnimatePresence` accordion, `Finale`+`Footer`) plus `data.js` (163 lines, lucide-react only) and scoped `cinema.css` (373 lines, `.cinema` namespace, fixed dark #000, Linear sharp radii, monochrome glows). All CTAs go to `/signup` or `/login`, anchor ids `#manifesto` `#showcase` `#eve` `#workflow` `#faq` via `scrollIntoView({behavior: 'smooth'})`, semantic HTML, `:focus-visible` white outline, ≥44px hit targets, `useReducedMotion` disables curtain/parallax/pinning. Old `styles/pages/landing.css` deprecated to 1-line stub; new stylesheet imported only in `LandingPage.jsx` so monochrome-only rule lifted only for landing but current design stays monochrome sharp by choice. Framer Motion 13.1.1 adds ~132 kB raw / 35 kB gzip to main chunk (549.69 kB / 148.35 kB gzip vs ~417 kB pre-motion). Verified `npm run lint`/`build`/`test` pass; live at `/` with zero console errors, visibly animated on load/scroll/interaction.
- Advanced Global Search & Command Palette (`⌘ K` / `Ctrl+K`): topbar search bar triggers a centered command palette modal (`AdvancedSearchModal.jsx` + `searchIndex.js` + `search-palette.css`) supporting instant search across 22+ top-level pages, 9 deep-anchored settings sections (Profile, Themes, Connected Apps, WhatsApp, AI Models, Coding Profiles, Hackathons, Eve Voice, Account & Security), Eve AI subpages and tools, live workspace records (Projects, Jobs, Documents, Hackathons, Tasks), and quick actions (Create Task/Project/Job/Document, Call Eve, New Eve Chat, Toggle Dark/Light Theme, Sign Out). Features category filter pills (`All`, `Pages`, `Settings`, `Eve AI`, `Records`, `Actions`), full keyboard navigation (`↑` / `↓` arrow selection, `↵` execution, `Esc` close), recent searches persistence, smooth section scrolling with target highlight, and strict monochrome styling.
- Large-file refactor (single-responsibility): `server/app/services/eve.py` (1156) → `eve/` package (max 252); `website/src/components/whatsapp/WhatsAppConversation.jsx` (1754) → `conversation/` (max 388); `website/src/pages/ProjectsPage.jsx` (817) → `projects/` (max 211); `website/src/hooks/useCallCenter.js` (914) → `call/` (max 399); continuation: `website/src/pages/ContactsPage.jsx` (806) → `contacts/` (8 modules: `constants`, `useContacts`, `useContactForm`, `useContactImport`, `ContactCard`, `ContactGrid`, `ContactFormModal`, `ContactImportModal`, max ~120), `website/src/config/searchIndex.js` (785) → `search/` (7 modules: `categories`, `pages`, `evePages`, `settingsSections`, `actions`, `staticItems`, `buildSearchIndex`/`filterSearchItems`, max ~180), and legacy `website/src/pages/LandingPage.jsx` (803) → `landing/` (first 14 modules 433 lines) then rebuilt 2026-08-24 to sharp Linear cinema: 12 modules `LandingPage.jsx` 87, `data.js` 171, `cinema.css` 373, `sections/` 8 × ≤185 (Nav, Hero, Manifesto, Showcase pinned, Eve, Features, Workflow pinned, FAQ, Finale) with `useScroll`/`useTransform`/`AnimatePresence` + `useReducedMotion`, scoped `.cinema` so color rules never leak. All splits respect AGENTS.md §1.6/§1.7/§1.8; verification passes (`npm run lint`/`build`/`test`, `python -m unittest` 86→113 OK).
 - AI layer cleanup refactor (2026-08-24): oversized `ai_models/_shared.py` (684 lines, over the 500 limit) split into single-responsibility modules — `contracts.py` (types + `ProviderClient` interface), `catalog.py` (provider catalog, defaults, `validate_preference`, `_format_model_label`), `config.py` (key/base-url resolution as public `has_server_key`/`effective_api_key`/`effective_base_url`, `build_ai_config`, per-user TTL cache), `discovery.py` (live model listing via one shared `_get_models_json` HTTP helper replacing 4 duplicated fetchers, TTL cache, `fetch_provider_models`, `provider_catalog`), and `loop.py` (`run_tool_loop` + `run_tool_loop_stream` sharing `_run_tool_call`; both loops previously ~40% duplicated). `_shared.py` kept as a backward-compat facade. Eve orchestrator dedup: new `eve/chat_context.py` (`resolve_chat_context` → RAG instructions + config + client + conversation + bound `run_tool`) consumed by both `chat.py` and `chat_stream.py` (~20 lines each removed; transport-specific guards stay local). Private-as-public renames: `dispatcher._run_tool` → `dispatch_tool`, `memories._build_instructions/_get_cached_memories/_set_cached_memories` → `build_memory_instructions`/`get_cached_memories`/`set_cached_memories`; dead imports removed from `chat.py`; `eve/__init__.py.__all__` pruned to genuinely public symbols. All file sizes now ≤ 209 lines in both packages. Verified: `python -m pytest tests -q   # unit + api + services + e2e (SQLite-backed)` 113 OK.
 - Server reusable systems refactor (2026-08-25): break monolith into 8 reusable systems — `core/errors` (unified HTTP errors), `core/http` (httpx factory with shared limits/User-Agent), `core/pagination` (canonical cursor/limit/`PageResponse`; `repositories/pagination` now facade), `core/dependencies` (`CurrentUser`/`CurrentUserId`/`DbClient` aliases), `core/ws/base` (`BaseWSManager` single|multi) with facades `ws_manager.CallWSManager` + `whatsapp_ws_manager.WhatsAppWSManager`; `core/auth` DRY `_validate_token_payload` + `try_get_user_from_token` + `create_serializer`; `repositories/helpers` (`soft_delete_payload`/`restore_payload`/`dict_to_snapshot`) adopted in `todos`/`projects`; `models/mixins` (`TimestampMixin`/`SoftDeleteMixin`/`UserOwnedMixin`); `db/sql/registry` (declarative table eliminating 3×15-branch if-chains in `client.py`) + `db/sql/base` (`generic_get/set/delete/query`); `db/sql/_shared._TIMESTAMP_KEYS` fix (adds `last_run_at`/`deleted_at` etc.); `services/helpers.fetch_paginated`; `api/routes/whatsapp/` package split 535L → 7 files (`status|chats|messages|settings|webhook` + `_shared` mention/name helpers, max 218L) with `__init__` combine facade preserving `from app.api.routes.whatsapp import router`. All splits respect §1.6-1.8 and preserve import paths. Verified: `python -m unittest discover tests` 113 OK, `/api/v1/whatsapp/*` 16 paths intact.
 - Studio Apps page (2026-08-25): new sidebar item **Apps** in the Studio group (`studio-apps` route, `AppWindow` icon, between Studio and Templates) listing previously built apps — Studio projects with `build_status: ready` — via reused `useStudioProjects` hook. Each card shows stack/file count/updated date with **Open Builder** (→ `studio-detail`) and **Run App** (`startPreview` → preview URL in new tab, `Starting…` busy state) actions; error banner, `LoadingState`, and `EmptyState` (CTA back to Studio) included. Wired in `navigation.js`, `useRouter.js` workspacePages, `App.jsx` lazy route, command palette `search/pages.js` (`page-studio-apps`), and Eve `WORKSPACE_PAGES` (`server/app/services/eve/constants.py`, auto-feeds the `navigate_page` tool enum). Zero new CSS — reuses `.studio-project-grid`/`.studio-project-card` classes.
 - Workspace embedded browser (2026-08-25): new **Browser** toggle (Globe icon) in the Workspace IDE toolbar next to Terminal opens `WorkspaceBrowser.jsx` (`pages/workspace/`) — a side panel docked right of the editor (`.workspace-center.browser-open` row layout via new `.workspace-center-stack` wrapper; stacks below at ≤1100px with 340px height). Address bar with URL input (Enter to navigate, auto-prepends `https://`), Reload (iframe remount via key), Open-in-new-tab, Close; sandboxed iframe (`allow-scripts allow-forms allow-popups`, same policy as Studio preview). Last URL persists per workspace in localStorage `starwaves.workspace.browser-url:{workspaceId}` (try/catch guarded); empty state shows a Globe illustration + embedding hint (X-Frame-Options sites must use the external-open button). Monochrome tokens only; `aria-label`s on all controls.
 - Studio hero rebuild (2026-08-25): `StudioProjectsPage` replaced by a full-bleed Lovable-style landing hero — new `StudioHero.jsx` (`pages/studio/`) with centered "Build something with Eve" title, subtitle, and a rounded prompt card (autogrow textarea, Enter submits / Shift+Enter newlines, "+" attach button (now the "Add files" picker — the advanced `CreateProjectModal` was removed in a later change), `CustomDropdown` starter-template picker defaulting to "Build", circular send button disabled until text). Submit creates a project via `createStudioProject` (`name` from `deriveProjectName` in `studioConstants.js`, description = prompt, defaults sqlite/no-auth) and navigates to `studio-detail`; failures keep the prompt and show a `studio-error-banner`. The projects list, `ProjectCard` grid, and delete `ConfirmDialog` flow moved to `StudioAppsPage` as an "In progress" section (`SectionHeading`, `build_status !== 'ready'`) above the finished-apps grid; `EmptyState` shows only when both lists are empty. Hero CSS in `styles/pages/studio.css` is fully token-based monochrome (`--bg-primary`→`--bg-secondary` fade, `--bg-card`/`--border-color` card, `--color-primary`/`--text-inverse` send button, shadow tokens) — theme-aware with zero `html.dark-theme` overrides; `.studio-projects-*` styles removed. `StudioProjectsPage` no longer uses `useStudioProjects` (App.jsx still passes `onNavigate`, harmlessly ignored).

## 7. Known limitations

- Calendar event creation/editing not implemented.
- Mail attachments, forwarding, rich-text composition, persistent drafts not
  implemented.
- Calls: calls use public STUN only, so peers behind strict
  symmetric NAT/firewalls may fail to connect until a TURN relay is added.
  Signaling message backlogs are bounded (see §6).
- Production frontend build emits a bundle-size advisory.

## 8. Verification commands

## 9. Backend test architecture (2026-08-26)

- **Framework**: pytest (server/pytest.ini, asyncio_mode=auto, e2e marker). Deps: pytest>=8.4, pytest-asyncio>=0.26.
- **Layout**: server/tests/{unit,api,services,e2e}/ with shared scaffolding in server/tests/support/ (db.py SQLite harness + seeding, auth.py real-Bearer-token helpers + frozen-Settings overrider, fakes.py scripted blocking/streaming AI providers, external.py httpx MockTransport wiring).
- **Isolation**: root conftest.py stubs dotenv.load_dotenv (no local secrets in tests), pops REDIS_URL/Twilio env, points DATABASE_URL at a temp SQLite file; the db fixture drops/recreates schema per test; client fixture builds TestClient WITHOUT context manager so lifespan/background worker never run. Import-order guard pre-imports app.db.session to break the models-dbsql cycle.
- **E2E journeys** (tests/e2e/test_journeys.py): productivity chain w/ pagination cursors + soft-delete/restore; calls lifecycle (ring/active/signals/ended + stale-ringing expiry); due Eve schedule executed by EveSchedulesBackgroundJob through patched chat orchestrator; WhatsApp webhook @eve pipeline with persisted history.
- **Mocking boundary**: only genuinely external systems are scripted — AI providers, outbound HTTP, Twilio REST, WhatsApp gateway. Everything else is real code paths.

---

```text
# Frontend (from website/)
npm run lint        # Oxlint
npm run build       # Production build
npm test            # Vitest

# Backend (from server/)
python -m pytest tests -q   # unit + api + services + e2e (SQLite-backed)

# Docker Stack (from repository root)
docker compose config              # Verify Compose file validity
docker compose up --build -d       # Build & launch containerized stack
curl -i http://localhost/health    # Verify Nginx reverse proxy & backend health
```


