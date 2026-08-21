# AGENTS.md

Instructions and guidelines for AI Coding Agents working in the **Starwaves** codebase.

> **CRITICAL MANDATE FOR ALL AI AGENTS:**
> Read this document thoroughly before writing, editing, or refactoring any code in this repository.

---

## 🛑 1. Core Principles & Communication

1. **Maintain `context.md` as the Living Snapshot**:
   - `context.md` at the repository root is the authoritative **current state**
     of the codebase. Read it before starting any task; it may be more recent
     than stale assumptions.
   - After any change that alters the implementation — new routes, pages,
     components, repositories, services, scripts, dependencies, environment
     variables, features, or architecture — **update `context.md` to match** in
     the same change.
   - Update the **`Last updated`** date at the top of `context.md` whenever you
     modify it.
   - Remove or amend entries that are no longer true (features, routes, files,
     scripts, limitations). Never leave `context.md` describing the old state.

2. **Ask When in Doubt**:
   - Never guess user intent, business logic, API schemas, or ambiguous design decisions.
   - If a requirement is unclear or underspecified, **ask the user for clarification** before executing changes.

3. **Prohibition on Deleting Secrets**:
   - **NEVER** delete, clear, wipe, or remove secrets, API keys, credentials, `.env` files, service account JSON files, or sensitive environment variables under any circumstances.
   - If secret rotation or refactoring is required, request explicit user guidance.

4. **Respect System Architecture**:
   - **Frontend (`/website`)**: React 19 + Vite + Vanilla CSS (Monochrome Design System).
   - **Backend (`/server`)**: FastAPI (Python) + Firebase Firestore.

5. **Clean Code Principles**:
   - **DRY (Don't Repeat Yourself)**: Avoid code and style duplication. Extract reusable helper functions, hooks, and UI components instead of copying blocks of code.
   - **KISS (Keep It Simple, Stupid)**: Keep implementation simple, readable, and direct. Avoid premature optimization, over-engineering, or unnecessary abstractions.
   - **Single Responsibility Principle (SRP)**: Each component, module, or function should have a single, well-defined responsibility.
   - **Self-Documenting & Meaningful Naming**: Use clear, descriptive names for variables, functions, and files. Avoid cryptic abbreviations.
   - **No Dead Code**: Do not leave commented-out code, unused imports, or unused temporary variables in the codebase.
   - **Explicit Error Handling**: Handle errors gracefully and explicitly. Never swallow exceptions silently or return fake/dummy data to mask issues.
   - **No Magic Values**: Extract hardcoded magic numbers, string constants, and API URLs into named constants or configuration settings.
   - **Boy Scout Rule**: Always leave the codebase cleaner than you found it. Refactor small code smells encountered while working on a feature.

6. **One File = One Feature**:
   - Every file must represent **exactly one feature or one responsibility**. Do not mix unrelated features into a single file.
   - When a module grows beyond its feature, split it into a package where each sub-module owns one feature and the package `__init__.py` only re-exports a combined entry point (e.g. `router`, `__all__`).
   - Examples of valid feature groupings:
     - Backend route groups: `app/api/routes/auth/` → `oauth.py`, `credentials.py`, `password.py`, `account.py`, `combine.py`, plus a shared `_shared.py`.
     - Backend repositories: `app/repositories/` → `password.py`, `users.py`, `account_combine.py`, `account_deletion.py`, `jobs.py`, `projects.py`, `notifications.py`, `pagination.py`.
     - Frontend pages: a page's feature sections live under `website/src/pages/settings/` (e.g. `ProfileSection.jsx`, `GmailSection.jsx`), and the page shell only composes them.
   - Shared helpers may live in a `_shared.py` / `index.js` within the feature package so they are not duplicated across files.
   - Never create a "utils"/"misc" dumping ground for unrelated logic; route each helper to the feature that owns it.

7. **One Function = One Thing**:
   - Each function must do **one thing** and be named for that thing.
   - A function that branches on mode flags (e.g. `if (mode === 'reset') ... else ...`) or dispatches across unrelated behaviors must be split into dedicated handlers (e.g. `handleAuthSubmit` / `handleResetSubmit`).
   - A single dispatcher that routes to many unrelated operations (e.g. `confirmDisconnect` switching over 8 kinds) should be replaced by per-feature handlers that each live next to their feature.
   - If a function's name needs "and" to describe it, split it.

8. **Large File Refactor — Split Oversized Modules**:
   - Fix large files by splitting them into smaller, single-responsibility modules. No file should exceed ~400 lines (hard limit 500); anything larger is a candidate for immediate refactor.
   - When a file exceeds the limit, split it into a package where each sub-module owns one feature and the original path is preserved as a thin facade re-exporting the public API (e.g. `server/app/services/eve.py` → `server/app/services/eve/` with `constants.py`, `tools/`, `handlers/`, `chat.py` + `__init__.py`; `website/src/components/whatsapp/WhatsAppConversation.jsx` → `conversation/` with `utils.js`, `hooks/`, `Header.jsx`, `Feed.jsx`, `Bubble.jsx`, `Composer.jsx`, `Modals.jsx` + `index.jsx`).
   - Keep the original import path working via the facade so callers need no changes (e.g. `from app.services.eve import chat_with_eve` and `import { WhatsAppConversation } from '../components/whatsapp/WhatsAppConversation'` continue to work).
   - Each new module must itself satisfy **One File = One Feature** and **One Function = One Thing** and stay under the line limit. Prefer `constants.py`/`helpers.js`, per-domain `tools/` and `handlers/`, and dedicated hooks (`useWebRTC`, `useEveVoice`, `useProjectFilters`) over a catch-all `utils` file.
   - Verify after splitting with `npm run lint` / `npm run build` / `npm test` (frontend) and `python -m unittest discover tests` (backend) and update `context.md` to document the new package layout.



---

## 🎨 2. UI & Design System Rules

1. **Use Predefined UI Components**:
   - Always reuse existing UI components, design tokens, and CSS classes from the codebase instead of creating ad-hoc inline styles or duplicate UI wrappers.

2. **Strict Color Palette (Monochrome Only)**:
   - **ONLY Black & White** are allowed across the entire UI.
   - **Primary Palette**:
     - Pure/Dark Black: `#000000`, `#09090b`, `#121212`, `#18181b`
     - Pure/Off White: `#ffffff`, `#fafafa`, `#f4f4f5`
     - Grayscale Accents / Borders: `#27272a`, `#3f3f46`, `#71717a`, `#e4e4e7`
   - **PROHIBITED**: Standard colors such as red, blue, green, yellow, purple, gradient fills, or rainbow themes are strictly forbidden. State indicators (e.g., status badges, active states) must use high-contrast black/white or grays.

---

## ⚡ 3. Serverless & Background Worker Rules

1. **Vercel Cron Jobs for Serverless**:
   - In serverless environments (Vercel / Cloud Functions), long-running persistent daemon threads or background workers are not supported.
   - If adding or updating any background worker, scheduled task, queue processing, or periodic data fetching, you **MUST** create or update Vercel Cron Jobs in `vercel.json` targeting serverless API endpoints.
   
2. **Cron Job Configuration Template (`vercel.json`)**:
   ```json
   {
     "crons": [
       {
         "path": "/api/v1/cron/process-jobs",
         "schedule": "0 * * * *"
       }
     ]
   }
   ```
3. **Endpoint Security**:
   - Serverless cron endpoints must verify authorization (e.g. `CRON_SECRET` header checks) to prevent unauthorized execution.

---

## 🧪 4. Code Quality & Verification

1. **Verification Before Completion**:
   - Never declare success without running build/lint/test tools to verify correctness:
     - Frontend: `npm run lint` / `npm run build` in `/website`
     - Backend: verify Python syntax and test endpoints in `/server`
2. **Preserve Comments & API Contracts**:
   - Maintain existing docstrings, API response shapes, and file structure integrity.

3. **Always Push After Completion**:
   - When a task is completed (code verified, `context.md` updated, files
     staged/committed with a clear message), **push to the remote** so the
     repository stays in sync.
   - Run `git status`, `git add <intended files>`, `git commit`, then
     `git push` to the current branch's upstream. Never commit secrets or
     `.env` files, and never force-push.
   - If a push fails, report the exact error instead of silently leaving the
     remote behind.
