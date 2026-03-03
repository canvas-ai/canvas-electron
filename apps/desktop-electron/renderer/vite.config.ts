import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: path.resolve(__dirname, '../../../public'),
  build: {
    outDir: '../../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        launcher: path.resolve(__dirname, 'launcher.html'),
        menu: path.resolve(__dirname, 'menu.html'),
        toolbox: path.resolve(__dirname, 'toolbox.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
  },
})
