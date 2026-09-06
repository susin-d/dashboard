# ADR 0027 — App IA Regroup (Phase 0)

## Status

Proposed — group regroup applied; route merges below need sign-off

- Date: 2026-09-06
- Deciders: user (pending merge approval)
- Tags: `frontend`, `ia`, `navigation`

## Context

The sidebar showed 29 items in 6 legacy groups (Work, Studio, Eve AI, Growth, Communication, Account) that no longer match the product story (Code · Create · Evolve). Findings from the route inventory (`App.jsx` `pages` map + `config/navigation.js`): Eve AI occupies 6 nav entries for what is mostly one page (`EvePage` with `activeSubpage` chat/sessions/memory/call/schedules + `AvatarPage`); `competitive-coding` and `stats` overlap on contest ratings; `chats` vs Eve chat vs WhatsApp is three messaging surfaces with unclear boundaries; `studio-apps`/`studio-templates` are sub-views promoted to top level; detail routes (project/hackathon/document/studio-detail) are correctly hidden already.

## Decision

Applied now (display-only, zero routing change — ids are frozen contracts, sidebar sections derive from array order):

- Groups regrouped to Home (dashboard) · Code (workspace, projects, documents, todo) · Create (studio, apps, templates, jobs, hackathons) · Evolve (eve ×5 subpages, avatar, competitive-coding, stats) · Connect (calendar, mails, whatsapp, chats, calls, contacts) · You (profile, themes, setting, usage).
- `GROUP_MODULE_MAP` repointed (Home/Code→work, Create→studio, Evolve→eve, Connect→comm, You→account); per-item `module` accents untouched, so no CSS changes.
- Label `Chat`→`Eve` (it collided with `Chats`); search badges and page eyebrows realigned to the new group names.
- Scope: `config/navigation.js`, `config/search/pages.js` + `evePages.js` badges, 6 eyebrow lines. No route, id, or behavior change.

## Consequences

- **Positive:** sidebar tells the Code/Create/Evolve story today; Eve/Connect disambiguation starts; search palette consistent.
- **Negative / Cost:** Evolve is heavy (9 entries) until Eve collapses to tabs; group rename touches badges/eyebrows that rebuild waves will revisit anyway.
- **Follow-up:** needs sign-off — see pending merges.

## Pending sign-off (do NOT implement yet)

| Merge | Change | Needs |
|-------|--------|-------|
| Eve subpages → tabs | `eve`, `eve-sessions`, `eve-memory`, `eve-call`, `eve-schedules` become one `eve` entry with in-page tabs; old ids redirect | Eve rebuild wave (D) |
| Compete page | `competitive-coding` + `stats` merge into one `compete` surface (contests + ratings tabs); old ids redirect | Wave A/C boundary |
| Chats3 | Clarify `chats` vs Eve chat vs WhatsApp (merge, retitle, or scope note) | Wave E |
| Studio children | `studio-apps`/`studio-templates` demote to tabs under `studio` with redirects | Wave C |

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Regroup + merge in one commit | Merges change deep links and need explicit approval; regroup is safely reversible |
| Keep legacy groups through rebuild | Waves would cement the old story into new UI; IA must lead, not follow |

## References

- `website/src/config/navigation.js:1`
- `website/src/App.jsx:376` (`pages` map)
- `website/src/components/Sidebar.jsx:17` (dynamic grouping)
