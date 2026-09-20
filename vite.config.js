import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { prepareBuild } from './scripts/prepare-build.mjs'

function dinastiaModularBuild() {
  return {
    name: 'dinastia-modular-build',
    enforce: 'pre',
    configResolved(config) {
      if (config.isPreview || process.argv.includes('preview')) return
      prepareBuild([
        "scripts/build-modular.mjs",
        "scripts/realtime-patch.mjs",
        "scripts/game-experience-3-context-fix.mjs",
        "scripts/session-ui-patch.mjs",
        "scripts/experience-layer-cleanup.mjs",
        "scripts/combat-hud-animation-patch.mjs",
        "scripts/master-battle-scroll-patch.mjs",
        "scripts/ambient-player-fix.mjs",
        "scripts/dice-identity-rules-patch.mjs",
        "scripts/elyon-book-chapter-patch.mjs",
        "scripts/cronicas-hq-images-patch.mjs",
        "scripts/cosmic-modern-ui-patch.mjs",
        "scripts/enemy-sheets-battlemap-patch.mjs",
        "scripts/player-class-lock-patch.mjs",
        "scripts/final-interaction-fixes-patch.mjs",
        "scripts/cronicas-original-quality-patch.mjs",
        "scripts/video-background-battlemap-ping-patch.mjs",
        "scripts/enemy-token-hp-link-patch.mjs",
        "scripts/global-realtime-sync-patch.mjs",
        "scripts/battlemap-ultra-realtime-patch.mjs",
        "scripts/battlemap-position-authority-patch.mjs",
        "scripts/site-fluidity-hp-privacy-patch.mjs",
        "scripts/worldbook-usability-patch-v2.mjs",
        "scripts/worldbook-jsx-fix-patch.mjs",
        "scripts/site-immersion-performance-patch.mjs",
        "scripts/enemy-cosmic-vigor-patch.mjs",
        "scripts/combat-immersion-physical-dice-token-rotation-patch.mjs",
        "scripts/dice-replay-multidice-patch.mjs",
        "scripts/vigor-dice-token-ux-refinement-patch.mjs",
        "scripts/token-rotation-follow-patch.mjs",
        "scripts/realtime-interaction-low-latency-patch.mjs",
        "scripts/advanced-combat-v2-bootstrap-fix.mjs",
        "scripts/advanced-combat-automation-v2-patch.mjs",
        "scripts/combat-layout-initiative-drag-patch.mjs",
        "scripts/runtime-performance-balance-patch.mjs",
        "scripts/game-experience-3-world-patch.mjs",
        "scripts/game-director-persistence-broadcast-patch.mjs",
        "scripts/game-experience-3-polish-patch.mjs",
        "scripts/session-opening-cinematic-patch.mjs",
        "scripts/mobile-navigation-access-layout-patch.mjs",
        "scripts/mobile-hub-motion-audio-patch.mjs",
        "scripts/desktop-navigation-master-enemies-fix.mjs",
        "scripts/battlemap-original-quality-patch.mjs",
        "scripts/battlemap-realtime-consistency-patch.mjs",
        "scripts/realtime-zero-wait-patch.mjs",
        "scripts/desktop-runtime-stability-patch.mjs",
        "scripts/owlbear-interaction-final-patch.mjs",
        "scripts/runtime-lightweight-final-patch.mjs",
        "scripts/tabletop-realtime-fastpath-patch.mjs",
        "scripts/live-drag-platform-parity-patch.mjs",
        "scripts/opera-mobile-parity-final-patch.mjs",
        "scripts/cronicas-clean-modern-stars-patch.mjs",
        "scripts/mobile-clean-surface-final-patch.mjs",
        "scripts/audit-ux-final-patch.mjs",
        "scripts/tabletop-critical-hotfix-2026-09-19.mjs",
        "scripts/immersive-combat-dice-motion-hotfix-2026-09-19.mjs",
        "scripts/combat-action-hud-patch.mjs",
        "scripts/final-stability-guard.mjs",
        "scripts/adventure-session-patch.mjs",
        "scripts/player-experience-controls-patch.mjs",
        "scripts/dice-physical-critical-public-patch.mjs",
        "scripts/immersive-cross-browser-parity-patch.mjs",
        "scripts/css-dice-performance-final-patch.mjs"
      ])
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
