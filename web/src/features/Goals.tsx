import { Select } from '../components/Select'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { NumberStepper } from '../components/NumberStepper'
import { addLocalGoal, deleteLocalGoal, getGoalHabitIds, getHabitGoalIds, getLocalGoals, getLocalHabits, goalProgress, setHabitGoalLinks, today, updateLocalGoal, type GoalMetric, type GoalPeriod, type LocalGoal } from '../lib/local-store'
import { useLocalRevision } from '../lib/use-local-revision'

const metrics: { value: GoalMetric; label: string; unit: string }[] = [
  { value: 'habit_days', label: 'Dias de hábito', unit: 'dias' },
  { value: 'pages_read', label: 'Páginas lidas', unit: 'páginas' },
  { value: 'reading_minutes', label: 'Minutos de leitura', unit: 'minutos' },
  { value: 'study_minutes', label: 'Minutos de foco', unit: 'minutos' },
  { value: 'workouts', label: 'Treinos', unit: 'treinos' },
  { value: 'custom', label: 'Personalizada', unit: 'unidades' },
]
const periodLabels: Record<GoalPeriod, string> = { daily: 'diária', weekly: 'semanal', monthly: 'mensal', total: 'até a data final' }

export function Goals() {
  useLocalRevision()
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState(7)
  const [metric, setMetric] = useState<GoalMetric>('habit_days')
  const [period, setPeriod] = useState<GoalPeriod>('total')
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 30)
    return date.toLocaleDateString('en-CA')
  })
  const [message, setMessage] = useState('')
  const [deleting, setDeleting] = useState<LocalGoal | null>(null)
  const goals = getLocalGoals()
  const metricInfo = metrics.find(item => item.value === metric)!

  function create(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || !Number.isInteger(target) || target <= 0 || endDate < startDate) return
    addLocalGoal({ title: title.trim(), target_value: target, unit: metricInfo.unit, metric, period_type: period, start_date: startDate, end_date: endDate })
    setTitle('')
    setMessage('Meta criada. Seu avanço aparecerá conforme você registrar as atividades.')
  }
  function remove() {
    if (!deleting) return
    deleteLocalGoal(deleting.id)
    setMessage(`Meta “${deleting.title}” removida.`)
    setDeleting(null)
  }

  return <>
    <header><p className="eyebrow">DIREÇÃO</p><h1>Metas</h1><p>Defina um alvo. O Cavern acompanha seu avanço a partir das ações registradas.</p></header>
    {message && <p className="action-feedback" role="status">{message}</p>}
    <section className="two-columns">
      <form className="panel form" onSubmit={create}>
        <h2>Nova meta</h2>
        <label>Título<input required value={title} placeholder="Ex.: praticar por 7 dias" onChange={event => setTitle(event.target.value)} /></label>
        <label>Métrica<Select value={metric} onChange={event => setMetric(event.target.value as GoalMetric)}>{metrics.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</Select></label>
        <NumberStepper label="Alvo" value={target} min={1} onChange={setTarget} suffix={metricInfo.unit} required wholeNumbers />
        <details className="form-details"><summary>Ajustar período e datas</summary><div className="form-details-content">
          <label>Período<Select value={period} onChange={event => setPeriod(event.target.value as GoalPeriod)}><option value="total">Até a data final</option><option value="daily">Diário</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></Select></label>
          <div className="date-pair"><label>Início<input required type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label><label>Fim<input required min={startDate} type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></label></div>
        </div></details>
        <button>Criar meta</button>
      </form>
      <section>{goals.length === 0 ? <div className="empty">Defina uma meta para dar direção às suas ações.</div> : <div className="stack">{goals.map(goal => <GoalCard goal={goal} onDelete={() => setDeleting(goal)} key={goal.id} />)}</div>}</section>
    </section>
    <ConfirmDialog open={Boolean(deleting)} title="Excluir esta meta?" description={`A meta “${deleting?.title ?? ''}” e seus vínculos com hábitos serão removidos.`} onCancel={() => setDeleting(null)} onConfirm={remove} />
  </>
}

function GoalCard({ goal, onDelete }: { goal: LocalGoal; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(goal.title)
  const [draftTarget, setDraftTarget] = useState(goal.target_value)
  const [draftPeriod, setDraftPeriod] = useState(goal.period_type)
  const [draftStart, setDraftStart] = useState(goal.start_date)
  const [draftEnd, setDraftEnd] = useState(goal.end_date)
  const [draftHabitIds, setDraftHabitIds] = useState(() => getGoalHabitIds(goal.id))
  const habits = getLocalHabits().filter(habit => habit.active)
  const habitIds = getGoalHabitIds(goal.id)
  const linkedHabits = habits.filter(habit => habitIds.includes(habit.id))
  const progress = goalProgress(goal)
  const percent = Math.min(100, Math.round(progress / goal.target_value * 100))
  const expired = goal.status === 'active' && goal.end_date < today()
  const showHabitLinks = goal.metric === 'habit_days' || goal.metric === 'workouts'

  function toggleHabit(habitId: string, checked: boolean) {
    setDraftHabitIds(current => checked ? [...new Set([...current, habitId])] : current.filter(id => id !== habitId))
  }
  function save(event: FormEvent) {
    event.preventDefault()
    if (!draftTitle.trim() || !Number.isInteger(draftTarget) || draftTarget <= 0 || draftEnd < draftStart) return
    updateLocalGoal(goal.id, { title: draftTitle.trim(), target_value: draftTarget, manual_progress: Math.min(goal.manual_progress, draftTarget), period_type: draftPeriod, start_date: draftStart, end_date: draftEnd })
    if (showHabitLinks) for (const habit of habits) {
      const currentGoals = getHabitGoalIds(habit.id)
      setHabitGoalLinks(habit.id, draftHabitIds.includes(habit.id) ? [...new Set([...currentGoals, goal.id])] : currentGoals.filter(id => id !== goal.id))
    }
    setEditing(false)
  }
  function cancelEdit() {
    setDraftTitle(goal.title)
    setDraftTarget(goal.target_value)
    setDraftPeriod(goal.period_type)
    setDraftStart(goal.start_date)
    setDraftEnd(goal.end_date)
    setDraftHabitIds(getGoalHabitIds(goal.id))
    setEditing(false)
  }

  return <article className="panel goal-card">
    <div className="card-heading"><div><p className="eyebrow">{goal.status === 'active' ? expired ? 'PRAZO ENCERRADO' : 'EM ANDAMENTO' : goal.status === 'completed' ? 'CONCLUÍDA' : 'CANCELADA'} · {periodLabels[goal.period_type]}</p><h2>{goal.title}</h2></div><button className="danger icon-button" onClick={onDelete} aria-label={`Excluir meta ${goal.title}`}>×</button></div>
    <p className="goal-deadline">{formatDate(goal.start_date)} a {formatDate(goal.end_date)}</p>
    <strong>{progress} <span>/ {goal.target_value} {goal.unit}</span></strong>
    <div className="progress-track"><i style={{ width: `${percent}%` }} /></div><small>{percent}% do alvo</small>
    {showHabitLinks && <p className="linked-habits"><b>Hábitos vinculados:</b> {linkedHabits.length ? linkedHabits.map(habit => habit.name).join(', ') : 'nenhum — use Editar para escolher.'}</p>}
    {goal.metric === 'study_minutes' && <p className="linked-habits">Selecione esta meta ao iniciar uma sessão de Foco para contar os minutos.</p>}
    {editing && <form className="goal-edit-form" onSubmit={save}>
      <label>Título<input required value={draftTitle} onChange={event => setDraftTitle(event.target.value)} /></label>
      <div className="date-pair"><NumberStepper label="Alvo" value={draftTarget} min={1} onChange={setDraftTarget} suffix={goal.unit} required wholeNumbers /><label>Período<Select value={draftPeriod} onChange={event => setDraftPeriod(event.target.value as GoalPeriod)}><option value="total">Até a data final</option><option value="daily">Diário</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></Select></label></div>
      <div className="date-pair"><label>Início<input required type="date" value={draftStart} onChange={event => setDraftStart(event.target.value)} /></label><label>Fim<input required type="date" min={draftStart} value={draftEnd} onChange={event => setDraftEnd(event.target.value)} /></label></div>
      {showHabitLinks && <fieldset className="goal-selector"><legend>Hábitos desta meta</legend>{habits.length ? habits.map(habit => <label key={habit.id}><input type="checkbox" checked={draftHabitIds.includes(habit.id)} onChange={event => toggleHabit(habit.id, event.target.checked)} /> {habit.name}</label>) : <p>Crie um hábito primeiro.</p>}</fieldset>}
      <div className="button-row"><button>Salvar alterações</button><button type="button" className="subtle" onClick={cancelEdit}>Descartar alterações</button></div>
    </form>}
    {goal.metric === 'custom' && goal.status === 'active' && <NumberStepper label="Progresso manual" value={goal.manual_progress} min={0} max={goal.target_value} onChange={value => updateLocalGoal(goal.id, { manual_progress: value })} suffix={goal.unit} />}
    <div className="habit-actions">
      {!editing && <button className="subtle" onClick={() => setEditing(true)}>Editar meta</button>}
      {goal.status === 'active' && <button disabled={progress < goal.target_value} onClick={() => updateLocalGoal(goal.id, { status: 'completed' })}>Concluir</button>}
      {goal.status === 'active' && <button className="subtle" onClick={() => updateLocalGoal(goal.id, { status: 'cancelled' })}>Cancelar meta</button>}
      {goal.status !== 'active' && <button className="subtle" onClick={() => updateLocalGoal(goal.id, { status: 'active' })}>Reativar</button>}
    </div>
  </article>
}

function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) }
