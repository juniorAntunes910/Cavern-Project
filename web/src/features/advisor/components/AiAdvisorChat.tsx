import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AiDataConsentDialog } from './AiDataConsentDialog'
import { saveAiDataConsent, type AiDataCategory } from '../services/ai-data.service'
import { downloadOnDeviceModel, getOnDeviceModelStatus } from '../services/android-ai.service'
import { crisisResourcesMessage, detectImmediateRisk, reflectWithAi, type ReflectionMessage } from '../services/reflection.service'
import './ai-advisor-chat.css'

const introduction: ReflectionMessage = { role: 'assistant', content: 'Sou o orientador local do Cavern. Posso ajudar você a refletir sobre rotina, metas e como está se sentindo, usando somente as categorias que escolher. O que está pesando para você hoje?' }

export function AiAdvisorChat() {
  const [consentOpen, setConsentOpen] = useState(false)
  const [categories, setCategories] = useState<AiDataCategory[]>([])
  const [messages, setMessages] = useState<ReflectionMessage[]>([introduction])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [modelStatus, setModelStatus] = useState<'available' | 'downloadable' | 'downloading' | 'unavailable' | 'not-android'>('not-android')
  const [downloadingModel, setDownloadingModel] = useState(false)

  useEffect(() => { void getOnDeviceModelStatus().then(setModelStatus) }, [])

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

  async function send(event: FormEvent) {
    event.preventDefault()
    const message = text.trim()
    if (!message || sending) return
    setText('')
    setSending(true)
    const userMessage: ReflectionMessage = { role: 'user', content: message }
    setMessages(current => [...current, userMessage])
    try {
      const answer = await reflectWithAi(message, messages, categories)
      setMessages(current => [...current, { role: 'assistant', content: answer.reply }])
      setNotice(answer.riskLevel === 'urgent' ? 'Se você estiver em perigo imediato, procure um serviço de emergência agora.' : answer.mode === 'local' ? 'Resposta baseada em regras e métricas locais. Conversa generativa indisponível neste dispositivo.' : '')
    } catch (error) {
      const response = detectImmediateRisk(message) ? crisisResourcesMessage : 'Não consegui concluir a análise local agora. Tente novamente.'
      setMessages(current => [...current, { role: 'assistant', content: response }])
      setNotice(error instanceof Error && !detectImmediateRisk(message) ? error.message : '')
    } finally { setSending(false) }
  }

  function accept(selected: AiDataCategory[]) {
    setCategories(selected)
    saveAiDataConsent(selected)
    setConsentOpen(false)
    setEnabled(true)
    setNotice('')
  }

  function endConversation() {
    setEnabled(false)
    setCategories([])
    setMessages([introduction])
    setText('')
    setNotice('')
  }

  return <>
    <section className="panel ai-advisor-card"><div><p className="eyebrow">CAVERN ADVISOR · NO APARELHO</p><h2>Conversar e refletir</h2><p>{modelStatus === 'available' ? 'Conversa generativa local disponível neste Android.' : 'Neste dispositivo, as respostas usam regras e métricas locais. A conversa generativa precisa de um Android compatível com Gemini Nano.'} A conversa não é salva. Este recurso não faz diagnóstico nem substitui ajuda profissional.</p></div>
      {!enabled ? <><button type="button" onClick={() => setConsentOpen(true)}>Iniciar conversa</button>{modelStatus === 'downloadable' && <button className="subtle" type="button" disabled={downloadingModel} onClick={() => void downloadModel()}>{downloadingModel ? 'Baixando modelo…' : 'Baixar modelo generativo para este aparelho'}</button>}{modelStatus === 'unavailable' && <small>Este aparelho usa a análise offline do Cavern; o modelo generativo Android não está disponível.</small>}{notice && <p className="ai-chat-notice" role="status">{notice}</p>}</> : <div className="ai-chat"><div className="ai-chat-messages" aria-live="polite">{messages.map((item, index) => <p className={`ai-chat-message ${item.role}`} key={`${item.role}-${index}`}><strong>{item.role === 'assistant' ? 'Orientador local' : 'Você'}</strong><span>{item.content}</span></p>)}{sending && <p className="ai-chat-status" role="status">Analisando no aparelho…</p>}</div>
        {notice && <p className="ai-chat-notice" role="status">{notice}</p>}
        <form onSubmit={event => void send(event)}><label className="sr-only" htmlFor="ai-advisor-message">Sua mensagem</label><textarea id="ai-advisor-message" value={text} maxLength={1200} onChange={event => setText(event.target.value)} placeholder="Escreva o que você gostaria de conversar…" /><button disabled={sending || !text.trim()} type="submit">Enviar</button></form>
        <div className="ai-chat-footer"><small>Processamento e dados ficam neste aparelho.</small><button className="subtle" type="button" onClick={() => { endConversation(); setConsentOpen(true) }}>Revisar dados</button><button className="subtle" type="button" onClick={endConversation}>Encerrar</button></div>
      </div>}
    </section>
    {consentOpen && <AiDataConsentDialog purpose="conversation" onCancel={() => setConsentOpen(false)} onContinue={accept} onLocal={() => { saveAiDataConsent([]); endConversation(); setConsentOpen(false); setNotice('Acesso da IA desligado. Nenhuma categoria será analisada.') }} />}
  </>
}
