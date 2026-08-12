# Starwaves Context

Living project snapshot for AI agents. `AGENTS.md` holds the permanent rules;
this file holds the **current state** of the codebase and must be kept up to
date whenever the implementation changes.

> **Last updated:** 2026-08-12 (landing page cinematic redesign)

---

## 1. Project overview

StarWaves is a personal productivity workspace that brings projects, job
applications, tasks, documents, calendars, email, hackathons, competitive
programming, and an AI assistant into one dashboard.

- **Frontend** (`/website`): React 19 + Vite + Vanilla CSS (monochrome design system).
- **Backend** (`/server`): FastAPI (Python) + Firebase Firestore. Containerized with Docker & Nginx.
- **Auth**: Firebase Authentication; serverless deployment targets Vercel, dockerized server for standalone VM/cloud deployment.

## 2. Repository structure

```text
Starwaves/
├── website/                 React frontend
│   ├── src/components/      Shared UI components (+ ui/ primitives)
│   ├── src/hooks/           Auth, routing, theme, workspace data hooks
│   ├── src/lib/             Frontend API clients
│   ├── src/pages/           Workspace pages (+ settings/ feature sections)
│   ├── src/styles/          Tokens, components, and page styles
│   └── src/utils/           Pure parsers/transformers
├── server/                  FastAPI backend
│   ├── app/
│   │   ├── api/routes/      HTTP endpoints and OAuth callbacks
│   │   ├── core/            Configuration and authentication
│   │   ├── db/              Firestore client
│   │   ├── repositories/    Firestore data access
│   │   ├── schemas/         API request and response models
│   │   └── services/        External integration services
│   ├── tests/               Backend unittest suite
│   ├── templates/email/     Email HTML templates
│   ├── Dockerfile           Python 3.12-slim container build
│   └── .dockerignore        Container build exclusions
├── nginx/                   Nginx reverse proxy configuration
│   ├── nginx.conf           Global Nginx configuration (Gzip, buffers, security)
│   └── conf.d/default.conf  Reverse proxy virtual host (port 80/443, WebSocket, health)
├── docker-compose.yml       Multi-container orchestration for server & Nginx
├── .env.docker.example      Docker deployment environment template
├── DOCKER.md                Container setup & operational documentation
└── vercel.json              Serverless rewrites
```

## 3. Backend (FastAPI)

- **App factory**: `server/app/main.py` → `create_app()` with `@asynccontextmanager` `lifespan` manager (CORS + `/api/v1` router + `ServerBackgroundWorker` daemon thread).
- **Background Worker Daemon**: `server/app/core/worker.py` -> `ServerBackgroundWorker` runs in long-running server environments (Docker / Uvicorn daemons / systemd) to auto-execute due Eve schedules, trigger voice calls, and expire stale calls every 30s.
- **Route registry**: `server/app/api/router.py` includes all top-level routers.
- **Prefix**: `/api/v1` (see `server/app/core/config.py`).
- **Auth**: Firebase ID tokens via `server/app/core/auth.py`.

### Route groups

| Group | Router module | Notes |
| --- | --- | --- |
| Auth | `app/api/routes/auth/` | `oauth`, `credentials`, `password`, `account`, `combine` |
| Workspace | `app/api/routes/workspace/` | `jobs`, `hackathons`, `projects`, `notifications`, `contests`, `calendar` |
| Integrations | `google_calendar`, `google_drive`, `gmail`, `github`, `google_chat` | OAuth callbacks under `/integrations/*/callback` |
| Features | `documents`, `todos`, `profiles`, `notifications`, `email`, `eve`, `calls` | EVE = AI assistant; `calls` = WebRTC signaling |
| Coding | `coding_stats`, `competitive_coding_profile` | Contests + profile stats |
| Misc | `health` | `/api/v1/health` |

### Repositories (`server/app/repositories/`)

`password`, `users`, `account_combine`, `account_deletion`, `jobs`, `projects`,
`notifications`, `pagination`, `documents`, `profiles`, `todos`, `eve`,
`eve_sessions`, `calls`.

### Services (`server/app/services/`)

`coding_stats`, `contests`, `email`, `eve`, `github`, `google_calendar`,
`hackathon_sources`, `notifications`.

### Config (`server/app/core/config.py`)

Environment-driven `Settings` dataclass: Firebase Admin creds, GitHub/Google
OAuth secrets, Gmail/Drive/Chat callbacks, OpenAI (EVE), SMTP, Firestore
database id, CORS origins. Loads `.env.prod` before `.env`.

## 4. Frontend (React)

- **Entry**: `website/src/main.jsx` → `App.jsx` (routing + workspace state).
- **Layout**: `website/src/layouts/AppLayout.jsx` (Header, Sidebar, network status).
- **UI primitives**: `website/src/components/ui/` (`Avatar`, `Badge`, `Modal`,
  `ModalHeader`, `ModalActions`, `ConfirmDialog`, `FormField`, `PageHeader`,
  `EmptyState`, `CustomDropdown`, `CalendarPicker`, `Markdown`) re-exported via
  `index.js`.
- **Hooks** (`src/hooks/`): `useAuth`, `useRouter`, `useTheme`,
  `useThemeCustomizer`, `useWorkspaceData`, `useCallCenter`, plus
  `usePersistentState`, `useLocalNotifications`, `useDialogAccessibility`.
- **API clients** (`src/lib/`): one per backend feature (`todosApi`,
  `workspaceApi`, `gmailApi`, `googleCalendar`, `googleDriveApi`, `eveApi`,
  `emailApi`, `githubApi`, `googleChatApi`, `codingStatsApi`,
  `competitiveCodingProfileApi`, `documentsApi`, `notificationsApi`,
  `callsApi`), plus shared `request.js`, `firebase.js`, `authApi.js` `index.js`.
- **Utils** (`src/utils/`): `browserNotifications`, `calendarEvents`,
  `calendarReminders`, `icsParser`, `popupOAuth`, `projectLifecycle`,
  `callWebRTC`, `callDisplay`.
- **Pages** (`src/pages/`): Dashboard, Projects, ProjectDetail, Jobs,
  Hackathons, HackathonDetail, Todo, Documents, DocumentOpener, Mails,
  Calendar, Chats, Calls, CompetitiveCoding, Stats, Eve, Settings, Themes,
  Profile, Onboarding, Auth, ForgotPassword, Landing, TermsOfService, PrivacyPolicy.
- **Call components** (`src/components/calls/`): `CallScreen`,
  `IncomingCallOverlay`.
- **Settings sections** (`src/pages/settings/`): Profile, Account, Apps,
  WorkspaceApps, Theme, Calendar, IcsCalendar, Gmail, Github, GoogleChat,
  Coding, HackathonSources, DataSources, PushNotifications.
- **Dashboard config**: `src/dashboard/dashboardConfig.js` (React Grid Layout).
- **Navigation config**: `src/config/navigation.js`.

## 5. Design system

- Monochrome only. Tokens in `src/styles/tokens.css`, colors in
  `src/styles/colors.css`, import order via `src/App.css` (tokens → base →
  utilities → responsive → components → pages).
- Light theme default, `html.dark-theme` for dark mode.
- Icons: `lucide-react` only.

## 6. Current implementation state

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
- Notifications: calendar-derived reminders, call notifications (incoming, missed, declined workspace records & desktop alerts), push notifications, read/delete. Proactive notification permission handling (`browserNotifications.js` + `useWorkspaceData.js`) auto-attaches permission prompt triggers to initial user interaction on workspace entry, provides an interactive prompt banner in `Header.jsx`'s notification panel, requests permission on Bell icon clicks & WebRTC call actions, and displays live permission state badges in Settings.
- EVE AI assistant (OpenAI) with sessions, persistent memories, bidirectional voice calling, and automated schedule/reminder execution.
- Automated Eve Reminders & Schedules: create one-time or recurring (cron-based) automated prompts or voice calls.
  - Supports two action types: AI Chat Prompt execution (runs prompt, saves session & notifies user) or Eve Voice Call (automatically initiates an incoming voice call from Eve to user at scheduled time).
  - Tools added to Eve assistant (`create_eve_schedule`, `list_eve_schedules`, `delete_eve_schedule`) so users can schedule reminders conversationally in chat or via the `EveSchedulesCard` sidebar component.
  - Vercel Cron Integration: `vercel.json` registers background cron job (`/api/v1/cron/execute-schedules` every 15 minutes `*/15 * * * *`) targeting FastAPI backend route `app/api/routes/cron.py`.
- Calls & Eve AI Voice Calling: app-wide WebRTC voice/video calls between StarWaves users and bidirectional voice calls with Eve AI Assistant (`eve@starwaves.app` / `eve-bot`).
  - Users can dial `eve` or `eve@starwaves.app`, click quick-action buttons ("Call Eve" / "Receive call from Eve"), or ask Eve in chat ("Eve, call me") to trigger immediate incoming voice calls.
  - Active Eve calls launch a dedicated monochrome AI pulse wave visualizer (`CallScreen.jsx`), integrated Web Speech API STT (Speech-to-Text) voice recognition, and TTS (Text-to-Speech) voice synthesis with real-time speech captions overlay and mute/audio controls.
  - Backend: `server/app/api/routes/calls.py` handles `eve-bot` resolution and `/calls/trigger-eve` endpoint; `server/app/services/eve.py` includes the `trigger_eve_call` workspace tool.
  - Calls integrate with notifications: starting a call, missing a call, or declining a call automatically creates workspace notifications in Firestore via `NotificationRepository`, dispatches FCM push notifications to user devices, and triggers browser desktop notifications. Calls are also surfaced in the sidebar navigation, Header notification drawer (with dedicated call icons), and landing page "Remind me" CTA routes to signup.
- Docker & Nginx containerization: `/server` containerized using Python 3.12-slim with non-root security context (`appuser`), Uvicorn 4-worker runtime, and container healthchecks. Nginx reverse proxy configured in `nginx/` with Gzip compression, 20MB client upload ceiling, security headers, WebSocket upgrade support, and health route proxying. Orchestrated via root `docker-compose.yml` with `.env.docker.example` and [`DOCKER.md`](file:///c:/project/starwaves/DOCKER.md).
- Global CORS & Exception Middleware: `server/app/main.py` features outer CORS middleware and exception wrapping ensuring proper `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`, and allowed header response headers across all HTTP endpoints, preflight `OPTIONS` requests, 4xx/500 status responses, and unhandled server exceptions for local development (`localhost`, `127.0.0.1`, Capacitor `capacitor://localhost`, custom ports) and production (`https://starwaves.susindran.in`, `https://*.susindran.in`, `https://*.vercel.app`).
- Email & Google OAuth single-account unification: automatic merging of duplicate account records in Firestore (`merge_duplicate_user_accounts`), seamless password attachment to Google OAuth accounts upon signup (`create_user_with_password`), and on-demand `/api/v1/auth/merge-accounts` endpoint.
- Android shell via Capacitor (`website/android/`).
- Vercel cron hookup: `vercel.json` configures serverless cron job `/api/v1/cron/execute-schedules` scheduled every 15 minutes (`*/15 * * * *`).
- Cinematic Landing Page: `LandingPage.jsx` redesigned as an immersive, scroll-driven storytelling experience with an animated star-field canvas (WebGL-style particles), IntersectionObserver-based scroll-reveal animations, animated number counters, staggered feature card entrances, a vertical timeline workflow, and a cinematic dark final CTA with radial spotlight gradient. All monochrome. Hero uses `margin-top: -72px` to bleed behind the semi-transparent nav.

## 7. Known limitations

- Global search navigates between pages but does not search workspace records.
- Calendar event creation/editing not implemented.
- Mail attachments, forwarding, rich-text composition, persistent drafts not
  implemented.
- Calls: signaling is polling-based (2s call poll, 3s incoming poll), so there
  is a short setup delay; calls use public STUN only, so peers behind strict
  symmetric NAT/firewalls may fail to connect until a TURN relay is added.
  Signaling message backlogs are bounded (see §6).
- Production frontend build emits a bundle-size advisory.

## 8. Verification commands

```text
# Frontend (from website/)
npm run lint        # Oxlint
npm run build       # Production build
npm test            # Vitest

# Backend (from server/)
python -m unittest discover tests

# Docker Stack (from repository root)
docker compose config              # Verify Compose file validity
docker compose up --build -d       # Build & launch containerized stack
curl -i http://localhost/health    # Verify Nginx reverse proxy & backend health
```
