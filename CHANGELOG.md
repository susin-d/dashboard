# Changelog

Historical implementation log extracted from `context.md`. `context.md` now holds the **current snapshot** only; this file preserves the full chronological history for audit.

## 2026-08-26 — Security Phase 5 — RLS SET LOCAL + pip harden
- `core/rls.py` `set_rls_user` (SET LOCAL app.current_user_id) wired into `sql/base.py` generic handlers
- `studio/commands.py` hardened: `pip --no-build-isolation` + `npx/pnpm --ignore-scripts` + extended npm/yarn allowlist
- Prior phases in snapshot: BOLA per-entity owner+allowlist (11 collections), SSRF `0.0.0.0`/`is_unspecified`, `website/nginx.conf` HSTS/CSP, `twilio_relay` 4096 cap, Twilio hard enforce, docs prod-gate, worker HMAC, RLS `starwaves_app` role, `SECURITY.md`, rate-limit, `pickle→json`, CORS `*.vercel.app` removal, `realpath`, `DOMPurify`

## 2026-08-25 — Major passes (consolidated)

- **Firestore elimination:** Removed `google.cloud.firestore_v1`, `firebase_admin.firestore`, `FieldFilter` across 88+ backend files; unified on `SqlClient`/`DbClient`/SQLAlchemy 2.0; 137 tests pass.
- **Ollama default provider:** `DEFAULT_AI_PROVIDER=ollama`, `OLLAMA_URL=https://ollama.com/v1`, `OLLAMA_MODEL=gpt-oss:120b-cloud`; `DEFAULT_PROVIDER` reads `settings.default_ai_provider`; `has_server_key` checks `ollama_url`+`ollama_api_key`.
- **Ollama voice priority:** `voice_fast.resolve_voice_config` tries Ollama first → groq 8b-instant → gpt-4o-mini → user config.
- **Eve Memory page fix:** `.eve-active-view-container { overflow-y: auto }`, memories as compact horizontal list.
- **Mails connect one-page fit:** Refined `.mail-connect-hero-card` + features grid to fit viewport without scroll.
- **HTML live preview (Workspace):** `WorkspaceBrowser htmlContent` via `srcdoc` + `WorkspaceEditor onRunHtml` + `activeHtmlContent` derivation.
- **API-only model discovery:** Removed static fallback arrays in `catalog.py`/`discovery.py`; removed OpenAI prefix filter.
- **ModelSelectorDropdown + Plan Approval:** `ModelSelectorDropdown.jsx` filtering to keys + search; `studio-plan-inline-card` with Approve/Request Changes.
- **Workspace Eve → browser:** `open_workspace_browser` tool + `handlers/workspace_files` + `dispatcher` + `useEveAgentChat onAction` + `WorkspacePage handleEveAction`.
- **Studio planning questions:** `QuestionCard.jsx` + `questionUtils.js` with recommended pills + custom input.
- **Studio one-page layout:** Hero/prompts now true full-bleed flex fill, no phantom scroll.
- **Eve chat spacing fix:** Removed `min-height` gaps in `.eve-chat-section` / `.eve-messages-feed`.
- **Workspace card spacing fix:** `.ws-overview-grid` 320px min, 1240px max; `.ws-card-open` padding 20px.
- **Todo checkbox fix:** `.todo-check` 20px square with `aspect-ratio: 1/1`.
- **Talk-over barge-in:** `useEveVoice.interruptEve` + hold-to-talk cut + `CallRepository.update_status` terminal guard.
- **Studio hero Add files:** Removed `CreateProjectModal`, added `StudioHero` multi-file picker + `studioBrief.js` sessionStorage brief + `utils/fileSize.js` dedupe.
- **Studio builder fixed-viewport:** `.content:has(.studio-builder)` flex fill + rail `overflow-x: hidden`.
- **Workspace Eve Agent SSE:** `useEveAgentChat.js` hook + workspace_id required on 5 file tools + auto-refresh file tree.
- **Studio hero phantom-scroll fix:** Hero `flex:1` inside flex-filled content.
- **Twilio ConversationRelay:** `POST /calls/twilio` + `/trigger-eve-twilio` + `relay-twiml/{id}` + `/ws/twilio-relay` streaming groq 8b-instant with barge-in.
- **Flat inputs:** Removed `--shadow-inset` from inputs/selects/textareas; fixed browser URL input sizing.
- **Lovable hero, Deepgram STT, Workspace browser, Studio Apps** — prior rewrites (see git log for full diffs).

*(Prior entries before 2026-08-25 are in git history: `git log --oneline`.)*

---
## 2026-08-30 — Usage page fix + Eve tool calling + Cache tuning + CORS 429
- **Eve tool calling (ADR 0002):** `openai_compat` flat→nested `function` conversion fixes OpenRouter/Ollama/OpenCode/Groq; add `groq` to `PROVIDER_CLIENTS`.
- **Cache tuning:** `core/cache.py` presets `SHORT 30/MEDIUM 60/LONG 300` with per-user `prefix:user_id:hash`; `request.js` default 30s + dedup + `CACHE_TTL_OVERRIDES` (`/ui/preferences` 120s, `/auth/me` 60s, `/usage/` 15s, `/eve/sessions` 15s).
- **CORS 429:** Nginx `$cors_allow_origin` map + `proxy_hide_header` + `RateLimitMiddleware` adds `Retry-After`+CORS on 429; `aiModelsApi` retries 2 + 60s cache; `AiModelsSection` dep fix.

## 2026-08-30 — Usage page: honest empty state, column-major heatmap, cache invalidation
- **Backend:** `usage.py` routes `CACHE_TTL_LONG→SHORT`, remove dead `_sync_session` + unused `DbClient`; `services/usage.log_usage` invalidates `usage:summary|logs:{user_id}` + dict-direct token extraction for `prompt/completion/total`; `schemas/usage.UsageSummary` expanded with `daily_by_model/peak/longest/current_streak/longest_streak/model_list`.
- **Frontend:** `UsagePage.jsx` remove 4.9M/GLM demo spikes, use `EmptyState` when empty, `topMetrics.longestLabel` now `formatTokens`, unified `getHeatLevel` (0/<100k/<800k/<2M), `Weekly`/`Cumulative` modes, `clampTooltipX`, dynamic `heatmapMonths`, `trend`/`donut` honest; `usage.css` heatmap `grid-auto-flow:column` + `7 rows`; `request.js` `/usage/` TTL `0→15s` + `usageApi` respects cache.

## 2026-08-31 — Frontend audit fix
- **Tokens:** `tokens.css` add type scale `--text-2xs→4xl`, `--leading-*`, `--font-weight-*`.
- **Hierarchy:** `base.css` PageHeader/dashboard/contacts `.page-heading h1` unified via `var(--text-4xl)`; `contacts/index.jsx` migrate to `PageHeader` primitive; `contacts.css` padding/gap/radius/shadow tokenized; `projects.css` grids `min(100%,310px)`, gaps `var(--card-gap)`, radii `var(--radius-md)`, add `.project-detail-grid--compact`, `.project-page-error`, `.project-progress-actions-detail`.
- **Consistency:** `TodoPage.jsx` EmptyState + `.todo-item-actions`, focus-within + coarse pointer touch; `WorkspacePage.jsx` new file/folder → `Modal`+`FormField`; `ChatsPage.jsx` + `chats.css` extract `no-active-chat--large/compact`, `chat-cta-button`, `chat-empty-messages`, `chat-send-error` (monochrome); `CustomPage.jsx` card/code/hint classes.
- **Polish:** `calendar.css` monochrome `#444→color-primary`, `#6a6a6a→text-secondary`; `workspace.css` error `#fef2f2→bg-secondary`, `#22c55e→color-primary`, `#f59e0b→text-secondary`, `#d97706/#fffbeb→bg-tertiary/border`, footer; `buttons.css` focus/disabled; `utilities.css` avatar helpers; `Header.jsx` avatar class cleanup; `CalendarPage.jsx` meta spaced class.
- **Responsive:** grids `min(100%, …)` prevent 320 overflow; `contacts-grid` gap token; `todo-delete` coarse fix; `layout-symmetry` unchanged (900 breakpoint kept intentionally — standardize next pass if needed).
- **Verify:** `npm run lint` (1 no-useless-escape warning only in MailsPage) + `npm run build` 575kB index 154k gzip ok.

## 2026-08-31 — Frontend audit fix p2
- **WhatsApp:** `WhatsAppInfoDrawer.jsx` 12 inline `style` → classes (`whatsapp-drawer-header/title/profile/card/row/participant/security/media/doc/starred` + `avatar--lg/sm`), `WhatsAppChatList.jsx` spacer/pin/muted/preview-strong/empty, `WhatsAppQrModal.jsx` loading-text/copy-btn/spaced actions + `whatsapp.css` 30+ tokenized classes; context menu position kept (dynamic); add `aria-label`/`role`/`onKeyDown`.
- **Headers:** `projects.css` `.project-page-heading h1` `clamp→var(--text-4xl)`, `p`→`var(--text-2xs)`, gap/padding tokenized.
- **A11y:** `Sidebar.jsx` `onFocus`/`onBlur` + `aria-label` for tooltip keyboard; `WorkspaceFileTree.jsx` `aria-expanded`/`aria-current`/`aria-label`; `WhatsAppChatList.jsx` + `ChatsPage.jsx` `aria-current` + `aria-label`.
- **Responsive:** `workspace.css` `@media (pointer:coarse)` `ws-card-actions`/`file-tree-action`/`todo-delete` 44px; `ws-card` radius `12px→var(--radius-lg)`.
- **Verify:** `npm run lint` clean (1 warning) + `npm run build` 461kB css 67k gzip, 574kB index ok.

## 2026-08-31 — Frontend audit fix p3
- **ProfileCard:** 5 inline `style` → `profile-verification-actions/verified-badge/verify-btn/feedback-spaced` in `settings.css` with `var(--text-sm)` + `var(--space-*)`.
- **WhatsApp bubble/composer:** `WhatsAppMessageBubble.jsx` `transform`→`forwarded-flip`, `cursor`→`quoted-clickable` + keyboard `role`/`onKeyDown`, `audio-time/doc-card` tokenized; `WhatsAppComposer.jsx` `eve-prompt-label/tray-label/row/file-input/recording` classes in `whatsapp.css`; add `aria-label` for emoji/attach/recording.
- **Metrics:** `style={{` 181→159 (`-22`, -12%); WhatsApp bubble/composer/profile drop from top-5; `npm run lint` clean + `npm run build` 574kB index 154k gzip ok.

*Generated: 2026-08-27 from former `context.md` history block. New changes go to `context.md` `Last updated` one-liner.*
