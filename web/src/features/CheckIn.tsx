import { useEffect, useState } from 'react'
import { getLocalCheckIns, saveLocalCheckIn, today, type LocalCheckIn } from '../lib/local-store'
import { useLocalRevision } from '../lib/use-local-revision'
import './checkin.css'

const dimensions = [
  { key: 'discipline', label: 'Disciplina', helper: 'Quanto você cumpriu o que se propôs a fazer?' },
  { key: 'focus', label: 'Foco', helper: 'Quanto conseguiu se concentrar?' },
  { key: 'energy', label: 'Energia', helper: 'Como esteve sua disposição?' },
] as const
type Dimension = typeof dimensions[number]['key']
const scoreLabels = ['Muito baixa', 'Baixa', 'Regular', 'Boa', 'Muito boa']
const displayDate = (date: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(date + 'T12:00:00'))

export function CheckIn() {
  useLocalRevision()
  const [date, setDate] = useState(today)
  useEffect(() => {
    const refresh = () => setDate(today())
    const timer = window.setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  const items = getLocalCheckIns()
  return <><header><p className="eyebrow">REFLEXÃO DIÁRIA</p><h1>Como foi seu dia?</h1><p>Uma pausa para reconhecer o que funcionou e escolher um passo para amanhã.</p></header>
    <DailyForm key={date} date={date} existing={items.find(item => item.date === date)} />
    <MonthlyCheckInChart items={items} date={date} />
    <section className="panel checkin-history"><h2>Suas últimas reflexões</h2>{items.length === 0 ? <p>Seu primeiro registro aparecerá aqui.</p> : [...items].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).map(item => <details key={item.id}><summary>{displayDate(item.date)} <span>{dimensions.map(d => d.label + ': ' + item[d.key]).join(' · ')}</span></summary><p><strong>O que foi bom:</strong> {item.good_today || 'Sem anotação.'}</p><p><strong>Próximo passo:</strong> {item.improve_tomorrow || 'Sem anotação.'}</p></details>)}</section>
  </>
}

function DailyForm({ date, existing }: { date: string; existing?: LocalCheckIn }) {
  const [scores, setScores] = useState<Record<Dimension, number>>({ discipline: existing?.discipline ?? 3, focus: existing?.focus ?? 3, energy: existing?.energy ?? 3 })
  const [good, setGood] = useState(existing?.good_today ?? '')
  const [improve, setImprove] = useState(existing?.improve_tomorrow ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  function save() {
    try {
      saveLocalCheckIn({ date, ...scores, good_today: good.trim(), improve_tomorrow: improve.trim() })
      setSaved(true); setError('')
    } catch { setError('Não foi possível salvar. Verifique o espaço disponível e tente novamente.') }
  }
  return <section className="panel form checkin-form"><div className="checkin-form-heading"><div><h2>{existing ? 'Seu registro de hoje' : 'Check-in de hoje'}</h2><p>1 = muito baixa · 3 = regular · 5 = muito boa. Você pode atualizar seu registro.</p></div><time className="checkin-date" dateTime={date}>{displayDate(date)}</time></div>
    <div className="checkin-scores">{dimensions.map(d => <fieldset className="checkin-score" key={d.key}><legend>{d.label}</legend><p>{d.helper}</p><div className="score-options">{scoreLabels.map((label, index) => <label key={label}><input type="radio" name={d.key} value={index + 1} checked={scores[d.key] === index + 1} onChange={() => { setScores(current => ({ ...current, [d.key]: index + 1 })); setSaved(false) }} /><span>{index + 1}<small>{label}</small></span></label>)}</div></fieldset>)}</div>
    <div className="checkin-notes"><label htmlFor="checkin-good">O que foi bom hoje? <small>Opcional</small><textarea id="checkin-good" rows={3} placeholder="Uma pequena vitória ou algo pelo qual você é grato." value={good} onChange={e => { setGood(e.target.value); setSaved(false) }} /></label><label htmlFor="checkin-improve">Um passo para amanhã <small>Opcional</small><textarea id="checkin-improve" rows={3} placeholder="Uma intenção simples e possível." value={improve} onChange={e => { setImprove(e.target.value); setSaved(false) }} /></label></div>
    <div className="checkin-submit-row"><button type="button" onClick={save} disabled={saved}>{saved ? 'Salvo' : existing ? 'Atualizar check-in' : 'Salvar check-in'}</button><p role="status">{saved ? 'Seu dia foi registrado.' : error || 'Um registro por dia, sem cobrança de perfeição.'}</p></div>
  </section>
}

function MonthlyCheckInChart({ items, date }: { items: LocalCheckIn[]; date: string }) {
  const [month, setMonth] = useState(date.slice(0, 7))
  const [metric, setMetric] = useState<Dimension>('discipline')
  const [year, monthNumber] = month.split('-').map(Number)
  const days = new Date(year, monthNumber, 0).getDate()
  const byDate = new Map(items.filter(item => item.date.startsWith(month) && item.date <= date).map(item => [item.date, item]))
  const records = [...byDate.values()]
  const label = dimensions.find(d => d.key === metric)!.label
  const x = (day: number) => 36 + (day - 1) * 584 / (days - 1)
  const y = (value: number) => 190 - (value - 1) * 40
  // Missing days break the path; they are never plotted as zero.
  let connected = false
  const path = Array.from({ length: days }, (_, i) => {
    const item = byDate.get(month + '-' + String(i + 1).padStart(2, '0'))
    if (!item) { connected = false; return '' }
    const segment = (connected ? 'L' : 'M') + x(i + 1) + ',' + y(item[metric])
    connected = true
    return segment
  }).join(' ')
  function moveMonth(offset: number) {
    const next = new Date(year, monthNumber - 1 + offset, 1)
    setMonth(next.getFullYear() + '-' + String(next.getMonth() + 1).padStart(2, '0'))
  }
  return <section className="panel checkin-month"><div className="chart-title"><div><p className="eyebrow">EVOLUÇÃO</p><h2>Observe seu ritmo</h2></div><div className="checkin-month-nav"><button className="subtle" aria-label="Mês anterior" onClick={() => moveMonth(-1)}>‹</button><span>{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1))}</span><button className="subtle" aria-label="Próximo mês" disabled={month >= date.slice(0, 7)} onClick={() => moveMonth(1)}>›</button></div></div>
    <p>{records.length} dia(s) registrado(s). Dias sem check-in ficam em branco.</p>
    <div className="checkin-metrics">{dimensions.map(d => <button key={d.key} className="subtle" aria-pressed={metric === d.key} onClick={() => setMetric(d.key)}>{d.label}<strong>{records.length ? (records.reduce((sum, item) => sum + item[d.key], 0) / records.length).toFixed(1) + ' / 5' : '—'}</strong><small>Média dos registros</small></button>)}</div>
    {records.length === 0 ? <p className="empty">Nenhum check-in neste mês. Salve seu dia para começar a acompanhar a evolução.</p> : <><div className="checkin-chart-scroll" tabIndex={0} role="region" aria-label={'Gráfico de ' + label}><svg role="img" aria-label={label + ' por dia, escala de 1 a 5. Consulte os valores na tabela abaixo.'} viewBox="0 0 640 230">{[1, 2, 3, 4, 5].map(value => <g key={value}><line className="chart-axis" x1="36" x2="620" y1={y(value)} y2={y(value)} /><text x="18" y={y(value) + 4} textAnchor="middle">{value}</text></g>)}{[1, 5, 10, 15, 20, 25, days].map(day => <text key={day} x={x(day)} y="216" textAnchor="middle">{day}</text>)}<path d={path} fill="none" stroke="var(--purple)" strokeWidth="2.5" />{records.map(item => <circle key={item.id} cx={x(Number(item.date.slice(-2)))} cy={y(item[metric])} r="4" fill="var(--purple)"><title>{displayDate(item.date)}: {item[metric]} / 5</title></circle>)}</svg></div><details className="checkin-table"><summary>Ver notas por dia</summary><table><thead><tr><th>Dia</th>{dimensions.map(d => <th key={d.key}>{d.label}</th>)}</tr></thead><tbody>{records.sort((a, b) => a.date.localeCompare(b.date)).map(item => <tr key={item.id}><th scope="row">{displayDate(item.date)}</th>{dimensions.map(d => <td key={d.key}>{item[d.key]}</td>)}</tr>)}</tbody></table></details></>}
  </section>
}
