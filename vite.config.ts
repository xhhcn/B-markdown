import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'

export default defineConfig({
  plugins: [
    react(),
                electron([
              {
                entry: 'electron/main.ts',
                onstart(options) {
                  options.startup()
                },
                vite: {
                  build: {
                    sourcemap: true,
                    minify: false,
                    outDir: 'dist-electron',
                    rollupOptions: {
                      external: ['electron']
                    }
                  }
                }
              },
              {
                entry: 'electron/preload.ts',
                onstart(options) {
                  options.reload()
                },
                vite: {
                  build: {
                    sourcemap: true,
                    minify: false,
                    outDir: 'dist-electron',
                    rollupOptions: {
                      external: ['electron']
                    }
                  }
                }
              }
            ])
  ],
  build: {
    outDir: 'dist'
  },
  server: {
    port: 5173
  }
}) 