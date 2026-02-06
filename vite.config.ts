import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    // Proxy API requests to the Fastify backend server
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/test-site': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Stage 3: WebSocket proxy
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
})
