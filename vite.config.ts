import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Firebase (largest dependency)
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // PDF generation
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          // Charts
          'vendor-charts': ['recharts'],
          // Excel handling
          'vendor-xlsx': ['xlsx'],
        },
      },
    },
  },
})
