// Temporário: renderiza o showreel quadro a quadro (modo "stills" para revisão ou "all" para o vídeo).
import { chromium } from 'playwright'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
const [, , reel, outDir, mode = 'stills', from = '0', to = '1200'] = process.argv
fs.mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--force-color-profile=srgb', '--disable-lcd-text'] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto(pathToFileURL(reel).href)
await page.evaluate(() => window.ready)
await page.evaluate(() => document.fonts.ready)
const times = mode === 'stills' ? [0.55, 1.15, 1.75, 2.6, 3.4, 4.25, 5.2, 6.5, 7.5, 8.7, 9.6, 10.5, 11.6, 12.4, 13.5, 14.3, 15.3, 16.5, 17.5, 18.6, 19.2, 19.85, 4.05, 14.05].map(x => x * 60) : Array.from({ length: +to - +from }, (_, i) => +from + i)
const t0 = Date.now()
for (const [k, f] of times.entries()) {
  await page.evaluate(t => window.render(t), f / 60)
  const name = mode === 'stills' ? `k${String(k).padStart(2, '0')}.png` : `f${String(f).padStart(4, '0')}.jpg`
  await page.screenshot({ path: `${outDir}/${name}`, type: mode === 'stills' ? 'png' : 'jpeg', quality: mode === 'stills' ? undefined : 95 })
  if (mode !== 'stills' && k % 100 === 0) console.log('frame', f, `${((Date.now() - t0) / 1000).toFixed(0)}s`)
}
console.log('done', times.length, 'frames', `${((Date.now() - t0) / 1000).toFixed(0)}s`, 'errors:', errors)
await browser.close()
