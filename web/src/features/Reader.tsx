import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { getLocalBooks, startReadingSession, finishReadingSession, updateLocalBook, updateReadingSession, type LocalBook } from '../lib/local-store'
import { loadPdf } from '../lib/pdf-store'
import { openPdf, readablePdfError } from '../lib/pdf-reader'

export function Reader() {
  const { id = '' } = useParams()
  const book = getLocalBooks().find(item => item.id === id)
  return book ? <BookReader key={id} book={book} /> : <div className="empty">Livro não encontrado.</div>
}

function BookReader({ book }: { book: LocalBook }) {
  const navigate = useNavigate()
  const [page, setPage] = useState(book.current_page)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [zoom, setZoom] = useState(1)
  const [width, setWidth] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [status, setStatus] = useState('')
  const reader = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const output = useRef<HTMLDivElement>(null)
  const sessionId = useRef<string | null>(null)
  const pageRef = useRef(page)
  const zoomRef = useRef(zoom)
  const changeZoom = useCallback((value: number) => {
    const next = Math.round(Math.min(3, Math.max(.5, value)) * 100) / 100
    zoomRef.current = next
    setZoom(next)
  }, [])

  useEffect(() => {
    const start = () => {
      if (!sessionId.current && !document.hidden) sessionId.current = startReadingSession(book.id, pageRef.current).id
    }
    const finish = () => {
      if (sessionId.current) finishReadingSession(sessionId.current)
      sessionId.current = null
    }
    const visibility = () => document.hidden ? finish() : start()
    start()
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', finish)
    window.addEventListener('pageshow', start)
    return () => { finish(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', finish); window.removeEventListener('pageshow', start) }
  }, [book.id])

  // Open the document once per book, not once per page or zoom step.
  useEffect(() => {
    let cancelled = false
    let document: PDFDocumentProxy | undefined
    void (async () => {
      const blob = await loadPdf(book.id)
      if (!blob) throw new Error('Arquivo PDF não encontrado neste dispositivo.')
      document = await openPdf(blob)
      if (cancelled) { await document.loadingTask.destroy(); return }
      setPdf(document)
      const safePage = Math.min(document.numPages, Math.max(1, book.current_page))
      pageRef.current = safePage
      setPage(safePage)
    })().catch(e => { if (!cancelled) { setError(readablePdfError(e)); setLoading(false) } })
    return () => { cancelled = true; if (document) void document.loadingTask.destroy() }
  }, [book.id, book.current_page])

  useEffect(() => {
    const target = stage.current
    if (!target) return
    const observer = new ResizeObserver(() => setWidth(target.clientWidth))
    observer.observe(target)
    setWidth(target.clientWidth)
    // Only two-finger gestures are intercepted; one finger keeps native scrolling.
    let pinch: { distance: number; zoom: number } | null = null
    const distance = (e: TouchEvent) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
    const start = (e: TouchEvent) => { if (e.touches.length === 2) pinch = { distance: distance(e), zoom: zoomRef.current } }
    const move = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinch || pinch.distance === 0) return
      e.preventDefault()
      changeZoom(pinch.zoom * distance(e) / pinch.distance)
    }
    const end = () => { pinch = null }
    target.addEventListener('touchstart', start, { passive: true })
    target.addEventListener('touchmove', move, { passive: false })
    target.addEventListener('touchend', end)
    target.addEventListener('touchcancel', end)
    return () => { observer.disconnect(); target.removeEventListener('touchstart', start); target.removeEventListener('touchmove', move); target.removeEventListener('touchend', end); target.removeEventListener('touchcancel', end) }
  }, [changeZoom])

  useEffect(() => {
    if (!pdf || width <= 0) return
    let cancelled = false
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined
    // Debounce rapid pinch updates and render offscreen to avoid canvas races.
    const timer = window.setTimeout(() => {
      setLoading(true); setError('')
      void (async () => {
        const pdfPage = await pdf.getPage(page)
        if (cancelled) return
        const base = pdfPage.getViewport({ scale: 1 })
        const scale = width / base.width * zoom
        const css = pdfPage.getViewport({ scale })
        const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(12_000_000 / (css.width * css.height)), 8192 / Math.max(css.width, css.height))
        const viewport = pdfPage.getViewport({ scale: scale * ratio })
        const canvas = document.createElement('canvas')
        canvas.className = 'pdf-page'
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height)
        canvas.style.width = css.width + 'px'; canvas.style.height = css.height + 'px'
        canvas.setAttribute('role', 'img')
        canvas.setAttribute('aria-label', 'Página ' + page + ' de ' + pdf.numPages)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas não disponível')
        task = pdfPage.render({ canvas, canvasContext: context, viewport })
        await task.promise
        if (cancelled) return
        output.current?.replaceChildren(canvas)
        setStatus('Página ' + page + ' de ' + pdf.numPages + ' carregada.')
        setLoading(false)
      })().catch(e => { if (!cancelled) { setError(readablePdfError(e)); setLoading(false) } })
    }, 100)
    return () => { cancelled = true; clearTimeout(timer); task?.cancel() }
  }, [pdf, page, width, zoom])

  const goTo = useCallback((next: number) => {
    if (!pdf) return
    const safe = Math.max(1, Math.min(pdf.numPages, next))
    if (sessionId.current) updateReadingSession(sessionId.current, safe)
    updateLocalBook(book.id, { current_page: safe, status: safe === pdf.numPages ? 'finished' : 'reading' })
    pageRef.current = safe
    setPage(safe)
    stage.current?.scrollTo({ top: 0, left: 0 })
  }, [book.id, pdf])

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === reader.current)
    const keys = (event: KeyboardEvent) => {
      if (!fullscreen || loading || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(page - 1) }
      if (event.key === 'ArrowRight') { event.preventDefault(); goTo(page + 1) }
    }
    document.addEventListener('fullscreenchange', sync)
    window.addEventListener('keydown', keys)
    return () => { document.removeEventListener('fullscreenchange', sync); window.removeEventListener('keydown', keys) }
  }, [fullscreen, loading, page, goTo])

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await reader.current?.requestFullscreen()
    } catch { setStatus('Tela cheia indisponível neste dispositivo. O zoom continua disponível.') }
  }

  return <section className="reader" ref={reader}><header><button className="subtle" onClick={() => navigate('/books')}>Voltar</button><div><p className="eyebrow">LEITOR</p><h1>{book.title}</h1><p className="reader-help">Amplie com dois dedos ou use os controles de zoom.</p></div><button className="subtle fullscreen-button" onClick={() => void toggleFullscreen()}>Tela cheia</button></header>
    {fullscreen && <button className="fullscreen-exit" onClick={() => void toggleFullscreen()}>Sair da tela cheia</button>}
    <div className="reader-zoom" role="group" aria-label="Zoom do PDF"><button className="subtle" aria-label="Diminuir zoom" disabled={!pdf || zoom <= .5} onClick={() => changeZoom(zoom - .25)}>−</button><output aria-label="Zoom atual">{Math.round(zoom * 100)}%</output><button className="subtle" aria-label="Aumentar zoom" disabled={!pdf || zoom >= 3} onClick={() => changeZoom(zoom + .25)}>+</button><button className="subtle" disabled={!pdf} onClick={() => changeZoom(1)}>Ajustar largura</button></div>
    <p className="sr-status" role="status">{status}</p>
    <div className="pdf-stage" ref={stage} aria-busy={loading}>{loading && !error && <p className="pdf-loading">Carregando página…</p>}{error && <p className="empty" role="alert">{error}</p>}<div ref={output} className="pdf-output" /></div>
    <footer className="reader-controls"><button disabled={loading || !pdf || page <= 1} onClick={() => goTo(page - 1)}>Anterior</button><strong>Página {page} / {pdf?.numPages ?? book.total_pages}</strong><button disabled={loading || !pdf || page >= pdf.numPages} onClick={() => goTo(page + 1)}>Próxima</button></footer>
  </section>
}
