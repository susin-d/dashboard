import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const require = createRequire(import.meta.url)
const pkg = require('./package.json')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || '0.1.0'),
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      external: (id) => id.startsWith('@capgo/'),
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@monaco-editor') || id.includes('monaco-editor')) return 'monaco'
            if (id.includes('react-grid-layout')) return 'grid'
            // 3D avatar, modular: three core renders the (lazy) VrmModel
            // placeholder scene; GLTF + VRM plugin load only when a model URL
            // actually loads, so they live in their own chunk. Order matters:
            // '@pixiv/three-vrm' and 'three/examples' both contain 'three'.
            if (id.includes('@pixiv/three-vrm')) return 'vrm-loader'
            if (id.includes('three/addons') || id.includes('three/examples')) return 'vrm-loader'
            if (id.includes('@react-three')) return 'three-core'
            if (id.includes('three')) return 'three-core'
            // Live2D avatar, modular: pixi engine vs display/cubism runtime.
            // Order matters: 'pixi-live2d-display' contains 'pixi'.
            if (id.includes('pixi-live2d-display')) return 'live2d'
            if (id.includes('pixi')) return 'pixi'
            // Feature-specific: only reachable via lazy LandingPage sections.
            if (id.includes('framer-motion')) return 'motion'
            // NOTE: no manual `icons` chunk — every import is a tree-shakeable
            // named import (~180 unique icons, sideEffects:false), and
            // Rolldown groups the icons shared across routes into one hashed
            // chunk that is downloaded once and cached. Splitting per icon
            // would create hundreds of tiny chunks.
            // This check must come before the `react` rule below because
            // 'lucide-react' contains the substring 'react'.
            if (id.includes('lucide-react')) return null
            // NOTE: no `firebase` chunk — the dependency is not imported
            // anywhere, so there is nothing to split out.
            if (id.includes('react') || id.includes('react-dom')) return 'vendor'
          }
          return null
        },
      },
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})
