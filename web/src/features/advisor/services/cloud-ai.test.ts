import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearCloudAiConfig, cloudAiStorageKey, pickGeminiModel, readCloudAiConfig, saveCloudAiConfig } from './cloud-ai.service'
import { reflectWithAi } from './reflection.service'

const anthropicOk = (text: string) => new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { status: 200 })
const geminiOk = (text: string) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 })
const history = [{ role: 'assistant' as const, content: 'saudação' }, { role: 'user' as const, content: 'oi' }, { role: 'assistant' as const, content: 'olá' }]

afterEach(() => { clearCloudAiConfig(); vi.unstubAllGlobals() })

describe('IA na nuvem — Gemini', () => {
  it('usa a API do Gemini com papéis user/model e a chave no cabeçalho', async () => {
    saveCloudAiConfig({ provider: 'gemini', apiKey: 'AIza-test', model: 'gemini-test' })
    const fetchMock = vi.fn().mockResolvedValue(geminiOk('Oi! Como posso ajudar?'))
    vi.stubGlobal('fetch', fetchMock)
    const answer = await reflectWithAi('estou cansado', history, [])
    expect(answer).toMatchObject({ mode: 'cloud', reply: 'Oi! Como posso ajudar?' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/models/gemini-test:generateContent')
    expect(init.headers['x-goog-api-key']).toBe('AIza-test')
    expect(url).not.toContain('AIza-test')
    const body = JSON.parse(init.body)
    expect(body.contents.map((item: { role: string }) => item.role)).toEqual(['user', 'model', 'user'])
    expect(body.systemInstruction.parts[0].text).toContain('orientador')
  })

  it('trata 400 de chave inválida como erro de autenticação e cai para o modo local', async () => {
    saveCloudAiConfig({ provider: 'gemini', apiKey: 'ruim', model: 'gemini-2.5-flash' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":{"message":"API key not valid. Please pass a valid API key."}}', { status: 400 })))
    const answer = await reflectWithAi('como estão meus hábitos?', [], ['goalsHabits'])
    expect(answer.mode).toBe('local')
    expect(answer.notice).toContain('chave')
  })

  it('avisa quando o Gemini responde sem texto (bloqueio de segurança)', async () => {
    saveCloudAiConfig({ provider: 'gemini', apiKey: 'AIza-test', model: 'gemini-2.5-flash' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'SAFETY' }] }), { status: 200 })))
    const answer = await reflectWithAi('oi', [], [])
    expect(answer.mode).toBe('local')
    expect(answer.notice).toContain('não devolveu texto')
  })
})

describe('IA na nuvem — Claude e geral', () => {
  it('envia a conversa começando por mensagem do usuário', async () => {
    saveCloudAiConfig({ provider: 'anthropic', apiKey: 'sk-test', model: 'claude-test' })
    const fetchMock = vi.fn().mockResolvedValue(anthropicOk('Olá!'))
    vi.stubGlobal('fetch', fetchMock)
    const answer = await reflectWithAi('estou cansado', [{ role: 'assistant', content: 'saudação' }], [])
    expect(answer.mode).toBe('cloud')
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body).messages[0].role).toBe('user')
    expect(init.headers['x-api-key']).toBe('sk-test')
  })

  it('considera Anthropic uma configuração antiga sem provedor', () => {
    localStorage.setItem(cloudAiStorageKey, JSON.stringify({ apiKey: 'sk-old', model: 'claude-old' }))
    expect(readCloudAiConfig()?.provider).toBe('anthropic')
  })

  it('não chama a nuvem em mensagem de risco imediato', async () => {
    saveCloudAiConfig({ provider: 'gemini', apiKey: 'AIza-test', model: 'gemini-2.5-flash' })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const answer = await reflectWithAi('quero me matar', [], [])
    expect(answer.riskLevel).toBe('urgent')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('diagnóstico de erros do Gemini', () => {
  const body = (status: number, message: string) => new Response(JSON.stringify({ error: { message } }), { status })

  it('mostra o motivo real quando o modelo não existe (404)', async () => {
    saveCloudAiConfig({ provider: 'gemini', apiKey: 'AIza-test', model: 'gemini-antigo' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(body(404, 'models/gemini-antigo is not found for API version v1beta')))
    const answer = await reflectWithAi('oi', [], [])
    expect(answer.mode).toBe('local')
    expect(answer.notice).toContain('modelo escolhido não foi encontrado')
    expect(answer.notice).toContain('HTTP 404')
  })

  it('tenta de novo uma vez em 503 e usa a resposta se o retry funcionar', async () => {
    saveCloudAiConfig({ provider: 'gemini', apiKey: 'AIza-test', model: 'gemini-2.5-flash' })
    const fetchMock = vi.fn().mockResolvedValueOnce(body(503, 'The model is overloaded.')).mockResolvedValueOnce(geminiOk('Funcionou na segunda.'))
    vi.stubGlobal('fetch', fetchMock)
    const answer = await reflectWithAi('oi', [], [])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(answer).toMatchObject({ mode: 'cloud', reply: 'Funcionou na segunda.' })
  })

  it('escolhe o flash estável mais novo e ignora preview/lite', () => {
    expect(pickGeminiModel(['gemini-2.5-pro', 'gemini-2.5-flash-lite', 'gemini-3.0-flash-preview', 'gemini-2.5-flash', 'gemini-3-flash'])).toBe('gemini-3-flash')
    expect(pickGeminiModel(['gemini-2.0-flash', 'gemini-2.5-flash'])).toBe('gemini-2.5-flash')
    expect(pickGeminiModel(['embedding-001'])).toBeNull()
  })
})
