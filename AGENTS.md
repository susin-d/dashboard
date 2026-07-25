# AGENTS.md

Instructions and guidelines for AI Coding Agents working in the **Starwaves** codebase.

> **CRITICAL MANDATE FOR ALL AI AGENTS:**
> Read this document thoroughly before writing, editing, or refactoring any code in this repository.

---

## 🛑 1. Core Principles & Communication

1. **Ask When in Doubt**:
   - Never guess user intent, business logic, API schemas, or ambiguous design decisions.
   - If a requirement is unclear or underspecified, **ask the user for clarification** before executing changes.

2. **Prohibition on Deleting Secrets**:
   - **NEVER** delete, clear, wipe, or remove secrets, API keys, credentials, `.env` files, service account JSON files, or sensitive environment variables under any circumstances.
   - If secret rotation or refactoring is required, request explicit user guidance.

3. **Respect System Architecture**:
   - **Frontend (`/website`)**: React 19 + Vite + Vanilla CSS (Monochrome Design System).
   - **Backend (`/server`)**: FastAPI (Python) + Firebase Firestore.

4. **Clean Code Principles**:
   - **DRY (Don't Repeat Yourself)**: Avoid code and style duplication. Extract reusable helper functions, hooks, and UI components instead of copying blocks of code.
   - **KISS (Keep It Simple, Stupid)**: Keep implementation simple, readable, and direct. Avoid premature optimization, over-engineering, or unnecessary abstractions.
   - **Single Responsibility Principle (SRP)**: Each component, module, or function should have a single, well-defined responsibility.
   - **Self-Documenting & Meaningful Naming**: Use clear, descriptive names for variables, functions, and files. Avoid cryptic abbreviations.
   - **No Dead Code**: Do not leave commented-out code, unused imports, or unused temporary variables in the codebase.
   - **Explicit Error Handling**: Handle errors gracefully and explicitly. Never swallow exceptions silently or return fake/dummy data to mask issues.
   - **No Magic Values**: Extract hardcoded magic numbers, string constants, and API URLs into named constants or configuration settings.
   - **Boy Scout Rule**: Always leave the codebase cleaner than you found it. Refactor small code smells encountered while working on a feature.



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
