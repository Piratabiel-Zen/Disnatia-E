import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'

function dinastiaModularBuild() {
  return {
    name: 'dinastia-modular-build',
    enforce: 'pre',
    configResolved(config) {
      if (config.isPreview || process.argv.includes('preview')) return
      execFileSync(process.execPath, ['scripts/build-modular.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/realtime-patch.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/session-ui-patch.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/experience-layer-cleanup.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/combat-hud-animation-patch.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/master-battle-scroll-patch.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/ambient-player-fix.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/dice-identity-rules-patch.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/elyon-book-chapter-patch.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/cronicas-hq-images-patch.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/cosmic-modern-ui-patch.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/enemy-sheets-battlemap-patch.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/player-class-lock-patch.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/final-interaction-fixes-patch.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/cronicas-original-quality-patch.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/video-background-battlemap-ping-patch.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/enemy-token-hp-link-patch.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
      execFileSync(process.execPath, ['scripts/global-realtime-sync-patch.mjs'], { cwd: process.cwd(), stdio: 'inherit' })
    },
  }
}

export default defineConfig({
  plugins: [dinastiaModularBuild(), react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/@firebase/') || id.includes('/firebase/')) return 'vendor-firebase'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react'
          return 'vendor'
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'firebase/app', 'firebase/firestore'],
  },
})
