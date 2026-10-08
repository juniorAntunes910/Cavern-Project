/** Formato enxuto devolvido pela Edge Function `pluggy` (supabase/functions/pluggy). Campos sensíveis (documentos, pagador/recebedor) nunca saem do servidor. */
export type PluggyItemInfo = { id: string; bank: string; status: string; executionStatus: string | null; lastUpdatedAt: string | null }
export type PluggyAccountInfo = { id: string; name: string; type: 'bank' | 'credit'; balance: number | null; currency: string }
export type PluggyTransaction = {
  id: string
  /** ISO 8601; só os 10 primeiros caracteres (AAAA-MM-DD) são usados. */
  date: string
  description: string
  /** Valor com o sinal da Pluggy. O sentido vem de `type`. */
  amount: number
  type: 'DEBIT' | 'CREDIT'
  status: 'PENDING' | 'POSTED'
  category: string | null
  operationType: string | null
}

/** Conta importada e preferências do usuário sobre ela. */
export type FinanceAccount = { id: string; name: string; type: 'bank' | 'credit'; balance: number | null; enabled: boolean }
export type FinanceConnection = {
  /** Item ID da Pluggy. */
  id: string
  bank: string
  status: string
  lastSyncAt: string | null
  accounts: FinanceAccount[]
  /** Lançamentos importados que o usuário excluiu: não voltam na próxima sincronização. */
  ignored: string[]
}

export type PluggyRequest =
  | { action: 'item'; itemId: string }
  | { action: 'accounts'; itemId: string }
  | { action: 'transactions'; accountId: string; from: string }
