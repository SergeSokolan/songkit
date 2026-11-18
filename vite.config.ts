import { defineConfig } from 'vite';
import packageJson from './package.json' with { type: 'json' };
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { welcomeCopy } from './src/pages/welcome/copy.ts';

const welcome = Object.fromEntries(
  Object.entries(welcomeCopy.ru).map(([key, text]) => [
    key,
    text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
  ]),
);
const staticWelcome = `
  <div class="welcome-page entry-static">
    <header class="welcome-header">
      <span class="welcome-version">v${packageJson.version}</span>
      <a class="github-link" href="https://github.com/SergeSokolan/songkit">GitHub</a>
    </header>
    <main class="welcome-hero">
      <div>
        <span class="welcome-brand">SongKit</span>
        <h1>${welcome.title}</h1>
        <p class="welcome-summary">${welcome.summary} ${welcome.library}</p>
        <p>${welcome.files}</p>
        <p>${welcome.localData} ${welcome.offline}</p>
        <div class="welcome-actions">
          <a class="welcome-primary" href="?view=editor">${welcome.openEditor}</a>
          <a class="welcome-guide" href="?view=guide">${welcome.installationGuide}</a>
        </div>
      </div>
    </main>
  </div>`;
const contentSecurityPolicy = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
].join('; ');

export default defineConfig({
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version) },
  base: process.env.BASE_PATH || '/',
  build: { manifest: true },
  plugins: [
    {
      name: 'songkit-content-security-policy',
      apply: 'build',
      transformIndexHtml: {
        order: 'pre',
        handler: () => [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy },
            injectTo: 'head-prepend',
          },
        ],
      },
    },
    react(),
    {
      name: 'songkit-static-welcome',
      apply: 'build',
      transformIndexHtml: (html) => html.replace('<!-- welcome-content -->', staticWelcome),
    },
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'sounds/*.wav'],
      manifest: {
        name: 'SongKit — барабанная мастерская',
        short_name: 'SongKit',
        lang: 'ru',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#171918',
        theme_color: '#171918',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,wav,txt,webmanifest}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
});
