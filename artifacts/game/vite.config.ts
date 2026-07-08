import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;
const port = rawPort && !Number.isNaN(Number(rawPort)) && Number(rawPort) > 0
  ? Number(rawPort)
  : 5173;

const basePath = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    // Suppress the "ResizeObserver loop limit exceeded" browser warning.
    // GameCanvas observes its own element to keep canvas resolution in sync
    // with layout; on some browsers (notably mobile Safari, used by the iOS
    // Replit app) this well-known benign timing warning surfaces as a
    // non-Error `error` event. The overlay's client script always turns any
    // non-Error `error`/`unhandledrejection` value into the literal message
    // "(unknown runtime error)" (see @replit/vite-plugin-runtime-error-modal's
    // sendError()), so that exact string is what we actually see for this
    // case and is what we filter on. Filtering here (server-side, before the
    // overlay is shown) is more reliable than a client-side error listener,
    // since the overlay's own listener is injected before app code runs.
    // Note: the plugin checks this filter before logging, so a filtered
    // error produces no server-console trace either. If a *different* bug
    // starts throwing non-Error values (e.g. a DOMException from canvas
    // operations, which per spec is not `instanceof Error`), it would also
    // be silently skipped here with no overlay and no log line — revisit
    // this filter if play ever "feels" broken without any visible error.
    runtimeErrorOverlay({
      filter: (error) => error.message !== '(unknown runtime error)',
    }),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      // api-server listens on 3001 (see its workflow: `PORT=3001 ...`).
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
