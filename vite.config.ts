import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * The home page's hero picture is imported from the app's JS, so on its own the
 * browser only asks for it once the whole bundle has downloaded and run. This
 * starts fetching it from index.html instead, alongside the bundle, but only on
 * the home page so other pages don't download a picture they don't show.
 */
function preloadHomeHero(): Plugin {
  return {
    name: 'preload-home-hero',
    transformIndexHtml(_html, ctx) {
      const asset = ctx.bundle
        ? Object.values(ctx.bundle).find((file) => /^assets\/hero-[^/]+\.webp$/.test(file.fileName))
        : undefined;
      const href = asset ? `/${asset.fileName}` : '/src/components/hero.webp';
      return [
        {
          tag: 'script',
          injectTo: 'head',
          children: `if (location.pathname === '/') { var l = document.createElement('link'); l.rel = 'preload'; l.as = 'image'; l.href = ${JSON.stringify(href)}; l.setAttribute('fetchpriority', 'high'); document.head.appendChild(l); }`,
        },
      ];
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), preloadHomeHero()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
