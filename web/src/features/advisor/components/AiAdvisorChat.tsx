import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { AiCloudSettings } from './AiCloudSettings'
import { AiDataConsentDialog } from './AiDataConsentDialog'
import { readAiDataConsent, saveAiDataConsent, type AiDataCategory } from '../services/ai-data.service'
import { cloudProviders, readCloudAiConfig } from '../services/cloud-ai.service'
import { downloadOnDeviceModel, getOnDeviceModelStatus } from '../services/android-ai.service'
import { crisisResourcesMessage, detectImmediateRisk, reflectWithAi, type ReflectionMessage } from '../services/reflection.service'
import './ai-advisor-chat.css'

const introduction: ReflectionMessage = { role: 'assistant', content: 'Sou o orientador local do Cavern. Posso ajudar você a refletir sobre rotina, metas e como está se sentindo, usando somente as categorias que escolher. O que está pesando para você hoje?' }
const maxLength = 1200
const suggestionsByCategory: Partial<Record<AiDataCategory, string>> = {
  goalsHabits: 'Como estão meus hábitos?',
  checkins: 'Como tem sido minha energia?',
  focus: 'Como está meu foco?',
  reading: 'Como anda minha leitura?',
  gym: 'Como estão meus treinos?',
  finance: 'Como estão meus gastos?',
  progress: 'O que eu conquistei até agora?',
}
const generalSuggestions = ['Estou me sentindo sobrecarregado', 'Quero organizar minha semana']

type ModelStatus = 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'not-android'

export function AiAdvisorChat() {
  const [consentOpen, setConsentOpen] = useState(false)
  const [categories, setCategories] = useState<AiDataCategory[]>([])
  const [messages, setMessages] = useState<ReflectionMessage[]>([introduction])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [modelStatus, setModelStatus] = useState<ModelStatus>('not-android')
  const [downloadingModel, setDownloadingModel] = useState(false)
  const [cloudConfig, setCloudConfig] = useState(() => readCloudAiConfig())
  const requestRef = useRef(0)
  const messagesRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { void getOnDeviceModelStatus().then(setModelStatus) }, [])
  useEffect(() => () => { requestRef.current += 1 }, [])
  useEffect(() => {
    const list = messagesRef.current
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  async function downloadModel() {
    setDownloadingModel(true)
    setNotice('Solicitando o modelo local do Android. A primeira instalação precisa de internet.')
    try {
      await downloadOnDeviceModel()
      setModelStatus('available')
      setNotice('Modelo generativo baixado. As conversas serão processadas no aparelho.')
    } catch {
      setNotice('Não foi possível baixar o modelo neste aparelho. A análise local básica continua disponível.')
    } finally { setDownloadingModel(false) }
  }

  async function send(value = text) {
    const message = value.trim()
    if (!message || sending) return
    const requestId = ++requestRef.current
    const history = messages
    setText('')
    setNotice('')
    setSending(true)
    setMessages([...history, { role: 'user', content: message }])
    try {
      const answer = await reflectWithAi(message, history, categories)
      if (requestRef.current !== requestId) return
      setMessages(current => [...current, { role: 'assistant', content: answer.reply }])
      if (answer.notice) setNotice(answer.notice)
      else if (answer.riskLevel === 'urgent') setNotice('Se você estiver em perigo imediato, procure um serviço de emergência agora: SAMU 192 ou CVV 188.')
    } catch {
      if (requestRef.current !== requestId) return
      if (detectImmediateRisk(message)) setMessages(current => [...current, { role: 'assistant', content: crisisResourcesMessage }])
      else {
        // Desfaz a mensagem pendente e devolve o texto ao campo para o usuário tentar de novo.
        setMessages(history)
        setText(message)
        setNotice('Não consegui concluir a análise agora. Sua mensagem foi mantida; tente enviar novamente.')
      }
    } finally {
      if (requestRef.current === requestId) {
        setSending(false)
        textareaRef.current?.focus()
      }
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void send()
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    void send()
  }

  function resetConversation() {
    requestRef.current += 1
    setSending(false)
    setMessages([introduction])
    setText('')
    setNotice('')
  }

  function endConversation() {
    resetConversation()
    setEnabled(false)
    setCategories([])
  }

  function accept(selected: AiDataCategory[]) {
    saveAiDataConsent(selected)
    setCategories(selected)
    setConsentOpen(false)
    if (enabled) setNotice('Áreas atualizadas. A conversa continua com as novas escolhas.')
    else { setEnabled(true); setNotice('') }
  }

  function declineData() {
    const revoking = Boolean(readAiDataConsent()?.categories.length)
    saveAiDataConsent([])
    setConsentOpen(false)
    if (revoking) {
      endConversation()
      setNotice('Acesso da IA desligado. Nenhuma categoria será analisada.')
    } else {
      setCategories([])
      setEnabled(true)
      setNotice(enabled ? 'Acesso aos registros removido. A conversa continua sem analisar dados.' : 'Conversa iniciada sem acesso aos seus registros.')
    }
  }

  const suggestions = [...categories.map(category => suggestionsByCategory[category]).filter((item): item is string => Boolean(item)).slice(0, 3), ...generalSuggestions].slice(0, 4)
  const cloud = Boolean(cloudConfig)
  const provider = cloudConfig ? cloudProviders[cloudConfig.provider] : null
  const generative = cloud || modelStatus === 'available'
  const trimmed = text.trim()

  return <>
    <section className="panel ai-advisor-card" aria-labelledby="ai-advisor-title"><div><p className="eyebrow">CAVERN ADVISOR</p><h2 id="ai-advisor-title">Conversar e refletir</h2><p>{cloud ? `IA na nuvem ativa: suas mensagens e as áreas liberadas são enviadas à ${provider?.company} para gerar as respostas.` : modelStatus === 'available' ? 'Conversa generativa local disponível neste Android.' : 'Sem IA na nuvem, as respostas usam regras e métricas locais. Conecte uma chave para conversar com um modelo de verdade.'} A conversa não é salva. Este recurso não faz diagnóstico nem substitui ajuda profissional.</p></div>
      <AiCloudSettings onChange={() => setCloudConfig(readCloudAiConfig())} />
      {!enabled ? <>
        <div className="ai-chat-actions"><button type="button" onClick={() => setConsentOpen(true)}>Iniciar conversa</button>{modelStatus === 'downloadable' && <button className="subtle" type="button" disabled={downloadingModel} onClick={() => void downloadModel()}>{downloadingModel ? 'Baixando modelo…' : 'Baixar modelo generativo para este aparelho'}</button>}</div>
        {modelStatus === 'downloading' && <small>O modelo generativo ainda está sendo baixado pelo Android. Enquanto isso, a análise local básica fica disponível.</small>}
        {modelStatus === 'unavailable' && <small>Este aparelho usa a análise offline do Cavern; o modelo generativo Android não está disponível.</small>}
        {notice && <p className="ai-chat-notice" role="status">{notice}</p>}
      </> : <div className="ai-chat">
        <p className="ai-chat-mode"><span className={`ai-chat-dot ${generative ? 'generated' : 'local'}`} aria-hidden="true" />{cloud ? `IA na nuvem (${provider?.label})` : generative ? 'Modelo generativo no aparelho' : 'Modo local: respostas por regras e métricas'} · {categories.length ? `${categories.length} ${categories.length === 1 ? 'área liberada' : 'áreas liberadas'}` : 'sem acesso aos registros'}</p>
        <div className="ai-chat-messages" ref={messagesRef} role="log" aria-live="polite" aria-label="Conversa com o orientador" tabIndex={0}>
          {messages.map((item, index) => <div className={`ai-chat-message ${item.role}`} key={`${item.role}-${index}`}><strong>{item.role === 'assistant' ? 'Orientador' : 'Você'}</strong><span>{item.content}</span></div>)}
          {sending && <div className="ai-chat-message assistant ai-chat-typing" role="status"><strong>Orientador</strong><span><span className="sr-only">Analisando no aparelho…</span><i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" /></span></div>}
        </div>
        {messages.length === 1 && !sending && <div className="ai-chat-suggestions" aria-label="Sugestões de assunto">{suggestions.map(item => <button className="subtle" type="button" key={item} onClick={() => void send(item)}>{item}</button>)}</div>}
        {notice && <p className="ai-chat-notice" role="status">{notice}</p>}
        <form onSubmit={submit}>
          <label className="sr-only" htmlFor="ai-advisor-message">Sua mensagem</label>
          <textarea id="ai-advisor-message" ref={textareaRef} value={text} maxLength={maxLength} rows={2} enterKeyHint="send" onKeyDown={onKeyDown} onChange={event => setText(event.target.value)} placeholder="Escreva o que você gostaria de conversar…" aria-describedby="ai-advisor-hint" />
          <button disabled={sending || !trimmed} type="submit">{sending ? 'Enviando…' : 'Enviar'}</button>
          <small id="ai-advisor-hint" className="ai-chat-hint">Enter envia · Shift+Enter quebra a linha{text.length > maxLength - 200 ? ` · ${text.length}/${maxLength}` : ''}</small>
        </form>
        <div className="ai-chat-footer"><small>{cloud ? 'A conversa não é salva; ela é enviada à nuvem só enquanto você conversa.' : 'Processamento e dados ficam neste aparelho.'}</small><button className="subtle" type="button" onClick={() => setConsentOpen(true)}>Revisar dados</button><button className="subtle" type="button" disabled={messages.length === 1 && !sending} onClick={resetConversation}>Nova conversa</button><button className="subtle" type="button" onClick={endConversation}>Encerrar</button></div>
      </div>}
    </section>
    {consentOpen && <AiDataConsentDialog purpose="conversation" onCancel={() => setConsentOpen(false)} onContinue={accept} onLocal={declineData} />}
  </>
}
