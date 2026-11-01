import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiBaseUrl = env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') ?? ''

  if (mode === 'production' && !apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is required for production builds. Set it to the deployed backend origin.')
  }
  if (apiBaseUrl) {
    try {
      const url = new URL(apiBaseUrl)
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== apiBaseUrl) throw new Error()
    } catch {
      throw new Error('VITE_API_BASE_URL must be an HTTP(S) backend origin without a path.')
    }
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': apiBaseUrl || 'http://127.0.0.1:8000',
        '/uploads': apiBaseUrl || 'http://127.0.0.1:8000',
      },
    },
  }
})
