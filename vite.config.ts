import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    cors: true
  },
  preview: {
    host: true,
    port: 5173
  },
  base: '/luma-nova-frontend-web/',
  build: {
    rollupOptions: {
      output: {
        assetFileNames: `assets/[name].[ext]`
      }
    }
  },
  resolve: {
    alias: {
      '@assets': path.resolve(__dirname, 'src/assets')
    }
  }
})
