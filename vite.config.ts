import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icon-*.png'],
      manifest: false, // Using public/manifest.json
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache'
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173
  }
});