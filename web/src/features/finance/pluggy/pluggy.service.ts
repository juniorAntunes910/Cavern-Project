import { getLocalFinanceTransactions, localDataKeys, today, writeCollection } from '../../../lib/local-store'
import { fetchAccounts, fetchItem, fetchTransactions } from './pluggy.client'
import { mapTransaction } from './pluggy.mapper'
import { getFinanceConnections, updateFinanceConnection, upsertFinanceConnection } from './pluggy.repository'
import { reconcile, syncIsStale, syncWindowStart } from './pluggy.sync'
import type { FinanceConnection } from './pluggy.types'

/** Item IDs da Pluggy são UUIDs. Validar evita enviar texto qualquer ao servidor. */
export const isItemId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())

let running: Promise<SyncResult> | null = null
export type SyncResult = { imported: number; removed: number; failed: string[] }

/** Valida o Item ID no servidor e cadastra a conexão (sem importar lançamentos ainda). */
export async function connectItem(itemId: string): Promise<FinanceConnection> {
  const id = itemId.trim().toLowerCase()
  const [item, accounts] = await Promise.all([fetchItem(id), fetchAccounts(id)])
  const previous = getFinanceConnections().find(connection => connection.id === id)
  const connection: FinanceConnection = {
    id,
    bank: item.bank,
    status: item.status,
    lastSyncAt: previous?.lastSyncAt ?? null,
    ignored: previous?.ignored ?? [],
    accounts: accounts.map(account => ({ id: account.id, name: account.name, type: account.type, balance: account.balance, enabled: previous?.accounts.find(old => old.id === account.id)?.enabled ?? true })),
  }
  upsertFinanceConnection(connection)
  return connection
}

async function syncConnection(connection: FinanceConnection): Promise<{ imported: number; removed: number }> {
  const [item, accounts] = await Promise.all([fetchItem(connection.id), fetchAccounts(connection.id)])
  const enabled = accounts.filter(account => connection.accounts.find(known => known.id === account.id)?.enabled ?? true)
  const windowFrom = syncWindowStart(connection.lastSyncAt, today())
  const incoming = []
  for (const account of enabled) {
    const rows = await fetchTransactions(account.id, windowFrom)
    incoming.push(...rows.map(row => mapTransaction(row, account)))
  }
  const before = getLocalFinanceTransactions()
  const next = reconcile({ existing: before, incoming, syncedAccountIds: new Set(enabled.map(account => account.id)), windowFrom, ignored: new Set(connection.ignored) })
  writeCollection(localDataKeys.financeTransactions, next)
  updateFinanceConnection(connection.id, current => ({
    ...current,
    bank: item.bank,
    status: item.status,
    lastSyncAt: new Date().toISOString(),
    accounts: accounts.map(account => ({ id: account.id, name: account.name, type: account.type, balance: account.balance, enabled: current.accounts.find(old => old.id === account.id)?.enabled ?? true })),
  }))
  const beforeIds = new Set(before.map(row => row.id))
  const nextIds = new Set(next.map(row => row.id))
  return { imported: next.filter(row => !beforeIds.has(row.id)).length, removed: before.filter(row => !nextIds.has(row.id)).length }
}

/** Sincroniza todas as conexões. Chamadas simultâneas compartilham a mesma execução. Com `onlyStale`, pula as atualizadas há menos de 6h. */
export function syncAll({ onlyStale = false } = {}): Promise<SyncResult> {
  if (running) return running
  running = (async () => {
    const result: SyncResult = { imported: 0, removed: 0, failed: [] }
    for (const connection of getFinanceConnections()) {
      if (onlyStale && !syncIsStale(connection.lastSyncAt)) continue
      try {
        const done = await syncConnection(connection)
        result.imported += done.imported
        result.removed += done.removed
      } catch (error) {
        result.failed.push(error instanceof Error ? error.message : 'Falha desconhecida.')
        // Sessão expirada ou limite: não adianta insistir nas demais conexões.
        if ((error as { kind?: string }).kind === 'auth' || (error as { kind?: string }).kind === 'rate-limit') break
      }
    }
    return result
  })().finally(() => { running = null })
  return running
}

export const itemStatusLabel = (status: string) => ({
  UPDATED: 'Atualizado',
  UPDATING: 'Atualizando no banco…',
  LOGIN_ERROR: 'Erro de login no banco',
  OUTDATED: 'Desatualizado: reconecte no Meu Pluggy',
  WAITING_USER_INPUT: 'Aguardando você no Meu Pluggy',
  WAITING_USER_ACTION: 'Aguardando você no Meu Pluggy',
} as Record<string, string>)[status] ?? status
