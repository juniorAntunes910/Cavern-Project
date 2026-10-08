// Proxy mínimo para a API da Pluggy (https://docs.pluggy.ai). Roda no Supabase Edge Functions (Deno).
//
// Por que existe: a API key da Pluggy (gerada com CLIENT_ID + CLIENT_SECRET) dá acesso total e não pode ir para o app.
// O app chama esta função com o JWT do login; ela confere o usuário e devolve só os campos que o Financeiro usa.
//
// Segredos (supabase secrets set ...): PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET, ALLOWED_EMAIL.
// SUPABASE_URL e SUPABASE_ANON_KEY já vêm do ambiente.
import { createClient } from 'npm:@supabase/supabase-js@2'

const PLUGGY = 'https://api.pluggy.ai'
const ITEM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_PAGES = 20

const cors = {
  // O app roda em origens variadas (dev, https://localhost no Capacitor, file:// no Electron); a proteção é o JWT + e-mail permitido.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', ...extra } })

class HttpError extends Error { constructor(public status: number, public retryAfter?: string) { super(String(status)) } }

// A API key vale 2h; guardamos em memória do worker e renovamos ao receber 401.
let cachedKey: { value: string; expires: number } | null = null
async function apiKey(force = false) {
  if (!force && cachedKey && cachedKey.expires > Date.now()) return cachedKey.value
  const response = await fetch(`${PLUGGY}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: Deno.env.get('PLUGGY_CLIENT_ID'), clientSecret: Deno.env.get('PLUGGY_CLIENT_SECRET') }),
  })
  if (!response.ok) throw new HttpError(response.status === 429 ? 429 : 502)
  const { apiKey: value } = await response.json() as { apiKey: string }
  cachedKey = { value, expires: Date.now() + 100 * 60_000 }
  return value
}

async function pluggy<T>(path: string, retry = true): Promise<T> {
  const response = await fetch(`${PLUGGY}${path}`, { headers: { 'X-API-KEY': await apiKey(), Accept: 'application/json' } })
  if (response.status === 401 && retry) { await apiKey(true); return pluggy<T>(path, false) }
  if (response.status === 404) throw new HttpError(404)
  if (response.status === 429) throw new HttpError(429, response.headers.get('Retry-After') ?? '60')
  if (!response.ok) throw new HttpError(502)
  return await response.json() as T
}

type Body = { action?: string; itemId?: string; accountId?: string; from?: string }

async function handle(body: Body) {
  if (body.action === 'item') {
    if (!body.itemId || !ITEM_ID.test(body.itemId)) throw new HttpError(400)
    const item = await pluggy<{ id: string; status: string; executionStatus?: string; lastUpdatedAt?: string; connector?: { name?: string } }>(`/items/${body.itemId}`)
    return { id: item.id, bank: item.connector?.name ?? 'Banco', status: item.status, executionStatus: item.executionStatus ?? null, lastUpdatedAt: item.lastUpdatedAt ?? null }
  }
  if (body.action === 'accounts') {
    if (!body.itemId || !ITEM_ID.test(body.itemId)) throw new HttpError(400)
    const page = await pluggy<{ results: { id: string; type: string; subtype?: string; name?: string; marketingName?: string; balance?: number; currencyCode?: string }[] }>(`/accounts?itemId=${body.itemId}`)
    return page.results.map(account => ({
      id: account.id,
      name: account.marketingName || account.name || 'Conta',
      type: account.type === 'CREDIT' ? 'credit' : 'bank',
      balance: typeof account.balance === 'number' ? account.balance : null,
      currency: account.currencyCode ?? 'BRL',
    }))
  }
  if (body.action === 'transactions') {
    if (!body.accountId || !ITEM_ID.test(body.accountId) || !body.from || !DATE.test(body.from)) throw new HttpError(400)
    // GET /v2/transactions pagina por cursor. VALIDAR NO SANDBOX o formato do campo `next` (URL com ?after= ou o próprio cursor).
    const rows: unknown[] = []
    let after: string | null = null
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const query = new URLSearchParams({ accountId: body.accountId, from: body.from, pageSize: '500' })
      if (after) query.set('after', after)
      const data = await pluggy<{ results: Record<string, unknown>[]; next?: string | null }>(`/v2/transactions?${query}`)
      rows.push(...data.results)
      const next: string | null = data.next ?? null
      if (!next) break
      after = next.includes('after=') ? new URL(next, PLUGGY).searchParams.get('after') : next
      if (!after) break
    }
    // Só o necessário: descartamos paymentData (nome/documento de quem pagou/recebeu), números de cartão etc.
    return rows.map(row => ({
      id: row.id,
      date: row.date,
      description: String(row.descriptionRaw ?? row.description ?? ''),
      amount: row.amount,
      type: row.type,
      status: row.status ?? 'POSTED',
      category: (row.categoryTranslated ?? row.category ?? null),
      operationType: row.operationType ?? null,
    }))
  }
  throw new HttpError(400)
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json({ error: 'method' }, 405)
  try {
    const token = request.headers.get('Authorization')
    if (!token) return json({ error: 'auth' }, 401)
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: token } } })
    const { data, error } = await supabase.auth.getUser()
    const allowed = (Deno.env.get('ALLOWED_EMAIL') ?? '').trim().toLowerCase()
    if (error || !data.user) return json({ error: 'auth' }, 401)
    // Sem ALLOWED_EMAIL configurado a função não responde a ninguém: o app é de uso pessoal.
    if (!allowed || data.user.email?.toLowerCase() !== allowed) return json({ error: 'forbidden' }, 403)
    return json(await handle(await request.json() as Body))
  } catch (error) {
    if (error instanceof HttpError) return json({ error: String(error.status) }, error.status, error.retryAfter ? { 'Retry-After': error.retryAfter } : {})
    return json({ error: 'server' }, 500)
  }
})
