import react from '@vitejs/plugin-react'
import type { PluginOption } from 'vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(async ({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const plugins: PluginOption[] = [react()]
  // API middleware is dev-only; production uses `api/index.js` on Vercel.
  if (command === 'serve') {
    const { authApiPlugin } = await import('./server/auth-middleware.ts')
    plugins.push(authApiPlugin(env))
  }
  return { plugins }
})
