import { useRef, useState } from 'react'
import { deleteDatabaseValue, readDatabaseValue, setDatabaseValue } from '../lib/app-db'
import { localDataKeys, getLocalBooks } from '../lib/local-store'
import { gymDataKeys } from '../features/gym/services/gym.service'
import { deletePdf, loadPdf, savePdf } from '../lib/pdf-store'

const backupVersion = 2
const dataKeys = [...Object.values(localDataKeys), ...Object.values(gymDataKeys)]
// Perfil e personalização são objetos; todas as outras áreas são listas.
const objectKeys = new Set<string>([localDataKeys.profile, localDataKeys.customization])
const isPlainObject = (value: unknown) => typeof value === 'object' && value !== null && !Array.isArray(value)
type PdfBackup = { id: string; data: string }

async function currentValue(key: string) {
  const local = localStorage.getItem(key)
  if (local !== null) return JSON.parse(local) as unknown
  return readDatabaseValue(key)
}

function encode(bytes: Uint8Array) {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 32768) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 32768))
  }
  return btoa(binary)
}

function decode(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

export function BackupSettings() {
  const input = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function download() {
    setBusy(true)
    setMessage('Preparando backup completo…')
    try {
      const records = await Promise.all(dataKeys.map(async key => [key, await currentValue(key)]))
      const pdfs: PdfBackup[] = []
      for (const book of getLocalBooks()) {
        const file = await loadPdf(book.id)
        if (!file) throw new Error('pdf-missing')
        pdfs.push({ id: book.id, data: encode(new Uint8Array(await file.arrayBuffer())) })
      }
      const avatar = await readDatabaseValue('cavern.profile.avatar.v1')
      const blob = new Blob([JSON.stringify({ version: backupVersion, createdAt: new Date().toISOString(), records: Object.fromEntries(records), avatar, pdfs })], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `cavern-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage(`Backup exportado com ${pdfs.length} PDF${pdfs.length === 1 ? '' : 's'}.`)
    } catch {
      setMessage('Não foi possível exportar o backup completo. Confira se todos os PDFs da biblioteca ainda abrem.')
    } finally { setBusy(false) }
  }

  async function restore(file?: File) {
    if (!file || busy) return
    setBusy(true)
    setMessage('Verificando arquivo de backup…')
    try {
      const data = JSON.parse(await file.text()) as { version?: number; records?: Record<string, unknown>; avatar?: unknown; pdfs?: PdfBackup[] }
      if ((data.version !== 1 && data.version !== backupVersion) || !data.records || typeof data.records !== 'object' || Array.isArray(data.records)) throw new Error('invalid')
      if (data.version === backupVersion && !Array.isArray(data.pdfs)) throw new Error('invalid')
      // Valida o formato de cada área antes de gravar qualquer coisa: um arquivo adulterado ou corrompido não pode deixar o app em estado quebrado.
      for (const key of dataKeys) { const value = data.records[key]; if (value !== undefined && !(objectKeys.has(key) ? isPlainObject(value) : Array.isArray(value))) throw new Error('invalid') }
      const pdfs = (data.pdfs ?? []).map(item => {
        if (!item || typeof item.id !== 'string' || typeof item.data !== 'string') throw new Error('invalid')
        return { id: item.id, bytes: decode(item.data) }
      })
      if (!window.confirm('Restaurar este backup substituirá os dados locais atuais (os que não estiverem no arquivo serão apagados). Continuar?')) { setMessage('Restauração cancelada.'); return }
      // Backup v2 traz todas as áreas (ausente = estava vazia): a restauração substitui de verdade. O v1 não tinha academia nem PDFs, então esses dados atuais são preservados.
      const replaceAll = data.version === backupVersion
      const previousBookIds = getLocalBooks().map(book => book.id)
      for (const key of dataKeys) {
        if (data.records[key] === undefined) {
          if (!replaceAll) continue
          localStorage.removeItem(key)
          await deleteDatabaseValue(key)
          continue
        }
        localStorage.setItem(key, JSON.stringify(data.records[key]))
        await setDatabaseValue(key, data.records[key])
      }
      for (const pdf of pdfs) await savePdf(pdf.id, new Blob([pdf.bytes], { type: 'application/pdf' }))
      if (replaceAll) {
        const restored = new Set(pdfs.map(pdf => pdf.id))
        for (const bookId of previousBookIds) if (!restored.has(bookId)) await deletePdf(bookId)
      }
      if (typeof data.avatar === 'string') await setDatabaseValue('cavern.profile.avatar.v1', data.avatar)
      else if (replaceAll) await deleteDatabaseValue('cavern.profile.avatar.v1')
      setMessage(data.version === 1 ? 'Backup antigo restaurado. Seus PDFs e dados da academia não existiam nesse arquivo. Recarregue o aplicativo.' : 'Backup restaurado. Recarregue o aplicativo para ver todos os dados.')
    } catch {
      setMessage('Arquivo de backup inválido ou restauração incompleta. Tente novamente com um backup válido.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return <section className="panel profile-section"><h2>Backup local</h2><p className="profile-note">Exporte seus registros, dados da academia e PDFs para trocar de dispositivo ou manter uma cópia.</p><div className="button-row"><button type="button" className="subtle" disabled={busy} onClick={() => void download()}>Exportar backup</button><button type="button" className="subtle" disabled={busy} onClick={() => input.current?.click()}>Importar backup</button></div><input ref={input} className="sr-only" aria-label="Importar arquivo de backup" type="file" accept="application/json" onChange={event => void restore(event.target.files?.[0])}/>{message && <p className="saved-message" role="status">{message}</p>}</section>
}
