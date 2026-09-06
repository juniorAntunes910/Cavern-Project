import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { addLocalBook, deleteLocalBook, getLocalBooks } from '../lib/local-store'
import { deletePdf, savePdf } from '../lib/pdf-store'
import { openPdf, readablePdfError } from '../lib/pdf-reader'
import { NavLink } from 'react-router-dom'

export function Books() {
  const [books, setBooks] = useState(getLocalBooks)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function importPdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setMessage('Selecione um arquivo PDF.'); return }
    setBusy(true); setMessage('Lendo PDF...')
    try {
      const document = await openPdf(file)
      const title = file.name.replace(/\.pdf$/i, '')
      const bookId = crypto.randomUUID()
      await savePdf(bookId, file)
      const next = addLocalBook({ id: bookId, title, author: null, file_name: file.name, total_pages: document.numPages })
      await document.cleanup()
      setBooks(next)
      setMessage('Livro adicionado à biblioteca.')
    } catch (error) { setMessage(readablePdfError(error)) } finally { setBusy(false); event.target.value = '' }
  }
  async function remove(id: string) { if (!window.confirm('Tem certeza que deseja excluir este livro? O arquivo local e o progresso serão removidos.')) return; await deletePdf(id); setBooks(deleteLocalBook(id)); setMessage('Livro e progresso removidos da biblioteca.') }
  return <><header><p className="eyebrow">LEITURA</p><h1>Minha Biblioteca</h1><p>Importe PDFs para ler, retomar da última página e acompanhar seu progresso neste dispositivo.</p></header><section className="panel book-import"><label className="button">{busy ? 'Importando...' : 'Adicionar PDF'}<input accept="application/pdf" disabled={busy} type="file" onChange={importPdf} /></label>{message && <p className="action-feedback" role="status">{message}</p>}</section><section className="book-grid">{books.length === 0 ? <div className="empty">Sua biblioteca está vazia. Importe o primeiro PDF para começar a leitura.</div> : books.map(book => <article className="panel book-card" key={book.id}><div className="book-cover">PDF</div><div><p className="eyebrow">{book.status}</p><h2>{book.title}</h2><p>{book.author ?? 'Autor não informado'}</p><strong>{book.current_page} / {book.total_pages}</strong><span>{Math.round(book.current_page / book.total_pages * 100)}%</span><div className="habit-actions"><NavLink className="button" to={`/books/${book.id}/read`}>Ler agora</NavLink><button className="danger" onClick={() => void remove(book.id)}>Excluir</button></div></div></article>)}</section></>
}
