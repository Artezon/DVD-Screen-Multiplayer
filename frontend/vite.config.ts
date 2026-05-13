import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  base: '/dvd',
  build: {
    outDir: '../dist/frontend',
    emptyOutDir: true
  },
  server: {
    proxy: {
      "/dvd/ws": {
        target: `ws://localhost:1234`,
        ws: true
      }
    }
  }
})
