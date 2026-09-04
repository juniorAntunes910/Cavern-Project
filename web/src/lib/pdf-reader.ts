import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Keep the worker URL in the Vite bundle. This is important in the packaged
// Electron app, where resolving a worker from node_modules is not possible.
GlobalWorkerOptions.workerSrc = workerUrl

export async function openPdf(file: Blob): Promise<PDFDocumentProxy> {
  // PDF.js transfers this buffer to its worker. Always create a fresh buffer
  // for a new attempt instead of retaining a detached TypedArray.
  const data = new Uint8Array(await file.arrayBuffer())
  return getDocument({ data, useSystemFonts: true }).promise
}

export function readablePdfError(error: unknown) {
  const detail = error instanceof Error ? error.message : ''
  if (/password/i.test(detail)) return 'Este PDF é protegido por senha e não pode ser aberto aqui.'
  if (/invalid|format|corrupt|xref/i.test(detail)) return 'Este arquivo não parece ser um PDF válido ou está corrompido.'
  return 'Não foi possível abrir este PDF. Tente importar o arquivo novamente.'
}
