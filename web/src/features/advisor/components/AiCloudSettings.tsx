import { Select } from '../../../components/Select'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { CloudAiError, clearCloudAiConfig, cloudProviders, generateCloudText, listGeminiModels, pickGeminiModel, readCloudAiConfig, saveCloudAiConfig, type CloudProvider } from '../services/cloud-ai.service'

export function AiCloudSettings({ onChange }: { onChange: (enabled: boolean) => void }) {
  const saved = readCloudAiConfig()
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState(Boolean(saved))
  const [provider, setProvider] = useState<CloudProvider>(saved?.provider ?? 'gemini')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(saved?.model ?? cloudProviders[saved?.provider ?? 'gemini'].defaultModel)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [available, setAvailable] = useState<string[]>([])
  const info = cloudProviders[provider]
  const sameAsSaved = saved?.provider === provider

  function changeProvider(next: CloudProvider) {
    setProvider(next)
    setModel(saved?.provider === next ? saved.model : cloudProviders[next].defaultModel)
    setApiKey('')
    setMessage('')
    setFailed(false)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const key = apiKey.trim() || (sameAsSaved ? saved?.apiKey : '') || ''
    if (!key) { setFailed(true); setMessage(`Cole a sua chave da API do ${info.label}.`); return }
    let config = { provider, apiKey: key, model: model.trim() || info.defaultModel }
    setBusy(true)
    setFailed(false)
    setMessage('Testando a conexão…')
    const probe = () => generateCloudText(config, 'Responda apenas "ok".', [{ role: 'user', content: 'teste' }], 16)
    try {
      try { await probe() } catch (error) {
        // Modelo inexistente ou aposentado: descobre um modelo válido para esta chave e tenta de novo.
        if (provider !== 'gemini' || !(error instanceof CloudAiError) || error.kind !== 'model') throw error
        const models = await listGeminiModels(key)
        setAvailable(models)
        const picked = pickGeminiModel(models)
        if (!picked) throw error
        config = { ...config, model: picked }
        setModel(picked)
        await probe()
      }
      saveCloudAiConfig(config)
      setEnabled(true)
      setApiKey('')
      setMessage(`Conectado ao ${info.label} (modelo ${config.model}). As próximas respostas virão da IA na nuvem.`)
      onChange(true)
    } catch (error) {
      setFailed(true)
      setMessage(error instanceof Error ? error.message : 'Não foi possível validar a chave.')
    } finally { setBusy(false) }
  }

  function remove() {
    clearCloudAiConfig()
    setEnabled(false)
    setApiKey('')
    setFailed(false)
    setMessage('Chave removida deste aparelho. A conversa volta ao modo local.')
    onChange(false)
  }

  return <div className="ai-cloud">
    <button className="subtle" type="button" aria-expanded={open} aria-controls="ai-cloud-panel" onClick={() => setOpen(value => !value)}>{enabled && saved ? `IA na nuvem: ${cloudProviders[saved.provider].label} ativo` : 'Conectar IA na nuvem'}</button>
    {open && <form id="ai-cloud-panel" className="ai-cloud-panel" onSubmit={event => void save(event)}>
      <p>Ao ativar, suas mensagens e as áreas de dados que você liberar são enviadas à {info.company} ({info.label}) para gerar cada resposta. A chave fica salva só neste navegador.</p>
      <label htmlFor="ai-cloud-provider">Provedor</label>
      <Select id="ai-cloud-provider" value={provider} onChange={event => changeProvider(event.target.value as CloudProvider)}>
        <option value="gemini">Gemini (Google) — tem camada gratuita</option>
        <option value="anthropic">Claude (Anthropic) — pago por uso</option>
      </Select>
      <label htmlFor="ai-cloud-key">Chave da API{enabled && sameAsSaved && ' (já salva; preencha só para trocar)'}</label>
      <input id="ai-cloud-key" type="password" autoComplete="off" spellCheck={false} value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder={info.keyPlaceholder} />
      <small className="ai-cloud-help">{info.keyHelp}</small>
      <label htmlFor="ai-cloud-model">Modelo</label>
      <input id="ai-cloud-model" type="text" list="ai-cloud-models" autoComplete="off" spellCheck={false} value={model} onChange={event => setModel(event.target.value)} />
      <datalist id="ai-cloud-models">{available.map(name => <option key={name} value={name} />)}</datalist>
      <div className="ai-cloud-actions"><button type="submit" disabled={busy}>{busy ? 'Testando…' : enabled && sameAsSaved ? 'Salvar e testar' : 'Conectar'}</button>{enabled && <button className="subtle" type="button" disabled={busy} onClick={remove}>Remover chave</button>}</div>
      {message && <p className={`ai-chat-notice${failed ? ' ai-cloud-error' : ''}`} role="status">{message}</p>}
    </form>}
  </div>
}
