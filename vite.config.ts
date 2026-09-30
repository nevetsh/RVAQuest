import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Keep Leaflet out of the initial bundle so first paint stays fast.
        manualChunks: {
          map: ['leaflet'],
        },
      },
    },
  },
})
