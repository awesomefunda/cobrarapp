import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Build-time stamp surfaced to the client so we can detect "new deploy" without
// relying solely on service-worker activation (belt + suspenders for cache busting).
const BUILD_ID = new Date().toISOString()

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    VitePWA({
      // `prompt` gives us explicit control: the new SW waits until the user
      // accepts the update banner, then skipWaiting + reload happen together.
      // This is the only reliable way to avoid "I pushed a fix, users see stale."
      registerType: 'prompt',
      injectRegister: false, // we register manually in src/utils/sw.js
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Cobrar — Get paid on time, every time.',
        short_name: 'Cobrar',
        description: 'Track who owes you and who you owe. Private, offline, free.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // Exclude HTML from precache — let the network always serve fresh HTML.
        // JS/CSS/image assets are content-hashed by Vite so they can be cached long-term.
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        navigateFallback: null, // let server handle index.html (no-cache headers set in vercel.json)
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          }
        ]
      },
      devOptions: {
        enabled: false, // don't register SW in dev — avoids stale caches while coding
      },
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
    css: false,
  },
})
