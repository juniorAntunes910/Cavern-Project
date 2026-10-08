import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { FinanceConnection } from './pluggy.types'

const connection: FinanceConnection = { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', bank: 'Banco Teste', status: 'UPDATED', lastSyncAt: null, ignored: [], accounts: [{ id: 'a', name: 'Conta', type: 'bank', balance: 10, enabled: true }] }

async function panel(supabaseConfigured: boolean, connections: FinanceConnection[]) {
  vi.resetModules()
  vi.doMock('../../../lib/supabase', () => ({ supabaseConfigured, supabase: null, allowedEmail: '' }))
  const { PluggyPanel } = await import('./PluggyPanel')
  return renderToString(<PluggyPanel connections={connections} onMessage={() => undefined} />)
}

describe('PluggyPanel is optional', () => {
  it('renders nothing without Supabase login and without connections, so Finance works on its own', async () => {
    expect(await panel(false, [])).toBe('')
  })

  it('is a collapsed, discreet section when logged in but no bank is connected', async () => {
    const html = await panel(true, [])
    expect(html).toContain('pluggy-optional')
    expect(html).toContain('opcional')
    expect(html).not.toContain('Banco Teste')
  })

  it('shows the full panel when there are connections', async () => {
    const html = await panel(true, [connection])
    expect(html).toContain('Contas conectadas')
    expect(html).toContain('Banco Teste')
    expect(html).not.toContain('pluggy-optional')
  })

  it('keeps showing existing connections without Supabase (read-only, with a notice)', async () => {
    const html = await panel(false, [connection])
    expect(html).toContain('Banco Teste')
    expect(html).toContain('continuam aqui')
  })
})
