import type { FinanceKind, LocalFinanceTransaction } from '../../../lib/local-store'
import type { PluggyTransaction } from './pluggy.types'

export type MappedTransaction = Omit<LocalFinanceTransaction, 'id'> & { external_id: string; external_account_id: string }

/** Pagamento de fatura e transferência entre contas próprias saem de uma conta e entram na outra: contar as duas inflaria receitas e despesas. */
const billPayment = /pagamento\s+(de\s+)?fatura|pagto\.?\s+fatura|fatura\s+(do\s+)?cart[aã]o|credit\s+card\s+payment/i
const ownTransfer = /same.?person|mesma\s+titularidade|pr[oó]pria\s+conta|transfer[eê]ncia\s+entre\s+contas/i

const categoryRules: [RegExp, string][] = [
  [/grocer|supermarket|mercado/i, 'Mercado'],
  [/restaurant|eating|food|delivery|bakery|aliment|padaria|lanche/i, 'Alimentação'],
  [/transport|taxi|ride|fuel|parking|gas station|combust|uber/i, 'Transporte'],
  [/health|pharmac|doctor|sa[uú]de|farm[aá]cia/i, 'Saúde'],
  [/entertain|streaming|leisure|games|lazer|cinema/i, 'Lazer'],
  [/educat|school|course|educa[cç]/i, 'Educação'],
  [/rent|housing|home|moradia|aluguel|condom/i, 'Moradia'],
  [/utilit|telecom|internet|energy|water|conta de/i, 'Contas'],
  [/shopping|clothing|retail|compras|electronics/i, 'Compras'],
  [/salary|payroll|income|sal[aá]rio|wage/i, 'Salário'],
  [/invest|fixed income|renda fixa|equity/i, 'Investimentos'],
  [/transfer/i, 'Transferências'],
  [/refund|estorno/i, 'Estorno'],
]

export const importedCategories = ['Mercado', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Moradia', 'Contas', 'Compras', 'Salário', 'Investimentos', 'Transferências', 'Estorno', 'Outros']

export function mapCategory(raw: string | null) {
  if (!raw) return 'Outros'
  return categoryRules.find(([pattern]) => pattern.test(raw))?.[1] ?? 'Outros'
}

/**
 * Converte uma transação da Pluggy num lançamento do app.
 * O sentido vem de `type` (DEBIT/CREDIT), não do sinal de `amount`: o sinal varia entre conta corrente e cartão.
 */
export function mapTransaction(item: PluggyTransaction, account: { id: string; name: string; type: 'bank' | 'credit' }): MappedTransaction {
  const text = `${item.description} ${item.category ?? ''}`
  const isTransfer = billPayment.test(text) || ownTransfer.test(item.category ?? '')
  let kind: FinanceKind
  if (isTransfer) kind = 'transfer'
  else kind = item.type === 'CREDIT' ? 'income' : 'expense'
  // Crédito numa fatura de cartão é estorno, não renda.
  const refund = account.type === 'credit' && item.type === 'CREDIT' && !isTransfer
  return {
    date: item.date.slice(0, 10),
    kind,
    amount_brl: Math.round(Math.abs(item.amount) * 100) / 100,
    category: isTransfer ? 'Transferências' : refund ? 'Estorno' : mapCategory(item.category),
    account: account.name,
    note: item.description.trim().slice(0, 120) || null,
    btc_amount: null,
    btc_unit_price_brl: null,
    source: 'pluggy',
    external_id: item.id,
    external_account_id: account.id,
    pending: item.status === 'PENDING',
  }
}
