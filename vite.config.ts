import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    sourcemap: true,
    assetsInlineLimit: 0,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@assets': path.resolve(__dirname, 'assets'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
})
