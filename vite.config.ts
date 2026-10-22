import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

import { VitePWA } from 'vite-plugin-pwa'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL ? new URL(env.VITE_API_URL).origin : 'http://localhost:4000';

  return {
    plugins: [
      react(),
      tailwindcss(),
      nodePolyfills({
        include: ['buffer', 'process', 'util', 'stream'],
        globals: { Buffer: true, global: true, process: true }
      }),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'RecruitMS — Recruitment Management System',
          short_name: 'RecruitMS',
          description: 'Enterprise-grade recruitment management with real-time queue monitoring.',
          theme_color: '#0a0b1e',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'lucide-react',
        'framer-motion',
        'recharts',
        'axios',
        'zustand',
        'xlsx',
        'papaparse',
        'jspdf',
        'html2canvas',
        'socket.io-client',
        'zod',
        'clsx',
        'class-variance-authority',
        'react-signature-canvas'
      ],
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      watch: {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/database/**',
          '**/server/**',
          '**/uploads/**',
          '**/scratch/**',
          '**/dist/**',
          '**/*.txt',
          '**/*.log',
          '**/*.tsbuildinfo',
          '**/tsconfig.app.tsbuildinfo',
          '**/backups/**'
        ]
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          timeout: 60000,
          proxyTimeout: 60000,
        },
        '/socket.io': {
          target: apiTarget,
          ws: true,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
        }
      }
    },
    preview: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          timeout: 60000,
          proxyTimeout: 60000,
        },
        '/socket.io': {
          target: apiTarget,
          ws: true,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
        }
      }
    },
    esbuild: {
      drop: ['console', 'debugger'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return

            // Heavy visualization / data libs — lazy loaded with their pages
            if (id.includes('recharts'))      return 'charts'
            if (id.includes('firebase'))      return 'firebase'
            if (id.includes('@supabase'))     return 'supabase'
            if (id.includes('framer-motion')) return 'motion'
            if (id.includes('react-router'))  return 'router'
            if (id.includes('@radix-ui'))     return 'radix'
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf'

            // Spreadsheet libs — only needed in export/import views
            if (id.includes('xlsx') || id.includes('papaparse') || id.includes('exceljs')) return 'spreadsheet'

            // Real-time — only needed after auth
            if (id.includes('socket.io'))     return 'socket'

            // Utility libs — small but separate from React core
            if (id.includes('zod') || id.includes('zustand') || id.includes('clsx') || id.includes('class-variance-authority')) return 'utils'

            // Icon library
            if (id.includes('lucide'))        return 'icons'

            // React core + scheduler + remaining small deps
            if (id.includes('react') || id.includes('scheduler')) return 'vendor'

            return 'vendor'
          },
        },
      },
    },
  }
})
