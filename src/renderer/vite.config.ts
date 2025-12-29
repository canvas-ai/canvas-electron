import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  // IMPORTANT: Vite root is `src/renderer` (see package.json "vite ... src/renderer"),
  // so we must point publicDir at the repo-root `public/` to copy icons/images into dist.
  publicDir: path.resolve(__dirname, '../../public'),
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        toolbox: path.resolve(__dirname, 'toolbox.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 3000,
  },
})
