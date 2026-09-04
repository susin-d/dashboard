// Single source of truth for Eve avatar — tokens, limits, catalog.
export const AVATAR_STORAGE_KEY = 'starwaves:eve-avatar:v1'
export const AVATAR_BC_CHANNEL = 'starwaves-avatar'
export const AVATAR_CACHE_KEY = 'starwaves.ui.cache'

export const AVATAR_EMOTIONS = ['idle', 'listening', 'thinking', 'speaking', 'tool', 'error']

export const AVATAR_RENDERERS = {
  AUTO: 'auto',
  VRM: 'vrm',
  LIVE2D: 'live2d',
}

export const AVATAR_MOTION = {
  AUTO: 'auto',
  ON: 'on',
  REDUCED: 'reduced',
}

export const AVATAR_LIMITS = {
  SCALE_MIN: 0.8,
  SCALE_MAX: 1.2,
  ZOOM_MIN: 0.5,
  ZOOM_MAX: 2.0,
  UPLOAD_MAX_BYTES: 12 * 1024 * 1024,
  SINGLE_MAX_BYTES: 8 * 1024 * 1024,
  LOAD_TIMEOUT_MS: 8000,
  POSITION_MIN: 0,
  POSITION_MAX: 100,
}

export const AVATAR_DEFAULTS = {
  enabled: true,
  renderer: AVATAR_RENDERERS.AUTO,
  modelId: 'procedural-light',
  scale: 1,
  zoom: 1,
  autoRotate: false,
  position: { x: 92, y: 88 },
  docked: true,
  motion: AVATAR_MOTION.AUTO,
  inlineEnabled: true,
  orbFallback: true,
}

export const ALLOWED_EXTS = ['.vrm', '.glb', '.gltf', '.model3.json', '.zip']

// Bundled — lightweight procedural default + heavy anime opt-in
export const AVATAR_CATALOG = [
  {
    id: 'procedural-light',
    label: 'Procedural (Lightweight)',
    renderer: AVATAR_RENDERERS.VRM,
    url: null,
    thumb: null,
    attribution: 'Procedural CSS avatar — 0 bytes, never crashes, always available',
    tags: ['procedural', 'lightweight', 'default'],
  },
  {
    id: 'eve-anime-vrm',
    label: 'Eve Anime (VRM 10MB)',
    renderer: AVATAR_RENDERERS.VRM,
    url: '/avatars/vrm/eve-anime.vrm',
    thumb: '/avatars/vrm/eve-anime-thumb.jpg',
    attribution: 'Anime VRM — VRM1 Constraint Twist Sample (pixiv/three-vrm, CC0) 10.3MB — click to load',
    tags: ['anime', 'vrm', 'heavy'],
  },
  {
    id: 'eve-mono-vrm',
    label: 'Eve Mono (VRM)',
    renderer: AVATAR_RENDERERS.VRM,
    url: '/avatars/vrm/eve-anime.vrm',
    thumb: '/avatars/vrm/eve-mono-thumb.jpg',
    attribution: 'Same anime VRM (mono tint via CSS) — deduplicated to eve-anime.vrm 10.3MB',
    tags: ['mono', 'vrm', 'example'],
  },
  {
    id: 'eve-duo-vrm',
    label: 'Eve Duo (VRM)',
    renderer: AVATAR_RENDERERS.VRM,
    url: '/avatars/vrm/eve-anime.vrm',
    thumb: '/avatars/vrm/eve-duo-thumb.jpg',
    attribution: 'Same anime VRM (duo tint via var(--color-primary)) — deduplicated',
    tags: ['duo', 'vrm', 'example'],
  },
  {
    id: 'haru-greeter-live2d',
    label: 'Haru Greeter (Live2D Anime)',
    renderer: AVATAR_RENDERERS.LIVE2D,
    url: '/avatars/live2d/haru/haru_greeter_t03.model3.json',
    thumb: '/avatars/live2d/haru/thumb.jpg',
    attribution: 'Live2D Cubism 4 Haru Greeter (pixi-live2d-display, 0.37MB moc3 + 2.7MB textures) — real anime',
    tags: ['anime', 'live2d', 'default'],
  },
  {
    id: 'haru-live2d',
    label: 'Haru (Live2D stub)',
    renderer: AVATAR_RENDERERS.LIVE2D,
    url: '/avatars/live2d/haru/Haru.model3.json',
    thumb: '/avatars/live2d/haru/thumb.jpg',
    attribution: 'Stub — prefers haru_greeter_t03; fallback if textures missing',
    tags: ['live2d', 'example'],
  },
  {
    id: 'unitychan-live2d',
    label: 'Unitychan (Live2D)',
    renderer: AVATAR_RENDERERS.LIVE2D,
    url: '/avatars/live2d/unitychan/unitychan.model3.json',
    thumb: '/avatars/live2d/unitychan/thumb.jpg',
    attribution: 'UnityChan License — example only',
    tags: ['live2d', 'example'],
  },
]

export function findModel(modelId) {
  return AVATAR_CATALOG.find((m) => m.id === modelId) || AVATAR_CATALOG[0]
}

export function isVrmUrl(url) {
  return typeof url === 'string' && url.toLowerCase().endsWith('.vrm')
}

export function isLive2DUrl(url) {
  return typeof url === 'string' && url.toLowerCase().endsWith('.model3.json')
}

export function clampScale(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return AVATAR_DEFAULTS.scale
  return Math.min(AVATAR_LIMITS.SCALE_MAX, Math.max(AVATAR_LIMITS.SCALE_MIN, n))
}

export function clampPosition(pos) {
  const x = Math.min(100, Math.max(0, Number(pos?.x ?? AVATAR_DEFAULTS.position.x)))
  const y = Math.min(100, Math.max(0, Number(pos?.y ?? AVATAR_DEFAULTS.position.y)))
  return { x, y }
}

export function clampZoom(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return AVATAR_DEFAULTS.zoom
  return Math.min(AVATAR_LIMITS.ZOOM_MAX, Math.max(AVATAR_LIMITS.ZOOM_MIN, n))
}
