import { describe, expect, it } from 'vitest'
import type { LocalFinanceTransaction } from '../../../lib/local-store'
import { mapCategory, mapTransaction } from './pluggy.mapper'
import { importedBankBalance } from './pluggy.repository'
import { reconcile, syncIsStale, syncWindowStart } from './pluggy.sync'
import { isItemId } from './pluggy.service'
import type { FinanceConnection, PluggyTransaction } from './pluggy.types'

const bank = { id: 'acc-bank', name: 'Conta corrente', type: 'bank' as const }
const card = { id: 'acc-card', name: 'Cartão', type: 'credit' as const }
const tx = (overrides: Partial<PluggyTransaction> = {}): PluggyTransaction => ({ id: 't1', date: '2026-10-05T00:00:00.000Z', description: 'Padaria Central', amount: -12.5, type: 'DEBIT', status: 'POSTED', category: 'Eating out', operationType: null, ...overrides })
const local = (overrides: Partial<LocalFinanceTransaction> = {}): LocalFinanceTransaction => ({ id: 'l1', date: '2026-10-05', kind: 'expense', amount_brl: 12.5, category: 'Alimentação', account: 'Conta corrente', note: null, btc_amount: null, btc_unit_price_brl: null, source: 'pluggy', external_id: 't1', external_account_id: 'acc-bank', ...overrides })

describe('mapTransaction', () => {
  it('uses DEBIT/CREDIT for the direction and stores a positive amount', () => {
    expect(mapTransaction(tx(), bank)).toMatchObject({ kind: 'expense', amount_brl: 12.5, date: '2026-10-05', category: 'Alimentação', source: 'pluggy', external_id: 't1', external_account_id: 'acc-bank', pending: false })
    expect(mapTransaction(tx({ id: 't2', type: 'CREDIT', amount: 3000, category: 'Salary', description: 'Salário' }), bank)).toMatchObject({ kind: 'income', amount_brl: 3000, category: 'Salário' })
  })

  it('does not depend on the sign of the amount (it differs between checking and credit card)', () => {
    expect(mapTransaction(tx({ amount: 80, type: 'DEBIT' }), card)).toMatchObject({ kind: 'expense', amount_brl: 80 })
    expect(mapTransaction(tx({ amount: -80, type: 'DEBIT' }), bank)).toMatchObject({ kind: 'expense', amount_brl: 80 })
  })

  it('treats bill payments as transfers so they are not counted twice', () => {
    expect(mapTransaction(tx({ description: 'Pagamento de fatura cartão', category: 'Credit card payment' }), bank)).toMatchObject({ kind: 'transfer', category: 'Transferências' })
    expect(mapTransaction(tx({ type: 'CREDIT', description: 'PAGAMENTO FATURA', amount: 500 }), card)).toMatchObject({ kind: 'transfer' })
  })

  it('maps a credit on a card (that is not a bill payment) to a refund', () => {
    expect(mapTransaction(tx({ type: 'CREDIT', description: 'Estorno loja', amount: 40, category: null }), card)).toMatchObject({ kind: 'income', category: 'Estorno' })
  })

  it('flags pending transactions and trims long descriptions', () => {
    const mapped = mapTransaction(tx({ status: 'PENDING', description: ` ${'x'.repeat(200)} ` }), bank)
    expect(mapped.pending).toBe(true)
    expect(mapped.note).toHaveLength(120)
  })

  it('falls back to "Outros" for unknown or missing categories', () => {
    expect(mapCategory(null)).toBe('Outros')
    expect(mapCategory('Something unknown')).toBe('Outros')
    expect(mapCategory('Supermercado')).toBe('Mercado')
  })
})

describe('reconcile', () => {
  const base = { syncedAccountIds: new Set(['acc-bank']), windowFrom: '2026-09-01', ignored: new Set<string>() }
  const incomingOf = (...items: PluggyTransaction[]) => items.map(item => mapTransaction(item, bank))

  it('adds new transactions and keeps manual entries untouched', () => {
    const manual = local({ id: 'm1', source: 'manual', external_id: undefined, external_account_id: undefined })
    const result = reconcile({ ...base, existing: [manual], incoming: incomingOf(tx()) })
    expect(result).toHaveLength(2)
    expect(result.find(item => item.id === 'm1')).toEqual(manual)
    expect(result.find(item => item.external_id === 't1')?.id).toBeTruthy()
  })

  it('updates an existing import in place, keeping its local id and the category the user chose', () => {
    const existing = local({ category: 'Lazer', category_locked: true })
    const result = reconcile({ ...base, existing: [existing], incoming: incomingOf(tx({ amount: -15 })) })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'l1', amount_brl: 15, category: 'Lazer', category_locked: true })
  })

  it('removes imports inside the window that did not come back (pending that changed id, deleted at the bank)', () => {
    const pending = local({ id: 'p1', external_id: 'pending-1', pending: true })
    const result = reconcile({ ...base, existing: [pending], incoming: incomingOf(tx({ id: 'posted-1' })) })
    expect(result.map(item => item.external_id)).toEqual(['posted-1'])
  })

  it('keeps imports older than the window and from accounts that were not synced', () => {
    const old = local({ id: 'old', external_id: 'old', date: '2026-06-01' })
    const other = local({ id: 'other', external_id: 'other', external_account_id: 'acc-other' })
    const result = reconcile({ ...base, existing: [old, other], incoming: [] })
    expect(result.map(item => item.id).sort()).toEqual(['old', 'other'])
  })

  it('does not bring back transactions the user deleted', () => {
    const result = reconcile({ ...base, existing: [], incoming: incomingOf(tx(), tx({ id: 't2' })), ignored: new Set(['t1']) })
    expect(result.map(item => item.external_id)).toEqual(['t2'])
  })

  it('is idempotent: syncing the same data twice does not duplicate', () => {
    const first = reconcile({ ...base, existing: [], incoming: incomingOf(tx()) })
    const second = reconcile({ ...base, existing: first, incoming: incomingOf(tx()) })
    expect(second).toHaveLength(1)
    expect(second[0].id).toBe(first[0].id)
  })
})

describe('sync window', () => {
  it('loads 90 days the first time and re-reads 7 days before the last sync afterwards', () => {
    expect(syncWindowStart(null, '2026-10-08')).toBe('2026-07-10')
    expect(syncWindowStart('2026-10-08T10:00:00.000Z', '2026-10-08')).toBe('2026-10-01')
  })

  it('is stale after 6 hours', () => {
    const now = Date.parse('2026-10-08T12:00:00Z')
    expect(syncIsStale(null, now)).toBe(true)
    expect(syncIsStale('2026-10-08T07:00:00Z', now)).toBe(false)
    expect(syncIsStale('2026-10-08T05:00:00Z', now)).toBe(true)
  })
})

describe('importedBankBalance', () => {
  const connection = (accounts: FinanceConnection['accounts']): FinanceConnection => ({ id: 'i', bank: 'Banco', status: 'UPDATED', lastSyncAt: null, ignored: [], accounts })
  it('sums enabled bank accounts only; credit cards and disabled accounts are left out', () => {
    expect(importedBankBalance([connection([
      { id: 'a', name: 'CC', type: 'bank', balance: 1000, enabled: true },
      { id: 'b', name: 'Poupança', type: 'bank', balance: 500, enabled: true },
      { id: 'c', name: 'Cartão', type: 'credit', balance: 300, enabled: true },
      { id: 'd', name: 'Antiga', type: 'bank', balance: 99, enabled: false },
      { id: 'e', name: 'Sem saldo', type: 'bank', balance: null, enabled: true },
    ])])).toBe(1500)
  })
})

describe('isItemId', () => {
  it('accepts UUIDs only', () => {
    expect(isItemId('3fa85f64-5717-4562-b3fc-2c963f66afa6')).toBe(true)
    expect(isItemId(' 3FA85F64-5717-4562-B3FC-2C963F66AFA6 ')).toBe(true)
    expect(isItemId('not-an-id')).toBe(false)
    expect(isItemId('')).toBe(false)
  })
})
