import { useState } from 'react'
import type { FormEvent } from 'react'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { supabaseConfigured } from '../../../lib/supabase'
import { removeFinanceConnection, updateFinanceConnection } from './pluggy.repository'
import { connectItem, isItemId, itemStatusLabel, syncAll } from './pluggy.service'
import type { FinanceConnection } from './pluggy.types'
import './pluggy.css'

type Props = { connections: FinanceConnection[]; onMessage: (text: string) => void }

const ago = (iso: string | null) => {
  if (!iso) return 'nunca sincronizado'
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return 'atualizado agora'
  if (minutes < 60) return `atualizado há ${minutes} min`
  if (minutes < 1440) return `atualizado há ${Math.round(minutes / 60)} h`
  return `atualizado há ${Math.round(minutes / 1440)} d`
}
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export function PluggyPanel({ connections, onMessage }: Props) {
  const [itemId, setItemId] = useState('')
  const [busy, setBusy] = useState<'connect' | 'sync' | null>(null)
  const [removing, setRemoving] = useState<FinanceConnection | null>(null)
  const [error, setError] = useState('')

  async function connect(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!isItemId(itemId)) return setError('O Item ID é um código no formato 3fa85f64-5717-4562-b3fc-2c963f66afa6. Copie-o no painel da Pluggy.')
    setBusy('connect')
    try {
      const connection = await connectItem(itemId)
      setItemId('')
      onMessage(`${connection.bank} conectado com ${connection.accounts.length} conta${connection.accounts.length === 1 ? '' : 's'}. Importando os últimos 90 dias…`)
      await runSync(false)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível conectar.')
    } finally { setBusy(null) }
  }

  async function runSync(announce = true) {
    setError('')
    if (announce) setBusy('sync')
    try {
      const result = await syncAll()
      if (result.failed.length) setError(result.failed[0])
      else onMessage(result.imported || result.removed ? `Sincronizado: ${result.imported} novo${result.imported === 1 ? '' : 's'}${result.removed ? `, ${result.removed} removido${result.removed === 1 ? '' : 's'}` : ''}.` : 'Tudo em dia. Nenhum lançamento novo.')
    } finally { if (announce) setBusy(null) }
  }

  function toggleAccount(connection: FinanceConnection, accountId: string, enabled: boolean) {
    updateFinanceConnection(connection.id, current => ({ ...current, accounts: current.accounts.map(account => account.id === accountId ? { ...account, enabled } : account) }))
  }

  function confirmRemove() {
    if (!removing) return
    removeFinanceConnection(removing.id, true)
    onMessage(`${removing.bank} desconectado. Os lançamentos importados dele foram removidos.`)
    setRemoving(null)
  }

  return <section className="panel form pluggy-panel" aria-labelledby="pluggy-title">
    <div>
      <p className="eyebrow">OPEN FINANCE</p>
      <h2 id="pluggy-title">Contas conectadas</h2>
      <p className="muted">Importe lançamentos e saldo do seu banco pela Pluggy. Somente leitura: nada é pago ou movimentado.</p>
    </div>

    {!supabaseConfigured && <p className="action-feedback">Esta função usa o login do Supabase. Neste modo local ela fica indisponível.</p>}
    {error && <p className="action-feedback pluggy-error" role="alert">{error}</p>}

    {connections.map(connection => <article className="pluggy-connection" key={connection.id}>
      <div className="pluggy-connection-head">
        <div>
          <strong>{connection.bank}</strong>
          <small className={connection.status === 'UPDATED' ? '' : 'pluggy-warn'}>{itemStatusLabel(connection.status)} · {ago(connection.lastSyncAt)}</small>
        </div>
        <button type="button" className="danger" onClick={() => setRemoving(connection)}>Remover</button>
      </div>
      <ul className="pluggy-accounts">
        {connection.accounts.map(account => <li key={account.id}>
          <label>
            <input type="checkbox" checked={account.enabled} onChange={event => toggleAccount(connection, account.id, event.target.checked)} />
            <span>{account.name}<small>{account.type === 'credit' ? 'Cartão de crédito' : 'Conta'}{account.balance !== null ? ` · ${account.type === 'credit' ? 'fatura/limite usado' : 'saldo'} ${money(account.balance)}` : ''}</small></span>
          </label>
        </li>)}
      </ul>
    </article>)}

    {connections.length > 0 && <button type="button" className="subtle" disabled={busy !== null || !supabaseConfigured} onClick={() => void runSync()}>{busy === 'sync' ? 'Sincronizando…' : 'Sincronizar agora'}</button>}

    <details className="form-details" open={connections.length === 0}>
      <summary>{connections.length ? 'Conectar outro banco' : 'Conectar um banco'}</summary>
      <form className="form-details-content" onSubmit={event => void connect(event)}>
        <ol className="pluggy-steps">
          <li>Em <a href="https://meu.pluggy.ai" target="_blank" rel="noopener noreferrer">meu.pluggy.ai</a>, conecte seu banco (gratuito durante o período de teste da conta Pluggy).</li>
          <li>No painel da Pluggy, abra sua aplicação, o menu ⋮ da conexão e copie o <strong>Item ID</strong>.</li>
          <li>Cole abaixo.</li>
        </ol>
        <label>Item ID<input value={itemId} autoComplete="off" spellCheck={false} placeholder="3fa85f64-5717-4562-b3fc-2c963f66afa6" onChange={event => setItemId(event.target.value)} /></label>
        <button disabled={busy !== null || !supabaseConfigured || !itemId.trim()}>{busy === 'connect' ? 'Conectando…' : 'Conectar e importar'}</button>
      </form>
    </details>

    <ConfirmDialog open={Boolean(removing)} title="Remover esta conexão?" description={`“${removing?.bank ?? ''}” deixa de sincronizar e os lançamentos importados dele serão apagados daqui. Seus lançamentos manuais não mudam. No banco, nada é alterado.`} confirmLabel="Remover" onCancel={() => setRemoving(null)} onConfirm={confirmRemove} />
  </section>
}
