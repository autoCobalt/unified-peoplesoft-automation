import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { configureWorkflowMiddleware } from './src/server/index.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env files (.env, .env.local, .env.[mode], etc.)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
      {
        name: 'workflow-api',
        configureServer(server) {
          configureWorkflowMiddleware(server, env);
        },
      },
    ],
  }
})
