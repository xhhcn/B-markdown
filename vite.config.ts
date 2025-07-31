import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'

export default defineConfig(({ command }) => {
  const isDev = command === 'serve'
  
  return {
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
              sourcemap: isDev,
              minify: !isDev ? 'esbuild' : false,
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
              sourcemap: isDev,
              minify: !isDev ? 'esbuild' : false,
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
      outDir: 'dist',
      minify: 'esbuild',
      target: 'esnext',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            codemirror: ['@codemirror/lang-markdown', '@codemirror/theme-one-dark', '@codemirror/view', '@uiw/react-codemirror'],
            markdown: ['unified', 'remark-parse', 'remark-gfm', 'remark-math', 'remark-rehype', 'rehype-katex', 'rehype-highlight', 'rehype-stringify']
          }
        },
        treeshake: {
          preset: 'recommended',
          propertyReadSideEffects: false,
          unknownGlobalSideEffects: false
        }
      }
    },
    server: {
      port: 5173
    },
    optimizeDeps: {
      include: ['react', 'react-dom', '@codemirror/lang-markdown', '@codemirror/theme-one-dark', '@codemirror/view']
    }
  }
}) 