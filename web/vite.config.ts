/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Content-Security-Policy só no build: o servidor de desenvolvimento precisa de scripts inline (React Refresh) e WebSocket.
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self' https://api.anthropic.com https://generativelanguage.googleapis.com https://api.coingecko.com https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

// `vite build --mode desktop` gera caminhos relativos para o Electron, que abre dist/index.html como arquivo (file://).
export default defineConfig(({ mode }) => ({
  base: mode === 'desktop' ? './' : '/',
  plugins: [react(), {
    name: 'content-security-policy',
    transformIndexHtml: { order: 'post', handler: (html, ctx) => ctx.server ? html : html.replace('</head>', `    <meta http-equiv="Content-Security-Policy" content="${csp}" />
  </head>`) },
  }, {
    name: 'offline-assets',
    generateBundle(_, bundle) {
      const assets = Object.keys(bundle).filter(name => name.startsWith('assets/'))
      this.emitFile({ type: 'asset', fileName: 'offline-assets.json', source: JSON.stringify(assets.map(name => '/' + name)) })
    },
  }],
  server: {
    allowedHosts: ['.trycloudflare.com'],
  },
  test: {
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
}))
