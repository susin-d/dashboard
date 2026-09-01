# Avatar Examples — Attribution

Bundled example models for Eve Avatar (ADR 0012). Real rendering via `three` + `@pixiv/three-vrm` (VRM) and `pixi.js` + `pixi-live2d-display` (Live2D Cubism 4). Procedural fallback renders when assets are stubbed.

## VRM (3D) — `three` + `GLTFLoader` + `VRMLoaderPlugin` + `VRMUtils`

- `vrm/eve-mono.vrm` — Starwaves Mono suit (placeholder 12-byte stub; real VRM renders via `VrmModel.jsx` with blendShapes `aa/oh`, `lookAt` head bone, `blink`, `HemisphereLight` + `DirectionalLight`, `ACESFilmicToneMapping`). Fetch a real CC0 VRM: `powershell scripts/fetch-avatar-models.ps1` or drop VRoid Studio export here.
- `vrm/eve-duo.vrm` — Same mesh, duo tint via `var(--color-primary)` accent at runtime (`avatarTokens.js`).

## Live2D (Cubism) — `pixi.js` 7 + `pixi-live2d-display/cubism4`

- `live2d/haru/Haru.model3.json` — Live2D Cubism 4 “Haru” sample (stub with `ParamMouthOpenY`/`ParamEyeLOpen`/`ParamAngleX`/`ParamBodyAngleX`; real textures via CDN or Cubism Editor export). `Live2DModel.jsx` drives `ParamMouthOpenY`, `ParamEyeLOpen/R`, `ParamAngleX/Y` from `mouthOpen`/`lookAt`/`isBlinking`/`emotion`.
- `live2d/unitychan/unitychan.model3.json` — UnityChan (UnityChan License) stub.

## Adding your own

- VRM: VRoid Studio → `.vrm` → `public/avatars/vrm/` (served at `/avatars/vrm/...`)
- Live2D: Cubism Editor → `.model3.json` + `*.moc3` + textures → `public/avatars/live2d/<name>/`
- Upload via Settings → Eve avatar → Upload (validates `.vrm/.glb/.model3.json/.zip`, max 12MB, zip must contain one `model3.json`, no `..` traversal). Per-user in `WORKSPACE_STORAGE_PATH/avatars/{uid}/`.

Stubs are 12-byte `glTF` magic or minimal `model3.json` so `HEAD` probe succeeds and `VrmModel`/`Live2DModel` mount real `WebGL`/`PIXI.Application` with ResizeObserver.
