export type CloudProvider = 'gemini' | 'anthropic'
export type CloudAiConfig = { provider: CloudProvider; apiKey: string; model: string }
export type CloudAiErrorKind = 'auth' | 'rate-limit' | 'network' | 'timeout' | 'server' | 'empty' | 'model' | 'bad-request'

export const cloudAiStorageKey = 'cavern.ai-cloud.v1'
export const cloudProviders: Record<CloudProvider, { label: string; company: string; defaultModel: string; keyPlaceholder: string; keyHelp: string }> = {
  gemini: { label: 'Gemini', company: 'Google', defaultModel: 'gemini-2.5-flash', keyPlaceholder: 'AIza…', keyHelp: 'Gere a chave grátis em aistudio.google.com/apikey.' },
  anthropic: { label: 'Claude', company: 'Anthropic', defaultModel: 'claude-sonnet-5-5', keyPlaceholder: 'sk-ant-…', keyHelp: 'A API da Anthropic é paga por uso (console.anthropic.com).' },
}
const timeoutMs = 45000

export class CloudAiError extends Error {
  kind: CloudAiErrorKind
  constructor(kind: CloudAiErrorKind, detail?: string) {
    super(detail ? `${cloudAiErrorMessages[kind]} (${detail})` : cloudAiErrorMessages[kind])
    this.kind = kind
  }
}

const cloudAiErrorMessages: Record<CloudAiErrorKind, string> = {
  auth: 'A chave da API foi recusada. Confira a chave em "IA na nuvem".',
  'rate-limit': 'A API da nuvem atingiu o limite de uso agora. Tente novamente em instantes.',
  network: 'Sem conexão com a API da nuvem.',
  timeout: 'A API da nuvem demorou demais para responder.',
  server: 'A API da nuvem respondeu com erro.',
  empty: 'A API da nuvem não devolveu texto.',
  model: 'O modelo escolhido não foi encontrado para esta chave.',
  'bad-request': 'A API da nuvem recusou a requisição.',
}

export function readCloudAiConfig(): CloudAiConfig | null {
  try {
    const value = JSON.parse(localStorage.getItem(cloudAiStorageKey) ?? 'null') as Partial<CloudAiConfig> | null
    if (!value || typeof value.apiKey !== 'string' || !value.apiKey.trim()) return null
    // Configurações salvas antes do seletor de provedor eram sempre da Anthropic.
    const provider: CloudProvider = value.provider === 'gemini' ? 'gemini' : 'anthropic'
    return { provider, apiKey: value.apiKey.trim(), model: typeof value.model === 'string' && value.model.trim() ? value.model.trim() : cloudProviders[provider].defaultModel }
  } catch { return null }
}

export function saveCloudAiConfig(config: CloudAiConfig) {
  localStorage.setItem(cloudAiStorageKey, JSON.stringify({ provider: config.provider, apiKey: config.apiKey.trim(), model: config.model.trim() || cloudProviders[config.provider].defaultModel }))
  window.dispatchEvent(new Event('cavern:ai-cloud-changed'))
}

export function clearCloudAiConfig() {
  localStorage.removeItem(cloudAiStorageKey)
  window.dispatchEvent(new Event('cavern:ai-cloud-changed'))
}

export type CloudChatMessage = { role: 'user' | 'assistant'; content: string }

export async function generateCloudText(config: CloudAiConfig, system: string, messages: CloudChatMessage[], maxTokens = 700): Promise<string> {
  const controller = new AbortController()
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs)
  const request = config.provider === 'gemini' ? geminiRequest(config, system, messages, maxTokens) : anthropicRequest(config, system, messages, maxTokens)
  let response: Response
  try {
    response = await send(request, controller.signal)
    // Sobrecarga momentânea (503/500) é comum; uma segunda tentativa costuma resolver.
    if (response.status === 503 || response.status === 500) { await new Promise(resolve => globalThis.setTimeout(resolve, 1200)); response = await send(request, controller.signal) }
  } catch (error) {
    throw new CloudAiError(error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network')
  } finally { globalThis.clearTimeout(timer) }
  if (!response.ok) throw await classifyError(config.provider, response)
  let data: unknown
  try { data = await response.json() } catch { throw new CloudAiError('server') }
  const text = (config.provider === 'gemini' ? readGemini(data) : readAnthropic(data)).trim()
  if (!text) throw new CloudAiError('empty')
  return text
}

function geminiRequest(config: CloudAiConfig, system: string, messages: CloudChatMessage[], maxTokens: number) {
  const generationConfig: Record<string, unknown> = { maxOutputTokens: maxTokens }
  // Modelos "flash" gastariam o limite de saída em raciocínio interno e devolveriam resposta vazia ou cortada.
  if (/flash/i.test(config.model)) generationConfig.thinkingConfig = { thinkingBudget: 0 }
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
    headers: { 'content-type': 'application/json', 'x-goog-api-key': config.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map(item => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }] })),
      generationConfig,
    }),
  }
}

function anthropicRequest(config: CloudAiConfig, system: string, messages: CloudChatMessage[], maxTokens: number) {
  return {
    url: 'https://api.anthropic.com/v1/messages',
    headers: { 'content-type': 'application/json', 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: config.model, max_tokens: maxTokens, system, messages }),
  }
}

function readGemini(data: unknown) {
  const parts = (data as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] })?.candidates?.[0]?.content?.parts ?? []
  return parts.filter(part => !part.thought).map(part => part.text ?? '').join('')
}

function readAnthropic(data: unknown) {
  const blocks = (data as { content?: { type: string; text?: string }[] })?.content ?? []
  return blocks.filter(block => block.type === 'text').map(block => block.text ?? '').join('')
}

function send(request: { url: string; headers: Record<string, string>; body: string }, signal: AbortSignal) {
  return fetch(request.url, { method: 'POST', signal, headers: request.headers, body: request.body })
}

async function classifyError(provider: CloudProvider, response: Response) {
  let message = ''
  try { message = String(((await response.json()) as { error?: { message?: string } })?.error?.message ?? '') } catch { /* corpo não é JSON */ }
  const detail = [`HTTP ${response.status}`, message.replace(/\s+/g, ' ').slice(0, 160)].filter(Boolean).join(': ')
  // O Gemini responde 400 (e não 401) para chave inválida.
  if (response.status === 401 || response.status === 403 || (provider === 'gemini' && response.status === 400 && /API key|API_KEY/i.test(message))) return new CloudAiError('auth', response.status === 403 && message ? detail : undefined)
  if (response.status === 429) return new CloudAiError('rate-limit', message ? detail : undefined)
  if (response.status === 404) return new CloudAiError('model', detail)
  if (response.status === 400) return new CloudAiError('bad-request', detail)
  return new CloudAiError('server', detail)
}

/** Lista os modelos do Gemini que aceitam generateContent para a chave informada. */
export async function listGeminiModels(apiKey: string): Promise<string[]> {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': apiKey } }).catch(() => { throw new CloudAiError('network') })
  if (!response.ok) throw await classifyError('gemini', response)
  const data = await response.json() as { models?: { name?: string; supportedGenerationMethods?: string[] }[] }
  return (data.models ?? []).filter(item => item.name && item.supportedGenerationMethods?.includes('generateContent')).map(item => String(item.name).replace(/^models\//, ''))
}

/** Prefere o "flash" estável mais novo (rápido e barato); ignora preview, experimental, lite e especializados. */
export function pickGeminiModel(names: string[]) {
  const stable = names.filter(name => /^gemini-[\d.]+-flash$/.test(name))
  const version = (name: string) => Number(name.match(/gemini-([\d.]+)-flash/)?.[1] ?? 0)
  return [...stable].sort((left, right) => version(right) - version(left))[0] ?? names.find(name => /^gemini-.*flash/.test(name) && !/preview|exp|lite|image|tts|live|thinking/.test(name)) ?? names.find(name => /^gemini-/.test(name)) ?? null
}
