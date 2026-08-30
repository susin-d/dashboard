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
