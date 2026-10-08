import { createId } from '../../../lib/id'
import type { LocalFinanceTransaction } from '../../../lib/local-store'
import type { MappedTransaction } from './pluggy.mapper'

export type ReconcileInput = {
  existing: LocalFinanceTransaction[]
  incoming: MappedTransaction[]
  /** Contas cujos lançamentos foram buscados nesta rodada. */
  syncedAccountIds: Set<string>
  /** Início da janela buscada (AAAA-MM-DD). Lançamentos importados dentro dela que não voltaram foram removidos no banco ou deixaram de ser pendentes. */
  windowFrom: string
  ignored: Set<string>
}

/**
 * Junta o que veio da Pluggy com o que já existe, sem depender de webhooks:
 * - o lançamento é identificado por `external_id`; o id local e a categoria escolhida pelo usuário são preservados;
 * - dentro da janela buscada, importado que não voltou é removido (pendente que mudou de id, transação apagada no banco);
 * - os que o usuário excluiu (`ignored`) não voltam;
 * - lançamentos manuais e importados fora da janela ficam como estão.
 */
export function reconcile({ existing, incoming, syncedAccountIds, windowFrom, ignored }: ReconcileInput): LocalFinanceTransaction[] {
  const byExternal = new Map<string, LocalFinanceTransaction>()
  for (const item of existing) if (item.source === 'pluggy' && item.external_id) byExternal.set(item.external_id, item)
  const incomingIds = new Set(incoming.map(item => item.external_id))

  const kept = existing.filter(item => {
    if (item.source !== 'pluggy') return true
    if (!item.external_account_id || !syncedAccountIds.has(item.external_account_id)) return true
    if (item.date < windowFrom) return true
    return Boolean(item.external_id && incomingIds.has(item.external_id))
  })

  const updated = kept.map(item => {
    if (item.source !== 'pluggy' || !item.external_id) return item
    const fresh = incoming.find(candidate => candidate.external_id === item.external_id)
    if (!fresh) return item
    return { ...fresh, id: item.id, category: item.category_locked ? item.category : fresh.category, category_locked: item.category_locked, financial_goal_id: item.financial_goal_id }
  })

  const added = incoming
    .filter(item => !ignored.has(item.external_id) && !byExternal.has(item.external_id))
    .map(item => ({ ...item, id: createId() }))

  return [...added, ...updated]
}

/** Primeira carga: 90 dias. Depois: desde a última sincronização, com 7 dias de folga para pegar pendentes que mudam de dia. */
export function syncWindowStart(lastSyncAt: string | null, today: string) {
  const day = (value: string, offset: number) => { const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10) }
  if (!lastSyncAt) return day(today, -90)
  return day(lastSyncAt.slice(0, 10), -7)
}

export const SYNC_INTERVAL_MS = 6 * 3600_000
export function syncIsStale(lastSyncAt: string | null, now = Date.now()) {
  return !lastSyncAt || now - new Date(lastSyncAt).getTime() > SYNC_INTERVAL_MS
}
