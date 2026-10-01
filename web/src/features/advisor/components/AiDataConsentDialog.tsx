import { useState } from 'react'
import { createPortal } from 'react-dom'
import { aiDataCategories, buildAiContext, getAiCategoryCounts, readAiDataConsent, type AiDataCategory } from '../services/ai-data.service'
import './ai-data-consent.css'

export function AiDataConsentDialog({ onCancel, onContinue, onLocal, purpose = 'challenge', periodDays = 180 }: { onCancel: () => void; onContinue: (categories: AiDataCategory[]) => void; onLocal: () => void; purpose?: 'challenge' | 'conversation' | 'review'; periodDays?: number }) {
  const previous = readAiDataConsent()
  const hasPreviousConsent = Boolean(previous?.categories.length)
  const [selected, setSelected] = useState<AiDataCategory[]>(previous?.categories ?? aiDataCategories.filter(item => !item.sensitive).map(item => item.id))
  const [previewOpen, setPreviewOpen] = useState(false)
  const counts = getAiCategoryCounts(periodDays)
  function toggle(category: AiDataCategory) { setSelected(current => current.includes(category) ? current.filter(item => item !== category) : [...current, category]) }
  return createPortal(<div className="dialog-backdrop ai-consent-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onCancel() }}>
    <section className="confirm-dialog ai-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-consent-title">
      <div className="section-heading"><div><p className="eyebrow">PRIVACIDADE DA IA</p><h2 id="ai-consent-title">Escolha o que analisar</h2></div><button className="subtle" type="button" onClick={onCancel}>Fechar</button></div>
      <p>A análise roda neste aparelho e considera os últimos {periodDays} dias de registros. Nenhum dado é enviado pela IA. Nome, e-mail, foto, arquivos e credenciais ficam de fora.</p>
      <div className="ai-consent-list">{aiDataCategories.map(category => <label className="ai-consent-option" key={category.id}>
        <input type="checkbox" checked={selected.includes(category.id)} onChange={() => toggle(category.id)} />
        <span><strong>{category.label}</strong><small>{category.description}</small></span>
        <small className="ai-consent-count">{counts[category.id]} itens</small>
      </label>)}</div>
      <button type="button" className="subtle ai-preview-toggle" disabled={!selected.length} aria-expanded={previewOpen} onClick={() => setPreviewOpen(value => !value)}>{previewOpen ? 'Ocultar prévia' : 'Ver dados exatos da análise'}</button>
      {previewOpen && selected.length > 0 && <pre className="ai-consent-preview">{JSON.stringify(buildAiContext(selected, periodDays), null, 2)}</pre>}
      <p className="ai-consent-note">Check-ins, finanças e peso corporal podem ser sensíveis. Você pode desmarcar qualquer área. A conversa não fica salva; os registros originais continuam no app.</p>
      <div className="editor-actions"><button className="subtle" type="button" onClick={onCancel}>Cancelar</button>{purpose !== 'review' && <button className="subtle" type="button" onClick={onLocal}>{purpose === 'conversation' ? hasPreviousConsent ? 'Revogar e sair da IA' : 'Continuar sem analisar dados' : 'Gerar desafio básico'}</button>}<button type="button" disabled={!selected.length} onClick={() => onContinue(selected)}>{purpose === 'conversation' ? 'Iniciar conversa local' : 'Analisar no aparelho'}</button></div>
    </section>
  </div>, document.body)
}
