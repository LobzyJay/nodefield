import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // served from a subpath on GitHub Pages (the deploy workflow sets GH_PAGES);
  // local dev + Vercel stay at root
  base: process.env.GH_PAGES ? '/nodefield/' : '/',
  plugins: [react()],
  server: { port: 5173, host: true },
})
