import { defineConfig } from 'vite'
import path from 'path'

const defaultBasePath = '/'
const basePath = process.env.VITE_BASE_PATH || defaultBasePath

export default defineConfig({
  root: '.',
  base: basePath,
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    sourcemap: true,
    assetsInlineLimit: 0,
    rolldownOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        editor: path.resolve(__dirname, 'editor.html'),
      },
    },
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
