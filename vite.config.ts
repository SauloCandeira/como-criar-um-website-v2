import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    proxy: {
      '/api/crons': {
        target: 'http://147.93.33.246:3333',
        changeOrigin: true,
        secure: false,
      },
      '/api/openclaw': {
        target: 'http://147.93.33.246:3333',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

// https://www.hktech.com.br/