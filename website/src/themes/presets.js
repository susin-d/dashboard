import lightTheme from '../styles/themes/index.css?raw'
import darkTheme from '../styles/themes/dark.css?raw'
import oledTheme from '../styles/themes/oled.css?raw'
import midnightTheme from '../styles/themes/midnight.css?raw'
import emeraldTheme from '../styles/themes/emerald.css?raw'
import amberTheme from '../styles/themes/amber.css?raw'
import violetTheme from '../styles/themes/violet.css?raw'
import nordicTheme from '../styles/themes/nordic.css?raw'
import roseTheme from '../styles/themes/rose.css?raw'
import solarTheme from '../styles/themes/solar.css?raw'
import matrixTheme from '../styles/themes/matrix.css?raw'
import synthwaveTheme from '../styles/themes/synthwave.css?raw'
import candyTheme from '../styles/themes/candy.css?raw'
import oceanTheme from '../styles/themes/ocean.css?raw'
import duneTheme from '../styles/themes/dune.css?raw'
import graphiteTheme from '../styles/themes/graphite.css?raw'
import wineTheme from '../styles/themes/wine.css?raw'
import coffeeTheme from '../styles/themes/coffee.css?raw'
import arcticTheme from '../styles/themes/arctic.css?raw'
import forestTheme from '../styles/themes/forest.css?raw'
import tangerineTheme from '../styles/themes/tangerine.css?raw'
import charcoalTheme from '../styles/themes/charcoal.css?raw'
import fogTheme from '../styles/themes/fog.css?raw'
import silverTheme from '../styles/themes/silver.css?raw'
import stoneTheme from '../styles/themes/stone.css?raw'
import smokeTheme from '../styles/themes/smoke.css?raw'
import boneTheme from '../styles/themes/bone.css?raw'
import mintTheme from '../styles/themes/mint.css?raw'
import crimsonTheme from '../styles/themes/crimson.css?raw'
import indigoTheme from '../styles/themes/indigo.css?raw'
import petrolTheme from '../styles/themes/petrol.css?raw'
import plumTheme from '../styles/themes/plum.css?raw'
import sunsetTheme from '../styles/themes/sunset.css?raw'
import auroraTheme from '../styles/themes/aurora.css?raw'
import neonTheme from '../styles/themes/neon.css?raw'
import galaxyTheme from '../styles/themes/galaxy.css?raw'
import paradiseTheme from '../styles/themes/paradise.css?raw'
import festivalTheme from '../styles/themes/festival.css?raw'
import prismTheme from '../styles/themes/prism.css?raw'
import cosmicTheme from '../styles/themes/cosmic.css?raw'

function parseThemeColors(cssText) {
  const colors = {}
  const pattern = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g
  let match
  while ((match = pattern.exec(cssText)) !== null) {
    colors[`--${match[1]}`] = match[2].trim()
  }
  return colors
}

export const THEME_PRESETS = {
  light: {
    id: 'light',
    mode: 'light',
    palette: 'mono',
    name: "Default Light",
    description: "Clean monochrome off-white theme",
    colors: parseThemeColors(lightTheme),
  },
  dark: {
    id: 'dark',
    mode: 'dark',
    palette: 'mono',
    name: "Default Dark",
    description: "Sleek dark monochrome theme",
    colors: parseThemeColors(darkTheme),
  },
  oled: {
    id: 'oled',
    mode: 'dark',
    palette: 'mono',
    name: "OLED Pitch Black",
    description: "Ultra dark #000000 background for max contrast",
    colors: parseThemeColors(oledTheme),
  },
  midnight: {
    id: 'midnight',
    mode: 'dark',
    palette: 'tri',
    name: "Midnight Cobalt",
    description: "Deep navy background with blue highlights",
    colors: parseThemeColors(midnightTheme),
  },
  emerald: {
    id: 'emerald',
    mode: 'dark',
    palette: 'tri',
    name: "Emerald Cyber",
    description: "Dark forest background with emerald mint accents",
    colors: parseThemeColors(emeraldTheme),
  },
  amber: {
    id: 'amber',
    mode: 'dark',
    palette: 'tetra',
    name: "Cyberpunk Amber",
    description: "Warm obsidian background with amber gold glow",
    colors: parseThemeColors(amberTheme),
  },
  violet: {
    id: 'violet',
    mode: 'dark',
    palette: 'tri',
    name: "Violet Glow",
    description: "Deep violet dark theme with electric purple highlights",
    colors: parseThemeColors(violetTheme),
  },
  nordic: {
    id: 'nordic',
    mode: 'dark',
    palette: 'tri',
    name: "Nordic Frost",
    description: "Cool slate grey theme with icy arctic blue highlights",
    colors: parseThemeColors(nordicTheme),
  },
  rose: {
    id: 'rose',
    mode: 'dark',
    palette: 'duo',
    name: "Rose Obsidian",
    description: "Velvet dark theme with rose gold and crimson highlights",
    colors: parseThemeColors(roseTheme),
  },
  solar: {
    id: 'solar',
    mode: 'light',
    palette: 'duo',
    name: "Solar Parchment",
    description: "Warm sepia parchment theme with deep amber typography",
    colors: parseThemeColors(solarTheme),
  },
  matrix: {
    id: 'matrix',
    mode: 'dark',
    palette: 'duo',
    name: "Matrix Lime",
    description: "Deep terminal obsidian theme with electric matrix neon lime",
    colors: parseThemeColors(matrixTheme),
  },
  synthwave: {
    id: 'synthwave',
    mode: 'dark',
    palette: 'tetra',
    name: "Synthwave Sunset",
    description: "80s retro dark theme with glowing magenta and cyan accents",
    colors: parseThemeColors(synthwaveTheme),
  },
  candy: {
    id: 'candy',
    mode: 'light',
    palette: 'duo',
    name: "Candy Frost",
    description: "Soft pastel pink theme with rosy plum typography",
    colors: parseThemeColors(candyTheme),
  },
  ocean: {
    id: 'ocean',
    mode: 'dark',
    palette: 'tri',
    name: "Tidal Cyan",
    description: "Deep ocean dark theme with electric cyan highlights",
    colors: parseThemeColors(oceanTheme),
  },
  dune: {
    id: 'dune',
    mode: 'light',
    palette: 'duo',
    name: "Dune Gold",
    description: "Bright golden desert sand theme with rich honey accents",
    colors: parseThemeColors(duneTheme),
  },
  graphite: {
    id: 'graphite',
    mode: 'light',
    palette: 'mono',
    name: "Graphite Steel",
    description: "Cool industrial grey theme with gunmetal surfaces",
    colors: parseThemeColors(graphiteTheme),
  },
  wine: {
    id: 'wine',
    mode: 'dark',
    palette: 'duo',
    name: "Burgundy Noir",
    description: "Velvet dark wine theme with crimson berry highlights",
    colors: parseThemeColors(wineTheme),
  },
  coffee: {
    id: 'coffee',
    mode: 'dark',
    palette: 'duo',
    name: "Espresso Roast",
    description: "Warm roasted coffee theme with caramel highlights",
    colors: parseThemeColors(coffeeTheme),
  },
  arctic: {
    id: 'arctic',
    mode: 'light',
    palette: 'duo',
    name: "Arctic Ice",
    description: "Pale glacial ice theme with cool arctic blue highlights",
    colors: parseThemeColors(arcticTheme),
  },
  forest: {
    id: 'forest',
    mode: 'dark',
    palette: 'tri',
    name: "Forest Canopy",
    description: "Muted olive forest theme with mossy green highlights",
    colors: parseThemeColors(forestTheme),
  },
  tangerine: {
    id: 'tangerine',
    mode: 'light',
    palette: 'duo',
    name: "Tangerine Pop",
    description: "Zesty citrus theme with juicy tangerine highlights",
    colors: parseThemeColors(tangerineTheme),
  },
  charcoal: {
    id: 'charcoal',
    mode: 'dark',
    palette: 'mono',
    name: "Charcoal Ash",
    description: "Warm charcoal grey theme with soft ash highlights",
    colors: parseThemeColors(charcoalTheme),
  },
  fog: {
    id: 'fog',
    mode: 'light',
    palette: 'mono',
    name: "Fog Grey",
    description: "Cool light grey theme with soft misty surfaces",
    colors: parseThemeColors(fogTheme),
  },
  silver: {
    id: 'silver',
    mode: 'light',
    palette: 'mono',
    name: "Silver Mist",
    description: "Light silvery grey theme with a polished metal feel",
    colors: parseThemeColors(silverTheme),
  },
  stone: {
    id: 'stone',
    mode: 'light',
    palette: 'mono',
    name: "Stone Grey",
    description: "Warm neutral grey theme inspired by natural stone",
    colors: parseThemeColors(stoneTheme),
  },
  smoke: {
    id: 'smoke',
    mode: 'dark',
    palette: 'mono',
    name: "Smoke Grey",
    description: "Deep neutral grey theme with soft charcoal surfaces",
    colors: parseThemeColors(smokeTheme),
  },
  bone: {
    id: 'bone',
    mode: 'light',
    palette: 'mono',
    name: "Bone White",
    description: "Warm off-white theme with gentle ivory surfaces",
    colors: parseThemeColors(boneTheme),
  },
  mint: {
    id: 'mint',
    mode: 'light',
    palette: 'duo',
    name: "Mint Cream",
    description: "Light pastel green theme with a fresh mint accent",
    colors: parseThemeColors(mintTheme),
  },
  crimson: {
    id: 'crimson',
    mode: 'dark',
    palette: 'tri',
    name: "Crimson Tide",
    description: "Deep crimson theme with bold scarlet highlights",
    colors: parseThemeColors(crimsonTheme),
  },
  indigo: {
    id: 'indigo',
    mode: 'dark',
    palette: 'tri',
    name: "Indigo Night",
    description: "Deep indigo theme with electric violet-blue highlights",
    colors: parseThemeColors(indigoTheme),
  },
  petrol: {
    id: 'petrol',
    mode: 'dark',
    palette: 'tri',
    name: "Petrol Depth",
    description: "Dark petrol theme with cool teal highlights",
    colors: parseThemeColors(petrolTheme),
  },
  plum: {
    id: 'plum',
    mode: 'dark',
    palette: 'tri',
    name: "Plum Noir",
    description: "Deep plum theme with rosy mauve highlights",
    colors: parseThemeColors(plumTheme),
  },
  sunset: {
    id: 'sunset',
    mode: 'dark',
    palette: 'tetra',
    name: "Sunset Vibes",
    description: "Warm sunset theme with coral, orange, and peach tones",
    colors: parseThemeColors(sunsetTheme),
  },
  aurora: {
    id: 'aurora',
    mode: 'dark',
    palette: 'tetra',
    name: "Aurora Sky",
    description: "Northern lights theme with teal, green, and violet tones",
    colors: parseThemeColors(auroraTheme),
  },
  neon: {
    id: 'neon',
    mode: 'dark',
    palette: 'tetra',
    name: "Neon District",
    description: "Electric theme with cyan, magenta, and lime glow tones",
    colors: parseThemeColors(neonTheme),
  },
  galaxy: {
    id: 'galaxy',
    mode: 'dark',
    palette: 'tetra',
    name: "Galaxy Deep",
    description: "Deep space theme with indigo, violet, and magenta tones",
    colors: parseThemeColors(galaxyTheme),
  },
  paradise: {
    id: 'paradise',
    mode: 'dark',
    palette: 'tetra',
    name: "Tropical Paradise",
    description: "Lush theme with teal, coral, and sunshine yellow tones",
    colors: parseThemeColors(paradiseTheme),
  },
  festival: {
    id: 'festival',
    mode: 'dark',
    palette: 'tetra',
    name: "Festival Pop",
    description: "Celebratory theme with hot pink, gold, and violet tones",
    colors: parseThemeColors(festivalTheme),
  },
  prism: {
    id: 'prism',
    mode: 'dark',
    palette: 'tetra',
    name: "Prismatic",
    description: "Balanced theme with red, blue, and amber primary tones",
    colors: parseThemeColors(prismTheme),
  },
  cosmic: {
    id: 'cosmic',
    mode: 'dark',
    palette: 'tetra',
    name: "Cosmic Dust",
    description: "Nebula theme with violet, blue, and rose tones",
    colors: parseThemeColors(cosmicTheme),
  },
}

export const PALETTE_GROUPS = [
  {
    id: 'mono',
    label: 'Monochrome',
    description: 'Pure black, white, and grey themes built from a single tonal family.',
  },
  {
    id: 'duo',
    label: 'Two Color',
    description: 'A neutral or warm canvas with one signature accent hue.',
  },
  {
    id: 'tri',
    label: 'Tri Color',
    description: 'Deep colored bases layered with a contrasting accent tone.',
  },
  {
    id: 'tetra',
    label: 'Tetra Color',
    description: 'Vibrant multi-hue palettes combining three or more distinct colors.',
  },
]

export function getPresetsByPalette(paletteId) {
  return Object.values(THEME_PRESETS).filter((preset) => preset.palette === paletteId)
}

export const FONT_OPTIONS = [
  { id: 'inter', name: 'Inter (Default)', value: "'Inter', sans-serif" },
  { id: 'roboto', name: 'Roboto', value: "'Roboto', sans-serif" },
  { id: 'outfit', name: 'Outfit', value: "'Outfit', sans-serif" },
  { id: 'jakarta', name: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif" },
  { id: 'fira', name: 'Fira Code (Monospace)', value: "'Fira Code', monospace" },
  { id: 'system', name: 'System Default UI', value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
]

export const RADIUS_OPTIONS = [
  {
    id: 'sharp',
    name: 'Sharp (0px)',
    tokens: {
      '--radius-xs': '0px',
      '--radius-sm': '0px',
      '--radius-md': '0px',
      '--radius-lg': '0px',
      '--radius-xl': '0px',
    },
  },
  {
    id: 'subtle',
    name: 'Subtle (4px)',
    tokens: {
      '--radius-xs': '2px',
      '--radius-sm': '4px',
      '--radius-md': '6px',
      '--radius-lg': '8px',
      '--radius-xl': '10px',
    },
  },
  {
    id: 'modern',
    name: 'Modern Soft (9px)',
    tokens: {
      '--radius-xs': '4px',
      '--radius-sm': '6px',
      '--radius-md': '9px',
      '--radius-lg': '12px',
      '--radius-xl': '16px',
    },
  },
  {
    id: 'rounded',
    name: 'Rounded (16px)',
    tokens: {
      '--radius-xs': '6px',
      '--radius-sm': '10px',
      '--radius-md': '14px',
      '--radius-lg': '18px',
      '--radius-xl': '24px',
    },
  },
  {
    id: 'bubble',
    name: 'Curved Bubble (24px)',
    tokens: {
      '--radius-xs': '8px',
      '--radius-sm': '14px',
      '--radius-md': '20px',
      '--radius-lg': '28px',
      '--radius-xl': '36px',
    },
  },
]

export const DENSITY_OPTIONS = [
  {
    id: 'compact',
    name: 'Compact (Power User)',
    tokens: {
      '--layout-card-padding': '12px',
      '--layout-section-gap': '16px',
      '--layout-gutter': '16px',
    },
  },
  {
    id: 'default',
    name: 'Default Balanced',
    tokens: {
      '--layout-card-padding': 'clamp(16px, 1.8vw, 22px)',
      '--layout-section-gap': 'clamp(18px, 2.2vw, 28px)',
      '--layout-gutter': 'clamp(16px, 3vw, 40px)',
    },
  },
  {
    id: 'spacious',
    name: 'Spacious (Relaxed)',
    tokens: {
      '--layout-card-padding': '28px',
      '--layout-section-gap': '36px',
      '--layout-gutter': '48px',
    },
  },
]

export const ELEVATION_OPTIONS = [
  {
    id: 'flat',
    name: 'Flat Minimalist (No Shadows)',
    tokens: {
      '--shadow-sm': 'none',
      '--shadow-md': 'none',
      '--shadow-lg': 'none',
      '--shadow-surface': 'none',
    },
  },
  {
    id: 'subtle',
    name: 'Subtle Modern Elevation',
    tokens: {
      '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
      '--shadow-md': '0 4px 8px rgba(0, 0, 0, 0.06)',
      '--shadow-lg': '0 12px 30px rgba(0, 0, 0, 0.1)',
      '--shadow-surface': '0 2px 8px rgba(0, 0, 0, 0.05)',
    },
  },
  {
    id: 'deep',
    name: 'Deep 3D Floating Surfaces',
    tokens: {
      '--shadow-sm': '0 2px 6px rgba(0, 0, 0, 0.12)',
      '--shadow-md': '0 8px 24px rgba(0, 0, 0, 0.18)',
      '--shadow-lg': '0 25px 60px rgba(0, 0, 0, 0.28)',
      '--shadow-surface': '0 4px 18px rgba(0, 0, 0, 0.15)',
    },
  },
]

export const MOTION_OPTIONS = [
  {
    id: 'none',
    name: 'Instant (0ms)',
    tokens: {
      '--transition-fast': '0ms',
      '--transition-normal': '0ms',
      '--transition-slow': '0ms',
    },
  },
  {
    id: 'fast',
    name: 'Fast Snap (100ms)',
    tokens: {
      '--transition-fast': '80ms ease',
      '--transition-normal': '120ms ease',
      '--transition-slow': '180ms ease',
    },
  },
  {
    id: 'normal',
    name: 'Smooth Default (200ms)',
    tokens: {
      '--transition-fast': '140ms ease',
      '--transition-normal': '200ms ease',
      '--transition-slow': '300ms ease',
    },
  },
  {
    id: 'relaxed',
    name: 'Relaxed Fluid (350ms)',
    tokens: {
      '--transition-fast': '200ms ease',
      '--transition-normal': '350ms ease',
      '--transition-slow': '500ms ease',
    },
  },
]

export const COLOR_VARIABLE_GROUPS = [
  {
    title: 'Main & Surface Backgrounds',
    variables: [
      { key: '--bg-primary', label: 'Main Page Background' },
      { key: '--bg-secondary', label: 'Sidebar & Header Background' },
      { key: '--bg-tertiary', label: 'Sub-panel Background' },
      { key: '--bg-card', label: 'Card & Container Surface' },
      { key: '--bg-card-hover', label: 'Card Hover Background' },
      { key: '--bg-hover', label: 'Interactive Hover Background' },
      { key: '--bg-overlay', label: 'Modal & Popover Surface' },
    ],
  },
  {
    title: 'Text & Typography',
    variables: [
      { key: '--text-primary', label: 'Primary Heading & Body Text' },
      { key: '--text-secondary', label: 'Secondary / Subtitle Text' },
      { key: '--text-muted', label: 'Muted / Caption Text' },
      { key: '--text-inverse', label: 'Button & Inverted Text' },
    ],
  },
  {
    title: 'Buttons & Accents',
    variables: [
      { key: '--color-primary', label: 'Primary Button & Active Fill' },
      { key: '--color-primary-hover', label: 'Primary Button Hover Fill' },
      { key: '--color-primary-light', label: 'Primary Light Badge Tint' },
      { key: '--color-accent', label: 'Accent Highlight' },
    ],
  },
  {
    title: 'Borders & Lines',
    variables: [
      { key: '--border-color', label: 'Standard Component Border' },
      { key: '--border-light', label: 'Light Separator Line' },
      { key: '--border-heavy', label: 'High Contrast Border' },
      { key: '--border-focus', label: 'Active Input Focus Ring' },
    ],
  },
  {
    title: 'Scrollbars',
    variables: [
      { key: '--scrollbar-track', label: 'Scrollbar Track' },
      { key: '--scrollbar-thumb', label: 'Scrollbar Thumb' },
      { key: '--scrollbar-thumb-hover', label: 'Scrollbar Thumb Hover' },
    ],
  },
  {
    title: 'Status & Badges',
    variables: [
      { key: '--color-success', label: 'Success Tag / Indicator' },
      { key: '--color-warning', label: 'Warning Tag / Indicator' },
      { key: '--color-danger', label: 'Danger / Error Tag' },
      { key: '--color-purple', label: 'Special / Category Tag' },
    ],
  },
]

export function applyThemeVariables(data) {
  if (!data || typeof data !== 'object') return
  const root = document.documentElement

  // Apply colors
  if (data.colors && typeof data.colors === 'object') {
    Object.entries(data.colors).forEach(([property, value]) => {
      if (property.startsWith('--') && value) {
        root.style.setProperty(property, value)
      }
    })
  }

  // Apply Font
  if (data.fontFamily) {
    const fontOpt = FONT_OPTIONS.find((f) => f.id === data.fontFamily)
    if (fontOpt) {
      root.style.setProperty('--font-family', fontOpt.value)
    }
  }

  // Apply Radius
  if (data.radius) {
    const radOpt = RADIUS_OPTIONS.find((r) => r.id === data.radius)
    if (radOpt) {
      Object.entries(radOpt.tokens).forEach(([k, v]) => root.style.setProperty(k, v))
    }
  }

  // Apply Density
  if (data.density) {
    const denOpt = DENSITY_OPTIONS.find((d) => d.id === data.density)
    if (denOpt) {
      Object.entries(denOpt.tokens).forEach(([k, v]) => root.style.setProperty(k, v))
    }
  }

  // Apply Elevation
  if (data.elevation) {
    const elevOpt = ELEVATION_OPTIONS.find((e) => e.id === data.elevation)
    if (elevOpt) {
      Object.entries(elevOpt.tokens).forEach(([k, v]) => root.style.setProperty(k, v))
    }
  }

  // Apply Motion
  if (data.motion) {
    const motOpt = MOTION_OPTIONS.find((m) => m.id === data.motion)
    if (motOpt) {
      Object.entries(motOpt.tokens).forEach(([k, v]) => root.style.setProperty(k, v))
    }
  }
}

export function resetThemeVariables() {
  const root = document.documentElement
  COLOR_VARIABLE_GROUPS.forEach((group) => {
    group.variables.forEach((item) => {
      root.style.removeProperty(item.key)
    })
  })
  root.style.removeProperty('--font-family')
  if (RADIUS_OPTIONS[2].tokens) {
    Object.keys(RADIUS_OPTIONS[2].tokens).forEach((k) => root.style.removeProperty(k))
  }
  if (DENSITY_OPTIONS[1].tokens) {
    Object.keys(DENSITY_OPTIONS[1].tokens).forEach((k) => root.style.removeProperty(k))
  }
  if (ELEVATION_OPTIONS[1].tokens) {
    Object.keys(ELEVATION_OPTIONS[1].tokens).forEach((k) => root.style.removeProperty(k))
  }
  if (MOTION_OPTIONS[2].tokens) {
    Object.keys(MOTION_OPTIONS[2].tokens).forEach((k) => root.style.removeProperty(k))
  }
}
