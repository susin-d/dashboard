import lightTheme from '../styles/themes/index.css?raw'
import darkTheme from '../styles/themes/dark.css?raw'
import oledTheme from '../styles/themes/oled.css?raw'
import graphiteTheme from '../styles/themes/graphite.css?raw'
import charcoalTheme from '../styles/themes/charcoal.css?raw'
import fogTheme from '../styles/themes/fog.css?raw'
import silverTheme from '../styles/themes/silver.css?raw'
import stoneTheme from '../styles/themes/stone.css?raw'
import smokeTheme from '../styles/themes/smoke.css?raw'
import boneTheme from '../styles/themes/bone.css?raw'
import grayTheme from '../styles/themes/gray.css?raw'
import abyssTheme from '../styles/themes/abyss.css?raw'
import emberTheme from '../styles/themes/ember.css?raw'
import verdantTheme from '../styles/themes/verdant.css?raw'
import nocturneTheme from '../styles/themes/nocturne.css?raw'
import scarletTheme from '../styles/themes/scarlet.css?raw'
import aurumTheme from '../styles/themes/aurum.css?raw'
import coralTheme from '../styles/themes/coral.css?raw'
import honeyTheme from '../styles/themes/honey.css?raw'
import azureTheme from '../styles/themes/azure.css?raw'
import meadowTheme from '../styles/themes/meadow.css?raw'
import lilacTheme from '../styles/themes/lilac.css?raw'
import citrusTheme from '../styles/themes/citrus.css?raw'
import prismTheme from '../styles/themes/prism.css?raw'
import neonGridTheme from '../styles/themes/neon-grid.css?raw'
import botanicalTheme from '../styles/themes/botanical.css?raw'

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
  graphite: {
    id: 'graphite',
    mode: 'light',
    palette: 'mono',
    name: "Graphite Steel",
    description: "Cool industrial grey theme with gunmetal surfaces",
    colors: parseThemeColors(graphiteTheme),
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
  gray: {
    id: 'gray',
    mode: 'light',
    palette: 'mono',
    name: "Neutral Gray",
    description: "Balanced true-neutral gray theme with pure grayscale surfaces",
    colors: parseThemeColors(grayTheme),
  },
  abyss: {
    id: 'abyss',
    mode: 'dark',
    palette: 'duo',
    name: "Abyss Teal",
    description: "Deep abyss black with luminous cyan teal accent — true two-color duotone",
    colors: parseThemeColors(abyssTheme),
  },
  ember: {
    id: 'ember',
    mode: 'dark',
    palette: 'duo',
    name: "Ember Blaze",
    description: "Charred umber canvas with blazing tangerine accent — two-color warmth",
    colors: parseThemeColors(emberTheme),
  },
  verdant: {
    id: 'verdant',
    mode: 'dark',
    palette: 'duo',
    name: "Verdant Depth",
    description: "Forest obsidian base with emerald glow — polished two-color duo",
    colors: parseThemeColors(verdantTheme),
  },
  nocturne: {
    id: 'nocturne',
    mode: 'dark',
    palette: 'duo',
    name: "Nocturne Violet",
    description: "Ink plum darkness with electric violet lift — moody two-color",
    colors: parseThemeColors(nocturneTheme),
  },
  scarlet: {
    id: 'scarlet',
    mode: 'dark',
    palette: 'duo',
    name: "Scarlet Noir",
    description: "Noir burgundy gloom lit by crimson fire — bold two-color contrast",
    colors: parseThemeColors(scarletTheme),
  },
  aurum: {
    id: 'aurum',
    mode: 'dark',
    palette: 'duo',
    name: "Aurum Obsidian",
    description: "Graphite night veil brushed with gilded amber — luxurious two-color",
    colors: parseThemeColors(aurumTheme),
  },
  coral: {
    id: 'coral',
    mode: 'light',
    palette: 'duo',
    name: "Coral Dawn",
    description: "Warm seashell white blushed with coral rose — airy two-color light",
    colors: parseThemeColors(coralTheme),
  },
  honey: {
    id: 'honey',
    mode: 'light',
    palette: 'duo',
    name: "Honey Parchment",
    description: "Soft parchment glow kissed by honey amber — cozy two-color duo",
    colors: parseThemeColors(honeyTheme),
  },
  azure: {
    id: 'azure',
    mode: 'light',
    palette: 'duo',
    name: "Azure Ice",
    description: "Crisp ice-blue canvas pulsing with sky-blue accent — fresh two-color",
    colors: parseThemeColors(azureTheme),
  },
  meadow: {
    id: 'meadow',
    mode: 'light',
    palette: 'duo',
    name: "Meadow Fresh",
    description: "Airy mint-white meadow lifted by leaf green — natural two-color",
    colors: parseThemeColors(meadowTheme),
  },
  lilac: {
    id: 'lilac',
    mode: 'light',
    palette: 'duo',
    name: "Lilac Dream",
    description: "Lavender mist haze blooming with orchid purple — dreamy two-color",
    colors: parseThemeColors(lilacTheme),
  },
  citrus: {
    id: 'citrus',
    mode: 'light',
    palette: 'duo',
    name: "Citrus Zest",
    description: "Lemon cream sorbet sparked by zesty lime — citrus two-color pop",
    colors: parseThemeColors(citrusTheme),
  },
  prism: {
    id: 'prism',
    mode: 'light',
    palette: 'spectrum',
    name: "Prism Light",
    description: "Crisp light spectrum theme where every semantic role has a unique distinct hue",
    colors: parseThemeColors(prismTheme),
  },
  neonGrid: {
    id: 'neonGrid',
    mode: 'dark',
    palette: 'spectrum',
    name: "Neon Grid",
    description: "High-contrast dark cyber spectrum theme with distinct neon hues per role",
    colors: parseThemeColors(neonGridTheme),
  },
  botanical: {
    id: 'botanical',
    mode: 'dark',
    palette: 'spectrum',
    name: "Botanical Forest",
    description: "Deep forest dark spectrum theme with earthy botanical hues per role",
    colors: parseThemeColors(botanicalTheme),
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
    description: 'Curated duotone themes — each pairs a neutral canvas with one signature accent hue for a strict two-color identity.',
  },
  {
    id: 'spectrum',
    label: 'Spectrum',
    description: 'Each UI role owns a unique hue — no color is shared between two elements on screen.',
  },
]

export function getPresetsByPalette(paletteId) {
  return Object.values(THEME_PRESETS).filter((preset) => preset.palette === paletteId)
}

// Re-exported from the leaf module so existing import sites keep working.
// The startup path imports applyThemeVariables directly from
// './themeApplicator' to avoid pulling the preset CSS catalog.
export {
  applyThemeVariables,
  COLOR_VARIABLE_GROUPS,
  DENSITY_OPTIONS,
  ELEVATION_OPTIONS,
  FONT_OPTIONS,
  MOTION_OPTIONS,
  RADIUS_OPTIONS,
  resetThemeVariables,
} from './themeApplicator'
