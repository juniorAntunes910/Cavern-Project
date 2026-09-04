import { useState } from 'react'
import { getLocalCheckIns, saveLocalCheckIn, today } from '../lib/local-store'
import { useLocalRevision } from '../lib/use-local-revision'

const dimensions = [
  { key: 'disciplina', label: 'Disciplina', helper: 'Como foi sua constância hoje?' },
  { key: 'foco', label: 'Foco', helper: 'Quanto você conseguiu se concentrar?' },
  { key: 'energia', label: 'Energia', helper: 'Como esteve sua disposição?' },
] as const

type Dimension = typeof dimensions[number]['key']

export function CheckIn() {
  useLocalRevision()
  const existing = getLocalCheckIns().find(item => item.date === today())
  const [scores, setScores] = useState<Record<Dimension, number>>({ disciplina: existing?.discipline ?? 3, foco: existing?.focus ?? 3, energia: existing?.energy ?? 3 })
  const [good, setGood] = useState(existing?.good_today ?? '')
  const [improve, setImprove] = useState(existing?.improve_tomorrow ?? '')
  const [saved, setSaved] = useState(false)

  function updateScore(key: Dimension, value: number) { setScores(current => ({ ...current, [key]: value })); setSaved(false) }
  function save() { saveLocalCheckIn({ date: today(), discipline: scores.disciplina, focus: scores.foco, energy: scores.energia, good_today: good, improve_tomorrow: improve }); setSaved(true) }

  return <><header><p className="eyebrow">REFLEXÃO</p><h1>Check-in de hoje</h1><p>Registre seu dia com calma e acompanhe sua evolução ao longo do mês.</p></header><section className="panel form checkin-form"><div className="checkin-form-heading"><div><h2>Como você está hoje?</h2><p>Ajuste cada indicador de 1 a 5.</p></div><span className="checkin-date">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date())}</span></div><div className="checkin-scores">{dimensions.map(dimension => <ScoreControl key={dimension.key} label={dimension.label} helper={dimension.helper} value={scores[dimension.key]} onChange={value => updateScore(dimension.key, value)} />)}</div><div className="checkin-notes"><label htmlFor="checkin-good">O que foi bom hoje?<textarea id="checkin-good" placeholder="Registre uma pequena vitória, um momento bom ou algo pelo qual você é grato." rows={4} value={good} onChange={event => { setGood(event.target.value); setSaved(false) }} /></label><label htmlFor="checkin-improve">O que melhorar amanhã?<textarea id="checkin-improve" placeholder="Escreva uma intenção simples para o próximo dia." rows={4} value={improve} onChange={event => { setImprove(event.target.value); setSaved(false) }} /></label></div><div className="checkin-submit-row"><button type="button" onClick={save}>Salvar check-in</button>{saved && <p className="saved-message" role="status">Check-in salvo para hoje.</p>}</div></section><MonthlyCheckInChart /></>
}

function ScoreControl({ label, helper, value, onChange }: { label: string; helper: string; value: number; onChange: (value: number) => void }) {
  const progress = (value - 1) / 4 * 100
  return <article className="checkin-score"><div className="checkin-score-heading"><div><strong>{label}</strong><span>{helper}</span></div><output aria-label={`${label}: ${value} de 5`}>{value}<small>/5</small></output></div><input className="checkin-range" aria-label={label} aria-valuetext={`${value} de 5`} max="5" min="1" style={{ background: `linear-gradient(to right, var(--purple) 0%, var(--purple) ${progress}%, var(--surface2) ${progress}%, var(--surface2) 100%)` }} type="range" value={value} onChange={event => onChange(Number(event.target.value))} /><div className="checkin-range-labels" aria-hidden="true"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div></article>
}

function MonthlyCheckInChart() { const items = getLocalCheckIns(); const now = new Date(); const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); const values = Array.from({ length: days }, (_, index) => { const date = localDate(now.getFullYear(), now.getMonth(), index + 1); const item = items.find(checkin => checkin.date === date); return { date, value: item ? (item.discipline + item.focus + item.energy) / 3 : 0 } }); const max = 5; return <section className="panel checkin-month"><div className="chart-title"><div><p className="eyebrow">EVOLUÇÃO</p><h2>Seu mês em um gráfico</h2></div><span>média diária dos check-ins</span></div><svg role="img" aria-label="Evolução mensal das notas de disciplina, foco e energia" viewBox="0 0 700 220" preserveAspectRatio="none"><line x1="0" x2="700" y1="180" y2="180" className="chart-axis" />{values.map((item, index) => { const height = item.value / max * 145; const x = 8 + index * (684 / Math.max(1, days - 1)); return <g key={item.date}><circle className={item.value ? 'checkin-point' : 'checkin-empty'} cx={x} cy={180 - height} r={item.value ? 4 : 2} /><title>{item.date}: {item.value ? item.value.toFixed(1) : 'sem check-in'}</title></g> })}<polyline className="checkin-line" points={values.map((item, index) => `${8 + index * (684 / Math.max(1, days - 1))},${180 - (item.value || 0) / max * 145}`).join(' ')} /></svg><div className="checkin-scale"><span>1</span><span>3</span><span>5</span></div></section> }
function localDate(year: number, month: number, day: number) { return new Date(year, month, day, 12).toLocaleDateString('en-CA') }
