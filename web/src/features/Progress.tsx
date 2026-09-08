import { NavLink } from 'react-router-dom'
import './progress.css'
import { getLocalCheckIns, getLocalHabitLogs, getLocalReadingSessions, overallStreak, today } from '../lib/local-store'
import { useLocalRevision } from '../lib/use-local-revision'

const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function Progress() {
  useLocalRevision()
  const logs = getLocalHabitLogs(); const sessions = getLocalReadingSessions(); const checkins = getLocalCheckIns()
  const now = new Date(); const current = monthRange(now.getFullYear(), now.getMonth()); const previous = monthRange(now.getFullYear(), now.getMonth() - 1)
  const streak = overallStreak(logs); const days = recentDays(14); const active = new Set(logs.filter(log => log.status === 'completed').map(log => log.date))
  const counts = new Map<string, number>()
  for (const log of logs) if (log.status === 'completed') counts.set(log.date, (counts.get(log.date) ?? 0) + 1)
  const chart = days.map(date => ({ date, amount: counts.get(date) ?? 0 }))
  const metrics = [{ label: 'Dias ativos', current: uniqueCompleted(logs, current), previous: uniqueCompleted(logs, previous) }, { label: 'Páginas lidas', current: pagesIn(sessions, current), previous: pagesIn(sessions, previous) }, { label: 'Check-ins', current: countIn(checkins, current), previous: countIn(checkins, previous) }]
  return <><header><p className="eyebrow">VISÃO GERAL</p><h1>Seu progresso</h1><p>Consistência se constrói dia após dia.</p></header><FireJourney streak={streak} /><div className="progress-actions"><NavLink className="button" to="/habits">Registrar hábito</NavLink><NavLink className="button subtle" to="/books">Continuar leitura</NavLink><NavLink className="button subtle" to="/checkins">Fazer check-in</NavLink></div><section className="visual-summary"><article className="streak-hero"><span>Sequência atual</span><strong>{streak}</strong><small>dias consecutivos</small></article><ActivityChart values={chart} /></section><MonthlyComparison metrics={metrics} /><section className="calendar-section"><div><p className="eyebrow">CALENDÁRIO</p><h2>{monthLabel()}</h2></div><Calendar activeDates={active} /></section></>
}

function FireJourney({ streak }: { streak: number }) {
  const thresholds = [0, 1, 7, 14, 28]
  const labels = ['Sua próxima chama', 'Primeira chama', 'Brasa firme', 'Fogueira forte', 'Chama lendária']
  const level = thresholds.reduce((current, threshold, index) => streak >= threshold ? index : current, 0)
  const remaining = (thresholds[level + 1] ?? streak) - streak
  const message = level === 0 ? 'Conclua um hábito hoje para acender a fogueira. Cada recomeço conta.' : level === 4 ? '28 dias ou mais de constância. Continue cuidando da sua chama.' : 'Mais ' + remaining + (remaining === 1 ? ' dia para ' : ' dias para ') + labels[level + 1].toLowerCase() + '.'
  return <section className={'fire-journey level-' + level}><div className="fire-copy"><p className="eyebrow">SUA FOGUEIRA</p><h2>{labels[level]}</h2><p>{message}</p><div className="fire-milestones">{thresholds.slice(1).map(value => <span className={streak >= value ? 'reached' : ''} key={value}>{value}d</span>)}</div></div><div className="camp-scene"><StreakScene level={level} /></div><strong className="fire-count">{streak}<small>{streak === 1 ? 'dia seguido' : 'dias seguidos'}</small></strong></section>
}

function StreakScene({ level }: { level: number }) {
  const scale = [0, .6, .8, 1, 1.15][level]
  return <svg className="streak-scene" viewBox="0 0 300 200" role="img" aria-label={level === 0 ? 'Mascote Cavern pronto para acender a fogueira' : 'Mascote Cavern ao lado da sua fogueira acesa'}>
    <ellipse cx="150" cy="179" rx="130" ry="10" fill="#000" opacity=".12" />
    <path d="M39 159Q20 119 48 76Q62 48 89 39Q117 49 136 81Q159 121 135 159Z" fill="#9c7de8" stroke="#69529f" strokeWidth="3" />
    <path d="M52 133V107Q52 67 89 62Q127 67 127 107V133Q92 153 52 133Z" fill="#20202c" />
    <ellipse cx="75" cy="106" rx="6" ry="8" fill="#ffcf73" /><ellipse cx="106" cy="106" rx="6" ry="8" fill="#ffcf73" />
    <path d={level === 0 ? 'M84 127H97' : 'M83 122Q90 132 98 122'} fill="none" stroke="#ffcf73" strokeWidth="3" strokeLinecap="round" />
    <path d="M48 139Q30 147 36 162M132 139Q148 141 155 128" fill="none" stroke="#9c7de8" strokeWidth="14" strokeLinecap="round" />
    <ellipse cx="67" cy="172" rx="22" ry="10" fill="#69529f" /><ellipse cx="116" cy="172" rx="22" ry="10" fill="#69529f" />
    {level > 0 && <ellipse cx="225" cy="165" rx="43" ry="17" fill="#ffb24a" opacity=".16" />}
    <path d="M185 169L263 182M190 181L259 165" stroke="#88583b" strokeWidth="12" strokeLinecap="round" />
    {level > 0 ? <g className="scene-fire" transform={'translate(223 163) scale(' + scale + ')'}><path d="M0 0C-39-4-32-40-15-55C-15-35-6-32-7-47C-8-65 7-83 12-94C14-61 46-43 28-13C22-2 11 3 0 0Z" fill="#f58d38" /><path d="M0-2C-15-14-9-30 3-48C3-33 20-26 14-12C12-5 5 0 0-2Z" fill="#ffdc79" /></g> : <path d="M221 144Q209 130 223 118M231 117Q242 101 231 91" stroke="#96949e" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".6" />}
  </svg>
}

function MonthlyComparison({ metrics }: { metrics: { label: string; current: number; previous: number }[] }) {  return <section className="monthly-progress"><div className="chart-title"><div><p className="eyebrow">COMPARAÇÃO</p><h2>Este mês x mês anterior</h2></div><span>evolução mensal</span></div><div className="monthly-bars">{metrics.map(item => <div className="monthly-metric" key={item.label}><div className="monthly-values"><strong>{item.current}</strong><span>vs {item.previous}</span></div><div className="bar-pair" title={`${item.label}: ${item.current} este mês, ${item.previous} mês anterior`}><i style={{ height: `${item.current / Math.max(1, item.current, item.previous) * 100}%` }} /><b style={{ height: `${item.previous / Math.max(1, item.current, item.previous) * 100}%` }} /></div><small>{item.label}</small></div>)}</div><div className="chart-legend"><span><i className="legend-current" /> Este mês</span><span><i className="legend-previous" /> Mês anterior</span></div></section> }
function ActivityChart({ values }: { values: { date: string; amount: number }[] }) { const max = Math.max(1, ...values.map(item => item.amount)); const width = 620; const gap = 10; const barWidth = (width - gap * (values.length + 1)) / values.length; return <article className="activity-chart"><div className="chart-title"><div><p className="eyebrow">ATIVIDADE</p><h2>Últimos 14 dias</h2></div><span>hábitos concluídos</span></div><svg role="img" aria-label="Gráfico de hábitos concluídos nos últimos catorze dias" viewBox={`0 0 ${width} 210`}><line x1="0" x2={width} y1="170" y2="170" className="chart-axis" />{values.map((item, index) => { const h = item.amount / max * 132; const x = gap + index * (barWidth + gap); return <g key={item.date}><rect className="chart-bar" x={x} y={170 - h} width={barWidth} height={h} rx="4" /><text x={x + barWidth / 2} y="194" textAnchor="middle">{shortDay(item.date)}</text></g> })}</svg></article> }
function Calendar({ activeDates }: { activeDates: Set<string> }) { const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth(), 1); const offset = (first.getDay() + 6) % 7; const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); const cells = Array.from({ length: offset + days }, (_, i) => i < offset ? null : i - offset + 1); return <article className="calendar"><div className="calendar-weekdays">{weekdays.map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map((day, i) => { if (!day) return <i key={`empty-${i}`} />; const key = localDate(now.getFullYear(), now.getMonth(), day); const done = activeDates.has(key); return <div className={`calendar-day ${done ? 'done' : ''} ${key === today() ? 'today' : ''}`} key={key}><span>{day}</span>{done && <b>•</b>}</div> })}</div><div className="calendar-legend"><span><i className="legend-active" /> Atividade concluída</span><span><i className="legend-today" /> Hoje</span></div></article> }
function monthRange(year: number, month: number) { const start = new Date(year, month, 1, 12); const end = new Date(year, month + 1, 0, 12); return { start: localDate(start.getFullYear(), start.getMonth(), 1), end: localDate(end.getFullYear(), end.getMonth(), end.getDate()) } }
function uniqueCompleted(logs: ReturnType<typeof getLocalHabitLogs>, range: { start: string; end: string }) { return new Set(logs.filter(log => log.status === 'completed' && log.date >= range.start && log.date <= range.end).map(log => log.date)).size }
function pagesIn(sessions: ReturnType<typeof getLocalReadingSessions>, range: { start: string; end: string }) { return sessions.filter(item => new Date(item.started_at).toLocaleDateString('en-CA') >= range.start && new Date(item.started_at).toLocaleDateString('en-CA') <= range.end).reduce((sum, item) => sum + item.pages_read, 0) }
function countIn(items: ReturnType<typeof getLocalCheckIns>, range: { start: string; end: string }) { return items.filter(item => item.date >= range.start && item.date <= range.end).length }
function recentDays(count: number) { const result: string[] = []; const now = new Date(); for (let i = count - 1; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i); result.push(localDate(d.getFullYear(), d.getMonth(), d.getDate())) } return result }
function localDate(year: number, month: number, day: number) { return new Date(year, month, day, 12).toLocaleDateString('en-CA') }
function shortDay(date: string) { return new Intl.DateTimeFormat('pt-BR', { weekday: 'narrow' }).format(new Date(`${date}T12:00:00`)) }
function monthLabel() { return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date()) }
