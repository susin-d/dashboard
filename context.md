# Starwaves Context

Living project snapshot for AI agents. `AGENTS.md` holds the permanent rules;
this file holds the **current state** of the codebase and must be kept up to
date whenever the implementation changes.

> **Last updated:** 2026-08-12

---

## 1. Project overview

StarWaves is a personal productivity workspace that brings projects, job
applications, tasks, documents, calendars, email, hackathons, competitive
programming, and an AI assistant into one dashboard.

- **Frontend** (`/website`): React 19 + Vite + Vanilla CSS (monochrome design system).
- **Backend** (`/server`): FastAPI (Python) + Firebase Firestore.
- **Auth**: Firebase Authentication; serverless deployment targets Vercel.

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
│   └── templates/email/     Email HTML templates
└── vercel.json              Serverless rewrites
```

## 3. Backend (FastAPI)

- **App factory**: `server/app/main.py` → `create_app()` (CORS + `/api/v1` router).
- **Route registry**: `server/app/api/router.py` includes all top-level routers.
- **Prefix**: `/api/v1` (see `server/app/core/config.py`).
- **Auth**: Firebase ID tokens via `server/app/core/auth.py`.

### Route groups

| Group | Router module | Notes |
| --- | --- | --- |
| Auth | `app/api/routes/auth/` | `oauth`, `credentials`, `password`, `account`, `combine` |
| Workspace | `app/api/routes/workspace/` | `jobs`, `hackathons`, `projects`, `notifications`, `contests`, `calendar` |
| Integrations | `google_calendar`, `google_drive`, `gmail`, `github`, `google_chat` | OAuth callbacks under `/integrations/*/callback` |
| Features | `documents`, `todos`, `profiles`, `notifications`, `email`, `eve` | EVE = AI assistant |
| Coding | `coding_stats`, `competitive_coding_profile` | Contests + profile stats |
| Misc | `health` | `/api/v1/health` |

### Repositories (`server/app/repositories/`)

`password`, `users`, `account_combine`, `account_deletion`, `jobs`, `projects`,
`notifications`, `pagination`, `documents`, `profiles`, `todos`, `eve`,
`eve_sessions`.

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
  `useThemeCustomizer`, `useWorkspaceData`, `usePersistentState`,
  `useLocalNotifications`, `useDialogAccessibility`.
- **API clients** (`src/lib/`): one per backend feature (`todosApi`,
  `workspaceApi`, `gmailApi`, `googleCalendar`, `googleDriveApi`, `eveApi`,
  `emailApi`, `githubApi`, `googleChatApi`, `codingStatsApi`,
  `competitiveCodingProfileApi`, `documentsApi`, `notificationsApi`), plus
  shared `request.js`, `firebase.js`, `authApi.js`, `index.js`.
- **Utils** (`src/utils/`): `browserNotifications`, `calendarEvents`,
  `calendarReminders`, `icsParser`, `popupOAuth`.
- **Pages** (`src/pages/`): Dashboard, Projects, ProjectDetail, Jobs,
  Hackathons, HackathonDetail, Todo, Documents, DocumentOpener, Mails,
  Calendar, Chats, CompetitiveCoding, Stats, Eve, Settings, Themes, Profile,
  Onboarding, Auth, Landing, TermsOfService, PrivacyPolicy.
- **Utilities** (`src/utils/`): `projectLifecycle` (phase pipeline + helpers),
  `browserNotifications`, `calendarEvents`, `calendarReminders`, `icsParser`,
  `popupOAuth`.
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
- Project lifecycle phases: `idea → design → build → test → ship → maintain`
  pipeline stored as `lifecycle_phase` on each project. Phase stepper +
  phase dots on the Project Detail page (`ProjectLifecycleCard.jsx`), phase
  select in add/edit forms, and advancing a phase auto-syncs `status`
  (build/test → "Active", ship/maintain → "Completed").
- Integrations: GitHub, Google Calendar, Google Drive, Gmail, Google Chat.
- Competitive programming: contests + profile stats.
- Hackathon discovery with configurable sources + manual entry.
- Notifications: calendar-derived reminders + push notifications, read/delete.
- EVE AI assistant (OpenAI) with sessions.
- Email: templated emails (welcome, verification, password reset, reminders,
  activity digest, announcement, security alert, account combine invite).
- Android shell via Capacitor (`website/android/`).
- Vercel cron hookup: `vercel.json` currently contains only SPA rewrites; no
  cron jobs registered yet.

## 7. Known limitations

- Global search navigates between pages but does not search workspace records.
- Calendar event creation/editing not implemented.
- Mail attachments, forwarding, rich-text composition, persistent drafts not
  implemented.
- Production frontend build emits a bundle-size advisory.

## 8. Verification commands

```text
# Frontend (from website/)
npm run lint        # Oxlint
npm run build       # Production build
npm test            # Vitest

# Backend (from server/)
python -m unittest discover tests
```
