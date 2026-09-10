# ADR 0051 — Large-file refactor via facaded packages (batch 1)

## Status

Accepted

- Date: 2026-09-10
- Deciders: refactor agent (user directive: all 20 oversized files, docs-only root move, commit first)
- Tags: `modularity`, `file-size`, `single-source-of-truth`, `frontend`, `backend`

## Context

`AGENTS.md` §3.3 caps files at ~400 lines (500 hard). Twenty frontend/backend files exceeded it (560–403 lines), plus root docs clutter (`colors.md`, `SPEECH_PROVIDERS.md`, `DEPLOY_GCP_VERCEL.md`, `DOCKER.md` loose) and missing ADR 0046 transport justifications in `updatesApi.js`. `REFACTOR_REPORT.md` had deferred `services/whatsapp.py` plus 19 frontend files as single-responsibility with visual-QA risk. Duplicate ADR numbers (0048×2, 0049×2) and concurrent prompts/logging work further dirtied the tree.

## Decision

- Chosen approach: extract pure helpers/hooks/sub-components into co-located packages, keeping the original import path as a thin composer. No prop/route/API contract changes; reuse `components/ui` primitives, tokens only, real data only.
- Completed batch 1 (10 files): `SceneViewport` 586→284 (`viewport/` utils/loaders/actions/loader-hook), `useEveVoice` 551→339 (`eve-voice/` playback/Browser-STT/server-STT), `App.jsx` 538→310 (`app/` publicShell/utils/effects), `EveComposer` 433→274 (`useEveAttachments`/`useEveDictation` + menu removal), `WorkspacePage` 431→293 (`workspace/WorkspaceDialogs`), `Live2DModel` 461→350 (`live2dLoaders`/`live2dFraming`), `VrmModel` 506→400 (`vrmLoaders`/`vrmFraming`/`vrmStage`/`VrmFallback`), `DocumentsPage` 443→390 (canonical `formatFileSize`, `documentConstants`, `useDocumentFilters`), `EveAssistantModal` 462→380 (menu deletion per directive), `EvePage` 471→397 (`useEveViewSync` + menu deletion).
- Infra in same line: root docs → `docs/`, `updatesApi.js` ADR 0046 exceptions, logging ADR 0050 renumbered, duplicate ADRs resolved.
- Per user directive (ADR 0049 amendment 2026-09-10): menu-text UI deleted instead of served — preset chips, starter greetings, `/`+`@` autocomplete menus, Studio suggestion cards removed from frontend; `GET /api/v1/prompts`, `schemas/prompts.py`, `lib/promptsApi.js`, UI-list sections of `prompts.py`, and orphaned CSS deleted. `services/prompts.py` stays canonical for backend-consumed prompts only; `website/src` holds zero prompt content (grep-verified).
- `services/whatsapp.py` (544) stays one class as a deliberate exception: single external-system responsibility per `REFACTOR_REPORT.md`; splitting its cross-called privates would add seams without removing duplication.
- Follow-up batch 2 (10 files, needs visual QA): `EveVoiceSection:493`, `WhatsAppPage:483`, `DashboardPage:471`, `ThemesPage:458`, `HackathonsPage:449`, `ModelingStudioWorkspace:437`, `Header:433`, `AdvancedSearchModal:431`, `ChatsPage:417`, `ProjectDetailPage:414` (EveAssistantModal + EvePage now under limit after menu deletion + view-sync split).

## Consequences

- **Positive:** 10 files under limit with facades intact; `npm run lint` warnings-only, `npm run build` passes, prompts/logging tests pass; no demo/mock/temp-fix gates tripped; menu-text grep gate clean (`website/src` holds zero prompt content).
- **Negative / Cost:** 11 pages remain over limit until visual QA; fresh Eve chats open empty and Studio hero loses suggestion cards per user directive (typing plain text unaffected — backend never parsed `@`/`/`).
- **Follow-up:** batch 2 splits page-by-page with screenshots at desktop/mobile + light/dark.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Split all 20 in one change | Visual-QA risk across 11 pages; rushing breaks shell/avatar/call flows. Phased batches keep build green. |
| Split `whatsapp.py` despite report | Cross-called privates (`_ensure_eve_chat`, `_sync`, `_handle_eve_response`) would force circular imports; single-system responsibility wins. |
| Serve menu text via `/prompts` instead of deleting | User explicitly directed removal ("remove them"); serving keeps a fetch + loading state for static menu copy with no runtime consumer. Deleted per amended ADR 0049. |

## References

- `website/src/pages/avatar-studio/viewport/`, `website/src/hooks/call/eve-voice/`, `website/src/app/`
- `website/src/components/eve/avatar/vrm{Loaders,Framing,Stage,Fallback}.js*`, `live2d{Loaders,Framing}.js`
- `server/app/services/prompts.py` (ADR 0049, backend-only canonical)
- `REFACTOR_REPORT.md` (deferral rationale + Follow-up 2 removal note), `ARCHITECTURE.md` §5 canonicals
