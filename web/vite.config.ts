import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served as a GitHub project Pages site under /llm-carbon-index/.
  // Override with VITE_BASE=/ for a root deploy (e.g. Vercel/custom domain).
  base: process.env.VITE_BASE ?? '/llm-carbon-index/',
  plugins: [react()],
})
