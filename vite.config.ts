import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL ? new URL(env.VITE_API_URL).origin : 'http://localhost:4447';

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
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
        'html2canvas'
      ],
    },
    server: {
      port: 5173,
      watch: {
        ignored: [
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
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return

            if (id.includes('recharts')) return 'charts'
            if (id.includes('firebase')) return 'firebase'
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('framer-motion')) return 'motion'
            if (id.includes('react-router')) return 'router'
            if (id.includes('@radix-ui')) return 'radix'
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf'
            if (id.includes('react') || id.includes('scheduler')) return 'vendor'

            return 'vendor'
          },
        },
      },
    },
  }
})
