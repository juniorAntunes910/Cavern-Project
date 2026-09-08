import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'offline-assets',
    generateBundle(_, bundle) {
      const assets = Object.keys(bundle).filter(name => name.startsWith('assets/'))
      this.emitFile({ type: 'asset', fileName: 'offline-assets.json', source: JSON.stringify(assets.map(name => '/' + name)) })
    },
  }],
  server: {
    allowedHosts: ['.trycloudflare.com'],
  },
})
