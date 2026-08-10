import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'

function dinastiaModularBuild() {
  return {
    name: 'dinastia-modular-build',
    enforce: 'pre',
    configResolved() {
      execFileSync(process.execPath, ['scripts/build-modular.mjs'], {
        cwd: process.cwd(),
        stdio: 'inherit',
      })
      execFileSync(process.execPath, ['scripts/realtime-patch.mjs'], {
        cwd: process.cwd(),
        stdio: 'inherit',
      })
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
