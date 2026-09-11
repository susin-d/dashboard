# ADR 0053 — Dashboard overview aggregate endpoint

## Status

Accepted

- Date: 2026-09-11
- Deciders: @starwaves
- Tags: `backend`, `performance`, `workspace`, `dashboard`

## Context

`/app/dashboard` fires 11 parallel `GET`s on every visit (`auth/me`, `ui/preferences`, `gcal/data`, `documents`, `todos`, `jobs?limit=20`, `hackathons?limit=20`, `notifications?limit=20`, `contests?limit=20`, `projects?limit=20`, `github/data`). `DashboardPage.jsx` only renders `slice(0,3)` per widget, so `limit=20` over-fetches 6x. The slowest integration (`github/data` 20kB/2.9s) blocks the `projects` widget merge in `useWorkspaceData.js`. Existing mitigations (stagger `0-600ms`, `request.js` concurrency 6, GET cache `30s`, `CustomUI` 4s debounce) reduce bursts but keep 7 workspace round-trips + 7 `OPTIONS` preflights on the critical path. Precedent `workspace/calendar.py /calendar-data` proves aggregation works, but uses legacy raw collection reads.

## Decision

- Add `GET /api/v1/dashboard-overview?limit=3` (default 3, `1-20`) returning `{jobs,projects,hackathons,notifications,contests,todos,documents}` each as `PageResponse {items,next_cursor,has_more}`.
- New `services/workspace_overview.py:get_dashboard_overview(database,user_id,limit)` orchestrates via canonical repositories (`JobRepository`, `ProjectRepository`, `NotificationRepository`, `todos.list_todos_page`, `documents.list_documents_page`) + `hackathon_sources.fetch_enabled_hackathons` + `contests` fetchers, parallel via `asyncio.gather(to_thread(...))`. No FastAPI imports in service.
- Thin route `api/routes/workspace/overview.py` with `@cached(ttl=30,prefix="workspace:overview")`, DI `CurrentUser`/`DbClient` via `get_current_user`/`get_firestore`, `core/errors.py` for validation.
- Invalidation: `workspace/_shared.py:invalidate_workspace_overview(user_id)` called alongside existing per-entity invalidators on every mutation.
- Frontend `lib/workspaceApi/overview.js:loadDashboardOverview(limit)` via `apiRequest`; `useWorkspaceData.js` dashboard branch uses it with granular `allSettled` fallback. Integrations (`github/gcal`) idle-deferred off critical path.
- Scope: `todos+documents` included as paged; `auth/me`, `ui/preferences`, `github/gcal` excluded V1.

## Consequences

- **Positive:** Dashboard critical path 7→1 workspace request; payload ~5kB vs ~35kB; TTI <1s on cache hit; preserves list-page `limit=20` contracts; per-user cache prevents leaks.
- **Negative / Cost:** Slowest repo dictates overview latency; 30s staleness window after mutation unless invalidated; extra endpoint to maintain.
- **Follow-up:** Consider including `gcal/github` summaries; per-widget `limit` tuning; E2E TTI measurement.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Frontend-only `limit=3` + defer | Still 7 round-trips + preflights; halves bytes not requests. |
| Raise concurrency 6→12 / remove stagger | Worsens `nginx 10r/s burst 60` e2-micro herd; papers over N+1. |
| GraphQL / POST batch | New transport violates ADR 0046 (`apiRequest` canonical). |
| Do nothing | Leaves 2.9s GitHub block + 11-request waterfall. |

## References

- `website/src/hooks/useWorkspaceData.js:170-248`
- `website/src/pages/DashboardPage.jsx:293-392`
- `server/app/api/routes/workspace/calendar.py:15`
- `server/app/core/cache.py:197`
- `server/app/repositories/pagination.py:25`
