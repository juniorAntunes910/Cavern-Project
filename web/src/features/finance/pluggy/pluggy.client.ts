import { supabase } from '../../../lib/supabase'
import type { PluggyAccountInfo, PluggyItemInfo, PluggyRequest, PluggyTransaction } from './pluggy.types'

export type PluggyErrorKind = 'unavailable' | 'auth' | 'not-found' | 'rate-limit' | 'network' | 'server'

const messages: Record<PluggyErrorKind, string> = {
  unavailable: 'A conexão bancária precisa do login do Supabase. Entre na sua conta para usar.',
  auth: 'Sua sessão expirou ou este e-mail não tem acesso. Entre novamente.',
  'not-found': 'Item não encontrado na Pluggy. Confira o Item ID e se a conexão no Meu Pluggy continua ativa.',
  'rate-limit': 'A Pluggy limitou as consultas agora. Tente novamente em um minuto.',
  network: 'Sem conexão com o servidor. Seus dados continuam salvos no aparelho.',
  server: 'O servidor da integração bancária respondeu com erro.',
}

export class PluggyError extends Error {
  kind: PluggyErrorKind
  constructor(kind: PluggyErrorKind) { super(messages[kind]); this.kind = kind }
}

async function call<T>(request: PluggyRequest): Promise<T> {
  if (!supabase) throw new PluggyError('unavailable')
  if (!navigator.onLine) throw new PluggyError('network')
  const { data, error } = await supabase.functions.invoke('pluggy', { body: request })
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status
    if (status === 401 || status === 403) throw new PluggyError('auth')
    if (status === 404) throw new PluggyError('not-found')
    if (status === 429) throw new PluggyError('rate-limit')
    throw new PluggyError(status ? 'server' : 'network')
  }
  return data as T
}

export const fetchItem = (itemId: string) => call<PluggyItemInfo>({ action: 'item', itemId })
export const fetchAccounts = (itemId: string) => call<PluggyAccountInfo[]>({ action: 'accounts', itemId })
export const fetchTransactions = (accountId: string, from: string) => call<PluggyTransaction[]>({ action: 'transactions', accountId, from })
