import { useEffect, useState, useCallback } from 'react'

export const THEME_PRESETS = {
  light: {
    id: 'light',
    mode: 'light',
    name: 'Default Light',
    description: 'Clean monochrome off-white theme',
    colors: {
      '--bg-primary': '#f4f4f5',
      '--bg-secondary': '#ececec',
      '--bg-tertiary': '#e4e4e7',
      '--bg-card': '#fafafa',
      '--bg-card-hover': '#f0f0f2',
      '--bg-hover': '#e4e4e7',
      '--bg-overlay': '#fafafa',
      '--text-primary': '#09090b',
      '--text-secondary': '#52525b',
      '--text-muted': '#71717a',
      '--text-inverse': '#f4f4f5',
      '--color-primary': '#18181b',
      '--color-primary-hover': '#09090b',
      '--color-primary-light': '#e4e4e7',
      '--color-accent': '#18181b',
      '--border-color': '#e4e4e7',
      '--border-light': '#ececec',
      '--border-heavy': '#a1a1aa',
      '--border-focus': '#71717a',
      '--scrollbar-track': '#e4e4e7',
      '--scrollbar-thumb': '#a1a1aa',
      '--scrollbar-thumb-hover': '#18181b',
      '--color-success': '#18181b',
      '--color-warning': '#71717a',
      '--color-danger': '#18181b',
      '--color-purple': '#71717a',
    },
  },
  dark: {
    id: 'dark',
    mode: 'dark',
    name: 'Default Dark',
    description: 'Sleek dark monochrome theme',
    colors: {
      '--bg-primary': '#080808',
      '--bg-secondary': '#121212',
      '--bg-tertiary': '#1a1a1a',
      '--bg-card': '#141414',
      '--bg-card-hover': '#1f1f1f',
      '--bg-hover': '#222222',
      '--bg-overlay': '#141414',
      '--text-primary': '#e4e4e7',
      '--text-secondary': '#a1a1aa',
      '--text-muted': '#71717a',
      '--text-inverse': '#09090b',
      '--color-primary': '#f4f4f5',
      '--color-primary-hover': '#ffffff',
      '--color-primary-light': '#222222',
      '--color-accent': '#f4f4f5',
      '--border-color': '#27272a',
      '--border-light': '#1e1e1e',
      '--border-heavy': '#3f3f46',
      '--border-focus': '#71717a',
      '--scrollbar-track': '#141414',
      '--scrollbar-thumb': '#52525b',
      '--scrollbar-thumb-hover': '#a1a1aa',
      '--color-success': '#f4f4f5',
      '--color-warning': '#a1a1aa',
      '--color-danger': '#f4f4f5',
      '--color-purple': '#a1a1aa',
    },
  },
  oled: {
    id: 'oled',
    mode: 'dark',
    name: 'OLED Pitch Black',
    description: 'Ultra dark #000000 background for max contrast',
    colors: {
      '--bg-primary': '#000000',
      '--bg-secondary': '#050505',
      '--bg-tertiary': '#0d0d0d',
      '--bg-card': '#0a0a0a',
      '--bg-card-hover': '#141414',
      '--bg-hover': '#181818',
      '--bg-overlay': '#0a0a0a',
      '--text-primary': '#ffffff',
      '--text-secondary': '#b0b0b8',
      '--text-muted': '#757580',
      '--text-inverse': '#000000',
      '--color-primary': '#ffffff',
      '--color-primary-hover': '#e6e6e6',
      '--color-primary-light': '#1f1f1f',
      '--color-accent': '#ffffff',
      '--border-color': '#222226',
      '--border-light': '#17171a',
      '--border-heavy': '#44444c',
      '--border-focus': '#888896',
      '--scrollbar-track': '#050505',
      '--scrollbar-thumb': '#44444c',
      '--scrollbar-thumb-hover': '#888896',
      '--color-success': '#ffffff',
      '--color-warning': '#aaaaaa',
      '--color-danger': '#ffffff',
      '--color-purple': '#cccccc',
    },
  },
  midnight: {
    id: 'midnight',
    mode: 'dark',
    name: 'Midnight Cobalt',
    description: 'Deep navy background with blue highlights',
    colors: {
      '--bg-primary': '#0a0f1d',
      '--bg-secondary': '#0e162a',
      '--bg-tertiary': '#14203a',
      '--bg-card': '#11192e',
      '--bg-card-hover': '#182442',
      '--bg-hover': '#1e2d50',
      '--bg-overlay': '#11192e',
      '--text-primary': '#f0f6ff',
      '--text-secondary': '#93c5fd',
      '--text-muted': '#60a5fa',
      '--text-inverse': '#0a0f1d',
      '--color-primary': '#3b82f6',
      '--color-primary-hover': '#2563eb',
      '--color-primary-light': '#1e3a8a',
      '--color-accent': '#60a5fa',
      '--border-color': '#1e293b',
      '--border-light': '#172033',
      '--border-heavy': '#334155',
      '--border-focus': '#3b82f6',
      '--scrollbar-track': '#0e162a',
      '--scrollbar-thumb': '#334155',
      '--scrollbar-thumb-hover': '#3b82f6',
      '--color-success': '#10b981',
      '--color-warning': '#f59e0b',
      '--color-danger': '#ef4444',
      '--color-purple': '#8b5cf6',
    },
  },
  emerald: {
    id: 'emerald',
    mode: 'dark',
    name: 'Emerald Cyber',
    description: 'Dark forest background with emerald mint accents',
    colors: {
      '--bg-primary': '#091410',
      '--bg-secondary': '#0f1d18',
      '--bg-tertiary': '#162922',
      '--bg-card': '#12221c',
      '--bg-card-hover': '#1a3028',
      '--bg-hover': '#224035',
      '--bg-overlay': '#12221c',
      '--text-primary': '#ecfdf5',
      '--text-secondary': '#a7f3d0',
      '--text-muted': '#6ee7b7',
      '--text-inverse': '#091410',
      '--color-primary': '#10b981',
      '--color-primary-hover': '#059669',
      '--color-primary-light': '#064e3b',
      '--color-accent': '#34d399',
      '--border-color': '#14382c',
      '--border-light': '#0f2920',
      '--border-heavy': '#1f4d3d',
      '--border-focus': '#10b981',
      '--scrollbar-track': '#0f1d18',
      '--scrollbar-thumb': '#1f4d3d',
      '--scrollbar-thumb-hover': '#10b981',
      '--color-success': '#10b981',
      '--color-warning': '#f59e0b',
      '--color-danger': '#f43f5e',
      '--color-purple': '#a855f7',
    },
  },
  amber: {
    id: 'amber',
    mode: 'dark',
    name: 'Cyberpunk Amber',
    description: 'Warm obsidian background with amber gold glow',
    colors: {
      '--bg-primary': '#14110c',
      '--bg-secondary': '#1c1913',
      '--bg-tertiary': '#26221a',
      '--bg-card': '#1f1b14',
      '--bg-card-hover': '#2a251c',
      '--bg-hover': '#363024',
      '--bg-overlay': '#1f1b14',
      '--text-primary': '#fffbeb',
      '--text-secondary': '#fde68a',
      '--text-muted': '#fcd34d',
      '--text-inverse': '#14110c',
      '--color-primary': '#f59e0b',
      '--color-primary-hover': '#d97706',
      '--color-primary-light': '#78350f',
      '--color-accent': '#fbbf24',
      '--border-color': '#3a3123',
      '--border-light': '#292218',
      '--border-heavy': '#544733',
      '--border-focus': '#f59e0b',
      '--scrollbar-track': '#1c1913',
      '--scrollbar-thumb': '#544733',
      '--scrollbar-thumb-hover': '#f59e0b',
      '--color-success': '#22c55e',
      '--color-warning': '#f59e0b',
      '--color-danger': '#ef4444',
      '--color-purple': '#d946ef',
    },
  },
  violet: {
    id: 'violet',
    mode: 'dark',
    name: 'Violet Glow',
    description: 'Deep violet dark theme with electric purple highlights',
    colors: {
      '--bg-primary': '#110d1c',
      '--bg-secondary': '#171226',
      '--bg-tertiary': '#211a36',
      '--bg-card': '#1a142b',
      '--bg-card-hover': '#241c3c',
      '--bg-hover': '#30264e',
      '--bg-overlay': '#1a142b',
      '--text-primary': '#f5f3ff',
      '--text-secondary': '#ddd6fe',
      '--text-muted': '#c4b5fd',
      '--text-inverse': '#110d1c',
      '--color-primary': '#8b5cf6',
      '--color-primary-hover': '#7c3aed',
      '--color-primary-light': '#4c1d95',
      '--color-accent': '#a78bfa',
      '--border-color': '#2e234a',
      '--border-light': '#211936',
      '--border-heavy': '#43346c',
      '--border-focus': '#8b5cf6',
      '--scrollbar-track': '#171226',
      '--scrollbar-thumb': '#43346c',
      '--scrollbar-thumb-hover': '#8b5cf6',
      '--color-success': '#10b981',
      '--color-warning': '#f59e0b',
      '--color-danger': '#f43f5e',
      '--color-purple': '#8b5cf6',
    },
  },
  nordic: {
    id: 'nordic',
    mode: 'dark',
    name: 'Nordic Frost',
    description: 'Cool slate grey theme with icy arctic blue highlights',
    colors: {
      '--bg-primary': '#0f172a',
      '--bg-secondary': '#1e293b',
      '--bg-tertiary': '#334155',
      '--bg-card': '#1e293b',
      '--bg-card-hover': '#334155',
      '--bg-hover': '#475569',
      '--bg-overlay': '#1e293b',
      '--text-primary': '#f8fafc',
      '--text-secondary': '#cbd5e1',
      '--text-muted': '#94a3b8',
      '--text-inverse': '#0f172a',
      '--color-primary': '#38bdf8',
      '--color-primary-hover': '#0ea5e9',
      '--color-primary-light': '#0c4a6e',
      '--color-accent': '#7dd3fc',
      '--border-color': '#334155',
      '--border-light': '#1e293b',
      '--border-heavy': '#475569',
      '--border-focus': '#38bdf8',
      '--scrollbar-track': '#1e293b',
      '--scrollbar-thumb': '#475569',
      '--scrollbar-thumb-hover': '#38bdf8',
      '--color-success': '#34d399',
      '--color-warning': '#fbbf24',
      '--color-danger': '#f87171',
      '--color-purple': '#c084fc',
    },
  },
  rose: {
    id: 'rose',
    mode: 'dark',
    name: 'Rose Obsidian',
    description: 'Velvet dark theme with rose gold and crimson highlights',
    colors: {
      '--bg-primary': '#140b10',
      '--bg-secondary': '#1f1118',
      '--bg-tertiary': '#2b1822',
      '--bg-card': '#22121b',
      '--bg-card-hover': '#2e1925',
      '--bg-hover': '#3c2131',
      '--bg-overlay': '#22121b',
      '--text-primary': '#fff1f2',
      '--text-secondary': '#fecdd3',
      '--text-muted': '#fda4af',
      '--text-inverse': '#140b10',
      '--color-primary': '#f43f5e',
      '--color-primary-hover': '#e11d48',
      '--color-primary-light': '#881337',
      '--color-accent': '#fb7185',
      '--border-color': '#3a1d2d',
      '--border-light': '#291420',
      '--border-heavy': '#50263e',
      '--border-focus': '#f43f5e',
      '--scrollbar-track': '#1f1118',
      '--scrollbar-thumb': '#50263e',
      '--scrollbar-thumb-hover': '#f43f5e',
      '--color-success': '#10b981',
      '--color-warning': '#f59e0b',
      '--color-danger': '#f43f5e',
      '--color-purple': '#e879f9',
    },
  },
  solar: {
    id: 'solar',
    mode: 'light',
    name: 'Solar Parchment',
    description: 'Warm sepia parchment theme with deep amber typography',
    colors: {
      '--bg-primary': '#fbf7ee',
      '--bg-secondary': '#f3edd9',
      '--bg-tertiary': '#e8dfc4',
      '--bg-card': '#f6f0df',
      '--bg-card-hover': '#ede5cd',
      '--bg-hover': '#e2d7ba',
      '--bg-overlay': '#f6f0df',
      '--text-primary': '#2d241e',
      '--text-secondary': '#5c4d41',
      '--text-muted': '#8c7b6d',
      '--text-inverse': '#fbf7ee',
      '--color-primary': '#b45309',
      '--color-primary-hover': '#92400e',
      '--color-primary-light': '#fef3c7',
      '--color-accent': '#d97706',
      '--border-color': '#e2d5b8',
      '--border-light': '#ece1c8',
      '--border-heavy': '#c7b693',
      '--border-focus': '#b45309',
      '--scrollbar-track': '#f3edd9',
      '--scrollbar-thumb': '#c7b693',
      '--scrollbar-thumb-hover': '#b45309',
      '--color-success': '#15803d',
      '--color-warning': '#b45309',
      '--color-danger': '#b91c1c',
      '--color-purple': '#7e22ce',
    },
  },
  matrix: {
    id: 'matrix',
    mode: 'dark',
    name: 'Matrix Lime',
    description: 'Deep terminal obsidian theme with electric matrix neon lime',
    colors: {
      '--bg-primary': '#080f0a',
      '--bg-secondary': '#0d1911',
      '--bg-tertiary': '#14261a',
      '--bg-card': '#102015',
      '--bg-card-hover': '#172c1e',
      '--bg-hover': '#1f3b28',
      '--bg-overlay': '#102015',
      '--text-primary': '#f7fee7',
      '--text-secondary': '#bef264',
      '--text-muted': '#84cc16',
      '--text-inverse': '#080f0a',
      '--color-primary': '#84cc16',
      '--color-primary-hover': '#65a30d',
      '--color-primary-light': '#1a2e05',
      '--color-accent': '#a3e635',
      '--border-color': '#1e3a24',
      '--border-light': '#152919',
      '--border-heavy': '#2d5635',
      '--border-focus': '#84cc16',
      '--scrollbar-track': '#0d1911',
      '--scrollbar-thumb': '#2d5635',
      '--scrollbar-thumb-hover': '#84cc16',
      '--color-success': '#84cc16',
      '--color-warning': '#eab308',
      '--color-danger': '#ef4444',
      '--color-purple': '#a855f7',
    },
  },
  synthwave: {
    id: 'synthwave',
    mode: 'dark',
    name: 'Synthwave Sunset',
    description: '80s retro dark theme with glowing magenta and cyan accents',
    colors: {
      '--bg-primary': '#120824',
      '--bg-secondary': '#1a0c33',
      '--bg-tertiary': '#251247',
      '--bg-card': '#1d0d3a',
      '--bg-card-hover': '#28134e',
      '--bg-hover': '#361a69',
      '--bg-overlay': '#1d0d3a',
      '--text-primary': '#fdf4ff',
      '--text-secondary': '#f5d0fe',
      '--text-muted': '#f0abfc',
      '--text-inverse': '#120824',
      '--color-primary': '#ec4899',
      '--color-primary-hover': '#db2777',
      '--color-primary-light': '#701a75',
      '--color-accent': '#06b6d4',
      '--border-color': '#3c1968',
      '--border-light': '#291147',
      '--border-heavy': '#572496',
      '--border-focus': '#ec4899',
      '--scrollbar-track': '#1a0c33',
      '--scrollbar-thumb': '#572496',
      '--scrollbar-thumb-hover': '#ec4899',
      '--color-success': '#10b981',
      '--color-warning': '#f59e0b',
      '--color-danger': '#f43f5e',
      '--color-purple': '#d946ef',
    },
  },
  candy: {
    id: 'candy',
    mode: 'light',
    name: 'Candy Frost',
    description: 'Soft pastel pink theme with rosy plum typography',
    colors: {
      '--bg-primary': '#fdf6f7',
      '--bg-secondary': '#f9ecee',
      '--bg-tertiary': '#f3dde2',
      '--bg-card': '#fffafb',
      '--bg-card-hover': '#f9eef0',
      '--bg-hover': '#f3dde2',
      '--bg-overlay': '#fffafb',
      '--text-primary': '#3a2328',
      '--text-secondary': '#7d5b63',
      '--text-muted': '#a1848c',
      '--text-inverse': '#fffafb',
      '--color-primary': '#d6336c',
      '--color-primary-hover': '#b4255a',
      '--color-primary-light': '#fbe0e8',
      '--color-accent': '#ec4899',
      '--border-color': '#f1d8de',
      '--border-light': '#f7e6ea',
      '--border-heavy': '#d9b0bc',
      '--border-focus': '#d6336c',
      '--scrollbar-track': '#f9ecee',
      '--scrollbar-thumb': '#d9b0bc',
      '--scrollbar-thumb-hover': '#d6336c',
      '--color-success': '#2f9e64',
      '--color-warning': '#c2410c',
      '--color-danger': '#c41e2f',
      '--color-purple': '#7c3aed',
    },
  },
  ocean: {
    id: 'ocean',
    mode: 'dark',
    name: 'Tidal Cyan',
    description: 'Deep ocean dark theme with electric cyan highlights',
    colors: {
      '--bg-primary': '#08131a',
      '--bg-secondary': '#0d1d26',
      '--bg-tertiary': '#142a36',
      '--bg-card': '#0f202a',
      '--bg-card-hover': '#162d3a',
      '--bg-hover': '#1c3a4a',
      '--bg-overlay': '#0f202a',
      '--text-primary': '#ecfeff',
      '--text-secondary': '#a5f3fc',
      '--text-muted': '#67e8f9',
      '--text-inverse': '#08131a',
      '--color-primary': '#22d3ee',
      '--color-primary-hover': '#06b6d4',
      '--color-primary-light': '#164e63',
      '--color-accent': '#67e8f9',
      '--border-color': '#1c3a4a',
      '--border-light': '#142a36',
      '--border-heavy': '#2a5568',
      '--border-focus': '#22d3ee',
      '--scrollbar-track': '#0d1d26',
      '--scrollbar-thumb': '#2a5568',
      '--scrollbar-thumb-hover': '#22d3ee',
      '--color-success': '#10b981',
      '--color-warning': '#f59e0b',
      '--color-danger': '#f43f5e',
      '--color-purple': '#818cf8',
    },
  },
  dune: {
    id: 'dune',
    mode: 'light',
    name: 'Dune Gold',
    description: 'Bright golden desert sand theme with rich honey accents',
    colors: {
      '--bg-primary': '#faf6ee',
      '--bg-secondary': '#f4ecdd',
      '--bg-tertiary': '#eadfc8',
      '--bg-card': '#fdf9f1',
      '--bg-card-hover': '#f3ecdc',
      '--bg-hover': '#e6d9bd',
      '--bg-overlay': '#fdf9f1',
      '--text-primary': '#43331f',
      '--text-secondary': '#7c6847',
      '--text-muted': '#a18a63',
      '--text-inverse': '#fdf9f1',
      '--color-primary': '#a16207',
      '--color-primary-hover': '#854d0e',
      '--color-primary-light': '#fef3c7',
      '--color-accent': '#ca8a04',
      '--border-color': '#e6d9bd',
      '--border-light': '#efe6d2',
      '--border-heavy': '#c9b489',
      '--border-focus': '#a16207',
      '--scrollbar-track': '#f4ecdd',
      '--scrollbar-thumb': '#c9b489',
      '--scrollbar-thumb-hover': '#a16207',
      '--color-success': '#15803d',
      '--color-warning': '#a16207',
      '--color-danger': '#b91c1c',
      '--color-purple': '#7e22ce',
    },
  },
  graphite: {
    id: 'graphite',
    mode: 'light',
    name: 'Graphite Steel',
    description: 'Cool industrial grey theme with gunmetal surfaces',
    colors: {
      '--bg-primary': '#f2f3f5',
      '--bg-secondary': '#e8eaee',
      '--bg-tertiary': '#dde0e6',
      '--bg-card': '#f8f9fb',
      '--bg-card-hover': '#eef0f4',
      '--bg-hover': '#dde0e6',
      '--bg-overlay': '#f8f9fb',
      '--text-primary': '#1c2126',
      '--text-secondary': '#4b5560',
      '--text-muted': '#6b7680',
      '--text-inverse': '#f8f9fb',
      '--color-primary': '#23272d',
      '--color-primary-hover': '#111418',
      '--color-primary-light': '#e4e7eb',
      '--color-accent': '#4b5560',
      '--border-color': '#dde0e6',
      '--border-light': '#e6e9ee',
      '--border-heavy': '#aab2bd',
      '--border-focus': '#4b5560',
      '--scrollbar-track': '#e8eaee',
      '--scrollbar-thumb': '#aab2bd',
      '--scrollbar-thumb-hover': '#23272d',
      '--color-success': '#1f6f50',
      '--color-warning': '#9a6a00',
      '--color-danger': '#b91c1c',
      '--color-purple': '#6d5bb8',
    },
  },
  wine: {
    id: 'wine',
    mode: 'dark',
    name: 'Burgundy Noir',
    description: 'Velvet dark wine theme with crimson berry highlights',
    colors: {
      '--bg-primary': '#14070d',
      '--bg-secondary': '#1d0c15',
      '--bg-tertiary': '#2a1120',
      '--bg-card': '#200e18',
      '--bg-card-hover': '#2a1420',
      '--bg-hover': '#361a2b',
      '--bg-overlay': '#200e18',
      '--text-primary': '#fdf2f5',
      '--text-secondary': '#e7b8c3',
      '--text-muted': '#c98a9a',
      '--text-inverse': '#14070d',
      '--color-primary': '#b8405a',
      '--color-primary-hover': '#9c2f49',
      '--color-primary-light': '#4a1526',
      '--color-accent': '#d45d78',
      '--border-color': '#3a1826',
      '--border-light': '#2a101d',
      '--border-heavy': '#5a2338',
      '--border-focus': '#b8405a',
      '--scrollbar-track': '#1d0c15',
      '--scrollbar-thumb': '#5a2338',
      '--scrollbar-thumb-hover': '#b8405a',
      '--color-success': '#2f9e64',
      '--color-warning': '#c47f1d',
      '--color-danger': '#c41e2f',
      '--color-purple': '#9b6bb5',
    },
  },
  coffee: {
    id: 'coffee',
    mode: 'dark',
    name: 'Espresso Roast',
    description: 'Warm roasted coffee theme with caramel highlights',
    colors: {
      '--bg-primary': '#120e0b',
      '--bg-secondary': '#1a1410',
      '--bg-tertiary': '#241c15',
      '--bg-card': '#1d1612',
      '--bg-card-hover': '#281e17',
      '--bg-hover': '#33261c',
      '--bg-overlay': '#1d1612',
      '--text-primary': '#f7f0e7',
      '--text-secondary': '#d4c1a8',
      '--text-muted': '#b09574',
      '--text-inverse': '#120e0b',
      '--color-primary': '#a3713d',
      '--color-primary-hover': '#8a5b2e',
      '--color-primary-light': '#3b2a19',
      '--color-accent': '#c08a52',
      '--border-color': '#35281d',
      '--border-light': '#261c14',
      '--border-heavy': '#4f3a28',
      '--border-focus': '#a3713d',
      '--scrollbar-track': '#1a1410',
      '--scrollbar-thumb': '#4f3a28',
      '--scrollbar-thumb-hover': '#a3713d',
      '--color-success': '#4c9e62',
      '--color-warning': '#c47f1d',
      '--color-danger': '#c4451e',
      '--color-purple': '#9b6bb5',
    },
  },
  arctic: {
    id: 'arctic',
    mode: 'light',
    name: 'Arctic Ice',
    description: 'Pale glacial ice theme with cool arctic blue highlights',
    colors: {
      '--bg-primary': '#f4f8fb',
      '--bg-secondary': '#e9f0f6',
      '--bg-tertiary': '#dbe7f0',
      '--bg-card': '#fafcfe',
      '--bg-card-hover': '#eef4f9',
      '--bg-hover': '#dbe7f0',
      '--bg-overlay': '#fafcfe',
      '--text-primary': '#1f3a4d',
      '--text-secondary': '#4f7086',
      '--text-muted': '#7590a3',
      '--text-inverse': '#fafcfe',
      '--color-primary': '#0e7490',
      '--color-primary-hover': '#155e75',
      '--color-primary-light': '#cbeaf5',
      '--color-accent': '#0891b2',
      '--border-color': '#dbe7f0',
      '--border-light': '#e6eef5',
      '--border-heavy': '#b3c8d6',
      '--border-focus': '#0e7490',
      '--scrollbar-track': '#e9f0f6',
      '--scrollbar-thumb': '#b3c8d6',
      '--scrollbar-thumb-hover': '#0e7490',
      '--color-success': '#1f7a5a',
      '--color-warning': '#a16207',
      '--color-danger': '#b91c1c',
      '--color-purple': '#6d5bb8',
    },
  },
  forest: {
    id: 'forest',
    mode: 'dark',
    name: 'Forest Canopy',
    description: 'Muted olive forest theme with mossy green highlights',
    colors: {
      '--bg-primary': '#0c120e',
      '--bg-secondary': '#121a14',
      '--bg-tertiary': '#1a251c',
      '--bg-card': '#151f18',
      '--bg-card-hover': '#1c2a21',
      '--bg-hover': '#243527',
      '--bg-overlay': '#151f18',
      '--text-primary': '#f0f7f0',
      '--text-secondary': '#bfd3c2',
      '--text-muted': '#97ad9b',
      '--text-inverse': '#0c120e',
      '--color-primary': '#4e7c58',
      '--color-primary-hover': '#3d6446',
      '--color-primary-light': '#203220',
      '--color-accent': '#6da075',
      '--border-color': '#223021',
      '--border-light': '#1a241b',
      '--border-heavy': '#3a5338',
      '--border-focus': '#4e7c58',
      '--scrollbar-track': '#121a14',
      '--scrollbar-thumb': '#3a5338',
      '--scrollbar-thumb-hover': '#4e7c58',
      '--color-success': '#2f9e64',
      '--color-warning': '#b9951d',
      '--color-danger': '#c4451e',
      '--color-purple': '#8a7cc0',
    },
  },
  tangerine: {
    id: 'tangerine',
    mode: 'light',
    name: 'Tangerine Pop',
    description: 'Zesty citrus theme with juicy tangerine highlights',
    colors: {
      '--bg-primary': '#fef8f2',
      '--bg-secondary': '#fdf0e3',
      '--bg-tertiary': '#f9e2cd',
      '--bg-card': '#fffbf6',
      '--bg-card-hover': '#fdf2e7',
      '--bg-hover': '#f7ddc2',
      '--bg-overlay': '#fffbf6',
      '--text-primary': '#4a2a14',
      '--text-secondary': '#8a5a33',
      '--text-muted': '#b07e52',
      '--text-inverse': '#fffbf6',
      '--color-primary': '#ea580c',
      '--color-primary-hover': '#c2410c',
      '--color-primary-light': '#ffedd5',
      '--color-accent': '#f97316',
      '--border-color': '#f5dcc2',
      '--border-light': '#f9e8d4',
      '--border-heavy': '#e0b48d',
      '--border-focus': '#ea580c',
      '--scrollbar-track': '#fdf0e3',
      '--scrollbar-thumb': '#e0b48d',
      '--scrollbar-thumb-hover': '#ea580c',
      '--color-success': '#2f9e64',
      '--color-warning': '#c2410c',
      '--color-danger': '#c41e2f',
      '--color-purple': '#7c3aed',
    },
  },
  charcoal: {
    id: 'charcoal',
    mode: 'dark',
    name: 'Charcoal Ash',
    description: 'Warm charcoal grey theme with soft ash highlights',
    colors: {
      '--bg-primary': '#131316',
      '--bg-secondary': '#1a1a1f',
      '--bg-tertiary': '#232329',
      '--bg-card': '#1c1c21',
      '--bg-card-hover': '#26262c',
      '--bg-hover': '#303038',
      '--bg-overlay': '#1c1c21',
      '--text-primary': '#f0f0f2',
      '--text-secondary': '#b4b4ba',
      '--text-muted': '#82828c',
      '--text-inverse': '#131316',
      '--color-primary': '#e8e8ea',
      '--color-primary-hover': '#ffffff',
      '--color-primary-light': '#2c2c33',
      '--color-accent': '#c9c9cf',
      '--border-color': '#2c2c33',
      '--border-light': '#212127',
      '--border-heavy': '#45454f',
      '--border-focus': '#82828c',
      '--scrollbar-track': '#1a1a1f',
      '--scrollbar-thumb': '#45454f',
      '--scrollbar-thumb-hover': '#82828c',
      '--color-success': '#e8e8ea',
      '--color-warning': '#a1a1a9',
      '--color-danger': '#e8e8ea',
      '--color-purple': '#b4b4ba',
    },
  },
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

const STORAGE_KEY = 'starwaves.custom_theme'

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

export function useThemeCustomizer() {
  const [themeState, setThemeState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          preset: parsed.preset || 'custom',
          colors: parsed.colors || THEME_PRESETS.dark.colors,
          fontFamily: parsed.fontFamily || 'inter',
          radius: parsed.radius || 'modern',
          density: parsed.density || 'default',
          elevation: parsed.elevation || 'subtle',
          motion: parsed.motion || 'normal',
        }
      } catch {
        /* fallback */
      }
    }
    const isDark = localStorage.getItem('starwaves.theme') === 'dark'
    return {
      preset: isDark ? 'dark' : 'light',
      colors: THEME_PRESETS[isDark ? 'dark' : 'light'].colors,
      fontFamily: 'inter',
      radius: 'modern',
      density: 'default',
      elevation: 'subtle',
      motion: 'normal',
    }
  })

  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    applyThemeVariables(themeState)
  }, [themeState])

  const selectPreset = useCallback((presetId) => {
    const preset = THEME_PRESETS[presetId]
    if (!preset) return
    const isDarkPreset = preset.mode === 'dark'
    const nextState = {
      ...themeState,
      preset: presetId,
      colors: preset.colors,
    }
    setThemeState(nextState)
    document.documentElement.classList.toggle('dark-theme', isDarkPreset)
    localStorage.setItem('starwaves.theme', isDarkPreset ? 'dark' : 'light')
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }, [themeState])

  const updateColor = useCallback((variableKey, colorValue) => {
    setThemeState((prev) => {
      const next = {
        ...prev,
        preset: 'custom',
        colors: { ...prev.colors, [variableKey]: colorValue },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const updateOption = useCallback((optionKey, value) => {
    setThemeState((prev) => {
      const next = { ...prev, [optionKey]: value }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }, [])

  const saveCustomTheme = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(themeState))
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }, [themeState])

  const resetToDefault = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    resetThemeVariables()
    const isDark = localStorage.getItem('starwaves.theme') === 'dark'
    const defaultPreset = isDark ? 'dark' : 'light'
    const defaultState = {
      preset: defaultPreset,
      colors: THEME_PRESETS[defaultPreset].colors,
      fontFamily: 'inter',
      radius: 'modern',
      density: 'default',
      elevation: 'subtle',
      motion: 'normal',
    }
    setThemeState(defaultState)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }, [])

  const exportTheme = useCallback(() => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(themeState, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute(
      'download',
      `starwaves-ui-ux-${themeState.preset || 'custom'}.json`,
    )
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }, [themeState])

  const importTheme = useCallback((themeData) => {
    if (themeData) {
      const nextState = {
        preset: themeData.preset || 'custom',
        colors: themeData.colors || THEME_PRESETS.dark.colors,
        fontFamily: themeData.fontFamily || 'inter',
        radius: themeData.radius || 'modern',
        density: themeData.density || 'default',
        elevation: themeData.elevation || 'subtle',
        motion: themeData.motion || 'normal',
      }
      setThemeState(nextState)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    }
  }, [])

  return {
    activePreset: themeState.preset,
    currentColors: themeState.colors,
    fontFamily: themeState.fontFamily,
    radius: themeState.radius,
    density: themeState.density,
    elevation: themeState.elevation,
    motion: themeState.motion,
    isSaved,
    selectPreset,
    updateColor,
    updateOption,
    saveCustomTheme,
    resetToDefault,
    exportTheme,
    importTheme,
  }
}
