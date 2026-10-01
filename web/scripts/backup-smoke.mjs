import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'

function samplePdf() {
  const stream = 'BT /F1 20 Tf 50 750 Td (Cavern backup test) Tj ET\n'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let data = '%PDF-1.4\n'
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(data))
    data += `${index + 1} 0 obj\n${object}\nendobj\n`
  }
  const xref = Buffer.byteLength(data)
  data += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  data += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  data += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(data)
}

const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const source = await browser.newContext({ acceptDownloads: true })
  const page = await source.newPage()
  await page.goto('http://127.0.0.1:5173/books')
  await page.locator('.book-import input[type="file"]').setInputFiles({ name: 'Backup.pdf', mimeType: 'application/pdf', buffer: samplePdf() })
  await page.getByText('Livro adicionado à biblioteca.').waitFor()
  await page.goto('http://127.0.0.1:5173/gym')
  await page.getByRole('button', { name: 'Fui à academia' }).click()
  await page.goto('http://127.0.0.1:5173/profile')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar backup' }).click()
  const download = await downloadPromise
  const backup = await readFile(await download.path())
  const parsed = JSON.parse(backup.toString())
  assert.equal(parsed.version, 2)
  assert.equal(parsed.pdfs.length, 1)
  assert(parsed.records['cavern.gym.attendance.v1']?.length, 'Academia não entrou no backup')

  const target = await browser.newContext()
  const restored = await target.newPage()
  await restored.goto('http://127.0.0.1:5173/profile')
  restored.once('dialog', dialog => dialog.accept())
  await restored.getByLabel('Importar arquivo de backup').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backup })
  await restored.getByText('Backup restaurado. Recarregue o aplicativo para ver todos os dados.').waitFor()
  await restored.goto('http://127.0.0.1:5173/books')
  await restored.locator('.book-card').first().waitFor()
  assert.equal(await restored.locator('.book-card').count(), 1)
  await restored.getByRole('link', { name: 'Ler agora' }).click()
  await restored.locator('canvas').first().waitFor()
  await restored.goto('http://127.0.0.1:5173/gym')
  assert(await restored.evaluate(() => JSON.parse(localStorage.getItem('cavern.gym.attendance.v1') || '[]').length > 0))
  console.log('backup: registros, academia e PDF restaurados')
} finally {
  await browser.close()
}
