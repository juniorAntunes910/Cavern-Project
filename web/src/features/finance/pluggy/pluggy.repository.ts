import { localDataKeys, readCollection, writeCollection, getLocalFinanceTransactions, type LocalFinanceTransaction } from '../../../lib/local-store'
import type { FinanceConnection } from './pluggy.types'

export const getFinanceConnections = () => readCollection<FinanceConnection>(localDataKeys.financeConnections)
export const saveFinanceConnections = (items: FinanceConnection[]) => writeCollection(localDataKeys.financeConnections, items)

export function upsertFinanceConnection(connection: FinanceConnection) {
  const others = getFinanceConnections().filter(item => item.id !== connection.id)
  saveFinanceConnections([...others, connection])
}

export function updateFinanceConnection(id: string, changes: (current: FinanceConnection) => FinanceConnection) {
  saveFinanceConnections(getFinanceConnections().map(item => item.id === id ? changes(item) : item))
}

/** Remove a conexão e, se pedido, os lançamentos que ela importou. */
export function removeFinanceConnection(id: string, removeImported: boolean) {
  const connection = getFinanceConnections().find(item => item.id === id)
  saveFinanceConnections(getFinanceConnections().filter(item => item.id !== id))
  if (!connection || !removeImported) return
  const accountIds = new Set(connection.accounts.map(account => account.id))
  const next = getLocalFinanceTransactions().filter(item => !(item.source === 'pluggy' && item.external_account_id && accountIds.has(item.external_account_id)))
  writeCollection(localDataKeys.financeTransactions, next)
}

/** O usuário excluiu um lançamento importado: guarda o id para que a próxima sincronização não o traga de volta. */
export function ignoreImportedTransaction(transaction: LocalFinanceTransaction) {
  if (transaction.source !== 'pluggy' || !transaction.external_id) return
  const accountId = transaction.external_account_id
  const owner = getFinanceConnections().find(connection => connection.accounts.some(account => account.id === accountId))
  if (!owner || owner.ignored.includes(transaction.external_id)) return
  updateFinanceConnection(owner.id, current => ({ ...current, ignored: [...current.ignored, transaction.external_id!] }))
}

export function setImportedCategory(transactionId: string, category: string) {
  writeCollection(localDataKeys.financeTransactions, getLocalFinanceTransactions().map(item => item.id === transactionId ? { ...item, category, category_locked: true } : item))
}

/** Saldo das contas correntes/poupança ativas, informado pelo banco. Cartão fica de fora: o valor é dívida, não saldo. */
export function importedBankBalance(connections: FinanceConnection[]) {
  return connections.flatMap(connection => connection.accounts).filter(account => account.enabled && account.type === 'bank' && account.balance !== null).reduce((sum, account) => sum + (account.balance ?? 0), 0)
}
