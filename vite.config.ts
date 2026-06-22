import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({mode}) => {
  const baseRoute = mode === "production" ?  '/cs-baseball-sim/': '/'
  return {
    base: baseRoute,
    plugins: [react()],
    server: {
      port: 3000,
      open: true
    }
  }
});
