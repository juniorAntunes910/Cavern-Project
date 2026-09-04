import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLocalBooks, startReadingSession, finishReadingSession, updateLocalBook, updateReadingSession } from '../lib/local-store'
import { loadPdf } from '../lib/pdf-store'
import { openPdf, readablePdfError } from '../lib/pdf-reader'

export function Reader() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const book = getLocalBooks().find(item => item.id === id)
  const bookId = book?.id
  const [initialPage] = useState(book?.current_page ?? 1)
  const [page, setPage] = useState(initialPage)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [status, setStatus] = useState('')
  const canvas = useRef<HTMLCanvasElement>(null)
  const reader = useRef<HTMLElement>(null)
  const sessionId = useRef<string | null>(null)

  const goTo = useCallback((next: number) => {
    if (!book || !sessionId.current) return
    updateReadingSession(sessionId.current, next)
    updateLocalBook(book.id, { current_page: next, status: 'reading' })
    setPage(next)
  }, [book])

  useEffect(() => {
    if (bookId && !sessionId.current) sessionId.current = startReadingSession(bookId, initialPage).id
    return () => { if (sessionId.current) finishReadingSession(sessionId.current) }
  }, [bookId, initialPage])

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === reader.current)
    const handleKeys = (event: KeyboardEvent) => {
      if (!fullscreen || loading || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === 'ArrowLeft' && page > 1) { event.preventDefault(); goTo(page - 1) }
      if (event.key === 'ArrowRight' && book && page < book.total_pages) { event.preventDefault(); goTo(page + 1) }
    }
    document.addEventListener('fullscreenchange', syncFullscreen)
    window.addEventListener('keydown', handleKeys)
    return () => { document.removeEventListener('fullscreenchange', syncFullscreen); window.removeEventListener('keydown', handleKeys) }
  }, [book, fullscreen, goTo, loading, page])

  useEffect(() => {
    let cancelled = false
    async function render() {
      if (!bookId || !canvas.current) return
      setError(''); setLoading(true)
      const blob = await loadPdf(bookId)
      if (!blob) { setError('Arquivo PDF não encontrado. Exclua este registro e importe o PDF novamente.'); setLoading(false); return }
      const pdf = await openPdf(blob)
      const safePage = Math.min(Math.max(page, 1), pdf.numPages)
      const pdfPage = await pdf.getPage(safePage)
      const baseViewport = pdfPage.getViewport({ scale: 1 })
      const availableWidth = fullscreen ? window.innerWidth - 72 : 900
      const viewport = pdfPage.getViewport({ scale: Math.min(1.8, Math.max(1.2, availableWidth / baseViewport.width)) })
      const target = canvas.current
      target.width = viewport.width
      target.height = viewport.height
      const context = target.getContext('2d')
      if (!context) throw new Error('Canvas não disponível')
      await pdfPage.render({ canvas: target, canvasContext: context, viewport }).promise
      await pdf.cleanup()
      if (!cancelled) { updateLocalBook(bookId, { current_page: safePage, status: 'reading' }); setStatus(`Página ${safePage} de ${pdf.numPages} carregada.`); setLoading(false) }
    }
    void render().catch((renderError) => { if (!cancelled) { setError(readablePdfError(renderError)); setLoading(false) } })
    return () => { cancelled = true }
  }, [bookId, fullscreen, page])

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await reader.current?.requestFullscreen()
    } catch { setStatus('Não foi possível ativar a tela cheia neste navegador.') }
  }

  if (!book) return <main className="empty">Livro não encontrado.</main>
  return <section className="reader" ref={reader}><header><button className="subtle" onClick={() => navigate('/books')}>Voltar</button><div><p className="eyebrow">LEITOR</p><h1>{book.title}</h1><p className="reader-help">Use os controles para avançar. Em tela cheia, as setas esquerda e direita também mudam a página.</p></div><button className="subtle fullscreen-button" type="button" onClick={() => void toggleFullscreen()}>Tela cheia</button></header>{fullscreen && <button className="fullscreen-exit" type="button" onClick={() => void toggleFullscreen()}>Sair da tela cheia</button>}<p className="sr-status" role="status">{status}</p><div className="pdf-stage" aria-busy={loading}>{loading && !error && <p className="pdf-loading">Carregando página...</p>}{error ? <div className="empty">{error}</div> : <canvas ref={canvas} className="pdf-page" />}</div><footer className="reader-controls"><button disabled={loading || page <= 1} onClick={() => goTo(page - 1)}>Anterior</button><strong>Página {page} / {book.total_pages}</strong><button disabled={loading || page >= book.total_pages} onClick={() => goTo(page + 1)}>Próxima</button></footer></section>
}
