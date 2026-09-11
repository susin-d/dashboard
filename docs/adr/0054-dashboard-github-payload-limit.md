# ADR 0054 — Limit GitHub repository payload on the dashboard

## Status

Accepted

- Date: 2026-09-11
- Deciders: Starwaves maintainers
- Tags: `performance`, `dashboard`, `github`

## Context

The dashboard loaded the full GitHub repository collection through
`/integrations/github/data`, even though it renders only three repository
cards. The GraphQL query requested up to 100 repositories per page and the
API returned every repository node, making the dashboard response one of the
largest startup requests and increasing GitHub latency.

## Decision

- Add a bounded `repository_limit` query parameter to the GitHub data route.
- Request three repositories from the dashboard and the full list from the
  Projects and Stats pages.
- Skip contribution-history fields on the dashboard request; those fields are
  only needed by Stats.
- Query GitHub `totalCount` separately from returned nodes so aggregate
  statistics remain accurate when the dashboard receives only three nodes.
- Cache identical GitHub responses server-side for 60 seconds.
- Keep the response contract unchanged for callers that omit the parameter;
  the default remains 100.

## Consequences

- **Positive:** Dashboard GitHub payloads and GraphQL work are reduced to the
  visible repository set and exclude contribution history; repeated requests
  are served from a short-lived cache and repository counts remain correct.
- **Negative / Cost:** Projects and Stats still fetch the full repository list
  when those pages need complete repository data.
- **Follow-up:** Add a server-side short-lived GitHub data cache if provider
  latency remains noticeable after payload reduction.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Remove GitHub repositories from the response | Breaks GitHub-backed project cards. |
| Fetch all repositories and slice only in React | Leaves network size and latency unchanged. |
| Create a separate dashboard endpoint | Duplicates the GitHub summary contract unnecessarily. |

## References

- `server/app/services/github.py`
- `server/app/api/routes/github.py`
- `website/src/hooks/useWorkspaceData.js`
