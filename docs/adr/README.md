# Architecture Decision Records (ADRs)

> Living index of architectural decisions for **Starwaves**. See `AGENTS.md` §1.7 for the mandate and `_template.md` for the template.

## Rules

- Location: `docs/adr/NNNN-kebab-case-title.md` (zero-padded, sequential, never reuse numbers).
- Template: `_template.md` (Status, Context, Decision, Consequences, Alternatives).
- Commit: ADR must be in the **same commit** as the code it justifies.
- Lifecycle: `Proposed → Accepted → Superseded/Deprecated` — update `Status` in-place and cross-link replacement.

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](0001-no-sub-agents-context-first-adr-required.md) | No sub-agents, context.md first, ADRs required | Accepted | 2026-08-30 |
| [0002](0002-fix-eve-tool-calling-adapter.md) | Fix Eve tool calling for OpenAI-compatible providers and add Groq | Accepted | 2026-08-30 |
| [0003](0003-build-scripts-android-tauri.md) | Build scripts for Android (Capacitor) + Desktop EXE (Tauri) | Accepted | 2026-08-31 |
| [0004](0004-backend-hosted-auto-update.md) | Backend-hosted auto-update (Tauri signed + APK sideload + OTA) | Accepted | 2026-08-31 |
| [0005](0005-ai-provider-hardening-universal-openai.md) | AI provider hardening: universal OpenAI default + adapter fixes | Accepted | 2026-08-31 |
| [0006](0006-canonical-domain-starwaves-susindran-in.md) | Canonical domain starwaves.susindran.in + api.starwaves.susindran.in | Accepted | 2026-08-31 |
| [0007](0007-differentiated-ai-error-messages.md) | Differentiated AI provider error messages (rate limit vs other) | Accepted | 2026-08-31 |
| [0008](0008-oauth-deep-link-mobile-auth.md) | OAuth deep-link for native + mobile login layout | Accepted | 2026-08-31 |
| [0009](0009-ui-ux-design-system-and-routing-hardening.md) | UI/UX design system and routing hardening (modal dedup, delete redirect, navigateWorkspace, LoadingState, CustomDropdown search, inline style cleanup) | Accepted | 2026-09-01 |
| [0010](0010-glassmorphism-design-system.md) | Glassmorphism design system — frosted-glass tokens, background mesh, 12 surface categories, reduced-motion support | Accepted | 2026-09-01 |
| [0011](0011-spectrum-color-role-system.md) | Spectrum color role system — per-element unique hue assignment replacing monochrome rule; light/dark/stone preserved | Accepted | 2026-09-01 |

## How to add a new ADR

1. Copy `_template.md` to `NNNN-kebab-case-title.md` where `NNNN` is next integer.
2. Fill Status/Context/Decision/Consequences/Alternatives (300–500 words).
3. Add one-line entry to the Index table above.
4. Commit ADR with the code change it justifies; update `context.md` `Last updated` one-liner.

## Context loading

- Tier 0: `opencode.json` preloads `AGENTS.md` + `PROJECT_MAP.md`.
- Tier 1: `PROJECT_MAP.md` for navigation.
- Tier 2: `context.md` for cross-cutting / infra state.
- Tier 3: `Grep` (with `include`) + `Read` targeted files. No `Glob **/*` scans.
- Never use sub-agents — execute directly in the primary session (AGENTS.md §1.6).
