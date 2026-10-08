import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetStorage } from '../../../test/helpers'
import { getLocalFinanceTransactions } from '../../../lib/local-store'
import { getFinanceConnections, ignoreImportedTransaction, removeFinanceConnection, setImportedCategory } from './pluggy.repository'
import type { PluggyTransaction } from './pluggy.types'

vi.mock('./pluggy.client', () => ({ fetchItem: vi.fn(), fetchAccounts: vi.fn(), fetchTransactions: vi.fn() }))
import * as client from './pluggy.client'
import { connectItem, syncAll } from './pluggy.service'

const ITEM = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
const row = (id: string, overrides: Partial<PluggyTransaction> = {}): PluggyTransaction => ({ id, date: `${new Date().toLocaleDateString('en-CA')}T00:00:00.000Z`, description: `Compra ${id}`, amount: -10, type: 'DEBIT', status: 'POSTED', category: 'Groceries', operationType: null, ...overrides })

beforeEach(() => {
  resetStorage()
  vi.mocked(client.fetchItem).mockResolvedValue({ id: ITEM, bank: 'Banco Teste', status: 'UPDATED', executionStatus: 'SUCCESS', lastUpdatedAt: null })
  vi.mocked(client.fetchAccounts).mockResolvedValue([{ id: 'acc-1', name: 'Conta', type: 'bank', balance: 250, currency: 'BRL' }])
  vi.mocked(client.fetchTransactions).mockResolvedValue([row('a'), row('b')])
})

describe('Pluggy sync', () => {
  it('connects an item, imports on sync and does not duplicate on a second sync', async () => {
    await connectItem(ITEM)
    expect(getFinanceConnections()).toHaveLength(1)
    expect(getLocalFinanceTransactions()).toHaveLength(0)

    expect(await syncAll()).toMatchObject({ imported: 2, removed: 0, failed: [] })
    expect(getLocalFinanceTransactions().map(item => item.external_id).sort()).toEqual(['a', 'b'])
    expect(getFinanceConnections()[0].lastSyncAt).not.toBeNull()

    expect(await syncAll()).toMatchObject({ imported: 0, removed: 0 })
    expect(getLocalFinanceTransactions()).toHaveLength(2)
  })

  it('does not bring back an imported transaction the user deleted, and keeps a category the user chose', async () => {
    await connectItem(ITEM)
    await syncAll()
    const [first, second] = getLocalFinanceTransactions()
    ignoreImportedTransaction(first)
    setImportedCategory(second.id, 'Lazer')
    removeFinanceConnection('nada', false) // conexão inexistente: sem efeito
    localStorage.setItem('cavern.local.finance-transactions.v1', JSON.stringify(getLocalFinanceTransactions().filter(item => item.id !== first.id)))

    await syncAll()
    const after = getLocalFinanceTransactions()
    expect(after.map(item => item.external_id)).toEqual([second.external_id])
    expect(after[0]).toMatchObject({ category: 'Lazer', category_locked: true })
  })

  it('removes an import that disappeared at the bank within the window', async () => {
    await connectItem(ITEM)
    await syncAll()
    vi.mocked(client.fetchTransactions).mockResolvedValue([row('a')])
    expect(await syncAll()).toMatchObject({ imported: 0, removed: 1 })
    expect(getLocalFinanceTransactions().map(item => item.external_id)).toEqual(['a'])
  })

  it('skips accounts the user turned off', async () => {
    await connectItem(ITEM)
    const [connection] = getFinanceConnections()
    localStorage.setItem('cavern.local.finance-connections.v1', JSON.stringify([{ ...connection, accounts: connection.accounts.map(account => ({ ...account, enabled: false })) }]))
    await syncAll()
    expect(client.fetchTransactions).not.toHaveBeenCalled()
  })

  it('reports a failure without throwing, and stops on an expired session', async () => {
    await connectItem(ITEM)
    vi.mocked(client.fetchItem).mockRejectedValue(Object.assign(new Error('Sua sessão expirou.'), { kind: 'auth' }))
    const result = await syncAll()
    expect(result.failed).toEqual(['Sua sessão expirou.'])
    expect(getLocalFinanceTransactions()).toHaveLength(0)
  })

  it('removing a connection also removes what it imported, never manual entries', async () => {
    await connectItem(ITEM)
    await syncAll()
    const manual = { id: 'manual-1', date: '2026-10-01', kind: 'expense', amount_brl: 5, category: 'x', account: 'Principal', note: null, btc_amount: null, btc_unit_price_brl: null }
    localStorage.setItem('cavern.local.finance-transactions.v1', JSON.stringify([manual, ...getLocalFinanceTransactions()]))
    removeFinanceConnection(ITEM, true)
    expect(getFinanceConnections()).toHaveLength(0)
    expect(getLocalFinanceTransactions().map(item => item.id)).toEqual(['manual-1'])
  })
})
