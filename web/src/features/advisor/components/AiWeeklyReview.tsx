import { Select } from '../../../components/Select'
import { useState } from 'react'
import { AiDataConsentDialog } from './AiDataConsentDialog'
import { aiDataCategories, saveAiDataConsent, type AiDataCategory, type AiMetric } from '../services/ai-data.service'
import { analyzeLocalData, type LocalAnalysis } from '../services/reflection.service'
import './ai-weekly-review.css'

type Review = { analysis: LocalAnalysis; metrics: AiMetric[]; categories: AiDataCategory[]; days: number }

export function AiWeeklyReview() {
  const [consentOpen, setConsentOpen] = useState(false)
  const [periodDays, setPeriodDays] = useState(7)
  const [review, setReview] = useState<Review | null>(null)
  const [error, setError] = useState('')
  const metricById = new Map(review?.metrics.map(metric => [metric.id, metric]) ?? [])

  function choose(selected: AiDataCategory[]) {
    try {
      const result = analyzeLocalData(selected, periodDays)
      saveAiDataConsent(selected)
      setReview({ ...result, categories: selected, days: periodDays })
      setError('')
      setConsentOpen(false)
    } catch {
      setError('Não foi possível analisar os registros neste aparelho. Feche a seleção e tente novamente.')
    }
  }

  return <section className="panel ai-review" aria-labelledby="ai-weekly-title">
    <div><p className="eyebrow">REVISÃO LOCAL</p><h2 id="ai-weekly-title">Revisão dos registros</h2><p>Veja fatos e perguntas calculados no aparelho. Os dados podem estar incompletos; nenhum passo é aplicado automaticamente.</p></div>
    <div className="ai-review-controls">
      <label htmlFor="ai-review-period">Período<Select compact id="ai-review-period" value={periodDays} onChange={event => setPeriodDays(Number(event.target.value))}><option value={7}>Últimos 7 dias</option><option value={30}>Últimos 30 dias</option><option value={180}>Últimos 180 dias</option></Select></label>
      <button type="button" onClick={() => setConsentOpen(true)}>{review ? 'Criar nova revisão' : 'Criar revisão'}</button>
    </div>
    {review && review.days !== periodDays && <p className="ai-review-note" role="status">A revisão exibida usa {review.days} dias. Crie uma nova revisão para aplicar o período escolhido.</p>}
    {error && <p className="ai-review-error" role="alert">{error}</p>}
    {review && <div className="ai-review-results">
      <p><strong>Período:</strong> últimos {review.days} dias</p>
      <p><strong>Áreas incluídas:</strong> {aiDataCategories.filter(item => review.categories.includes(item.id)).map(item => item.label).join(', ')}</p>
      <p>{review.analysis.summary}</p>
      <h3>Observações e evidências</h3>
      <div className="ai-review-list">{review.analysis.patterns.map((pattern, index) => <article className="ai-review-item" key={`${pattern.category}-${index}`}><strong>{pattern.category}</strong><p>{pattern.statement}</p><small>Confiança {({ LOW: 'baixa', MEDIUM: 'média', HIGH: 'alta' })[pattern.confidence]}</small>{pattern.metricRefs.length > 0 && <details><summary>Ver métricas de origem</summary><ul>{pattern.metricRefs.map(id => { const metric = metricById.get(id); return metric ? <li key={id}>{metric.label}: {metric.value} {metric.unit} ({metric.period})</li> : null })}</ul></details>}</article>)}</div>
      <h3>Perguntas para refletir</h3><ul>{review.analysis.reflectionQuestions.map(question => <li key={question}>{question}</li>)}</ul>
      <h3>Passos opcionais</h3><ul>{review.analysis.recommendations.map(item => <li key={item.title}><strong>{item.title}:</strong> {item.reason}</li>)}</ul>
    </div>}
    {consentOpen && <AiDataConsentDialog purpose="review" periodDays={periodDays} onCancel={() => setConsentOpen(false)} onContinue={choose} onLocal={() => setConsentOpen(false)} />}
  </section>
}
