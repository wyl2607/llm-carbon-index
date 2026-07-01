import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served as a GitHub project Pages site under /llm-carbon-index/.
  // Override with VITE_BASE=/ for a root deploy (e.g. Vercel/custom domain).
  base: process.env.VITE_BASE ?? '/llm-carbon-index/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('recharts')) {
            return 'vendor-recharts';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
        },
      },
    },
  },
})
