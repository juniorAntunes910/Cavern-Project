import type { Challenge } from '../../challenges/domain/challenge'
import type { LocalAnalysis } from '../services/reflection.service'
import type { AiMetric } from '../services/ai-data.service'
import './ai-analysis.css'

export function AiAnalysisDialog({ analysis, metrics, challenge, onEdit, onDiscard }: { analysis: LocalAnalysis; metrics: AiMetric[]; challenge: Challenge; onEdit: () => void; onDiscard: () => void }) {
  const metricById = new Map(metrics.map(metric => [metric.id, metric]))
  const confidence = { LOW: 'baixa', MEDIUM: 'média', HIGH: 'alta' }
  return <div className="dialog-backdrop ai-analysis-backdrop">
    <section className="confirm-dialog ai-analysis-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-analysis-title">
      <div className="section-heading"><div><p className="eyebrow">CAVERN ADVISOR · ANÁLISE LOCAL</p><h2 id="ai-analysis-title">Uma revisão dos seus registros</h2></div></div>
      <p className="ai-analysis-boundary">Esta análise local resume seus registros; não é uma avaliação psicológica nem um diagnóstico. O nível de confiança é qualitativo, não uma probabilidade clínica.</p>
      <section><h3>Resumo</h3><p>{analysis.summary}</p></section>
      {analysis.patterns.length > 0 && <section><h3>Possíveis padrões</h3><div className="ai-analysis-list">{analysis.patterns.map((pattern, index) => <article className="ai-analysis-item" key={`${pattern.category}-${index}`}><p>{pattern.statement}</p><small>Observação ou hipótese · confiança {confidence[pattern.confidence]}</small>{pattern.metricRefs.length > 0 && <ul>{pattern.metricRefs.map(id => { const metric = metricById.get(id); return metric ? <li key={id}>{metric.label}: <strong>{metric.value} {metric.unit}</strong> <small>({metric.period})</small></li> : null })}</ul>}</article>)}</div></section>}
      {analysis.reflectionQuestions.length > 0 && <section><h3>Perguntas para refletir</h3><ul>{analysis.reflectionQuestions.map((question, index) => <li key={index}>{question}</li>)}</ul></section>}
      {analysis.recommendations.length > 0 && <section><h3>Passos opcionais</h3><div className="ai-analysis-list">{analysis.recommendations.map((item, index) => <article className="ai-analysis-item" key={index}><strong>{item.title}</strong><p>{item.reason}</p></article>)}</div></section>}
      <section className="ai-analysis-challenge"><h3>Desafio sugerido: {challenge.name}</h3><p>{challenge.description} · {challenge.durationDays} dias</p><p>Você poderá revisar as regras antes de salvar ou iniciar.</p></section>
      <div className="editor-actions"><button className="subtle" type="button" onClick={onDiscard}>Descartar sugestão</button><button type="button" onClick={onEdit}>Revisar desafio</button></div>
    </section>
  </div>
}
