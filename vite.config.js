import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// O código em src/ é a fonte real do site. Não há mais geração nem patches
// em tempo de build: o que está versionado é o que a Vercel compila.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/@3d-dice/') || id.includes('/three/') || id.includes('/cannon-es/')) return 'vendor-dice-physics'
          if (id.includes('/@firebase/database') || id.includes('/firebase/database')) return 'vendor-live'
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
