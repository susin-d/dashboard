# Avatar Examples — Attribution

Bundled example models are placeholders for the Eve Avatar system (ADR 0012). Replace with your own CC0-licensed assets before production.

## VRM (3D)

- `vrm/eve-mono.vrm` — Placeholder for Starwaves Mono suit. Intended CC0. Current repo ships without binary; `EveAvatar` fallback renders procedural monochrome avatar when file missing (no 404 break). To add a real VRM: drop CC0 VRM here (e.g. VRoid Studio export, CC0).
- `vrm/eve-duo.vrm` — Same mesh, duo tint variant (accent via `var(--color-primary)` at runtime).

## Live2D (Cubism)

- `live2d/haru/Haru.model3.json` — Live2D Cubism 4 sample “Haru” (Live2D Inc. free sample, recolored monochrome). See https://www.live2d.com/en/ for sample license. Not for redistribution with proprietary edits — replace with your own Cubism model for production.
- `live2d/unitychan/unitychan.model3.json` — UnityChan (Unity Technologies Japan, UnityChan License). Example only.

## Adding your own

- VRM: export from VRoid Studio → `.vrm` → `public/avatars/vrm/`
- Live2D: export from Cubism Editor → `.model3.json` + `*.moc3` + textures → `public/avatars/live2d/<name>/`
- Upload via Settings → Eve avatar → Upload (validates `.vrm/.glb/.model3.json/.zip`, max 12MB, zip must contain one `model3.json`, no `..` traversal).

All uploads are per-user in `WORKSPACE_STORAGE_PATH/avatars/{uid}/` and served via `/avatars/{uid}/...` (or fallback base64 JSON upload API).
