import { Select } from '../components/Select'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { addLocalHabit, clearHabitLog, deleteLocalHabit, getHabitGoalIds, getLocalGoals, getLocalHabitLogs, getLocalHabits, habitStreak, logHabit, setHabitGoalLinks, today, updateLocalHabit, type HabitCategory, type HabitType, type LocalHabit, type LocalHabitLog } from '../lib/local-store'
import { useLocalRevision } from '../lib/use-local-revision'

const categories: { value: HabitCategory; label: string }[] = [
  { value: 'custom', label: 'Outro' },
  { value: 'workout', label: 'Treino' },
  { value: 'study', label: 'Estudo' },
  { value: 'meditation', label: 'Meditação' },
  { value: 'reading', label: 'Leitura' },
]

export function Habits() {
  useLocalRevision()
  const [name, setName] = useState('')
  const [type, setType] = useState<HabitType>('positive')
  const [category, setCategory] = useState<HabitCategory>('custom')
  const [description, setDescription] = useState('')
  const [logDate, setLogDate] = useState(today())
  const [message, setMessage] = useState('')
  const [goalIds, setGoalIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState<LocalHabit | null>(null)
  const goals = getLocalGoals().filter(goal => goal.status === 'active')
  const habits = getLocalHabits().filter(habit => habit.active)
  const logs = getLocalHabitLogs()

  function create(event: FormEvent) {
    event.preventDefault()
    const title = name.trim()
    if (!title) return
    const next = addLocalHabit({ name: title, description: description.trim() || null, type, category, target_days: null, started_at: logDate })
    setHabitGoalLinks(next[0].id, [...new Set([...getHabitGoalIds(next[0].id), ...goalIds])])
    setName('')
    setDescription('')
    setGoalIds([])
    setMessage(`Hábito “${title}” criado.`)
  }
  function update(item: LocalHabit, status: LocalHabitLog['status']) {
    logHabit(item.id, logDate, status)
    setMessage(status === 'completed' ? `“${item.name}” concluído em ${formatDay(logDate)}.` : `Registro de “${item.name}” atualizado.`)
  }
  function clear(item: LocalHabit) {
    clearHabitLog(item.id, logDate)
    setMessage(`Registro de “${item.name}” desfeito.`)
  }
  function remove() {
    if (!deleting) return
    deleteLocalHabit(deleting.id)
    setMessage(`Hábito “${deleting.name}” removido.`)
    setDeleting(null)
  }

  return <>
    <header><p className="eyebrow">CONSISTÊNCIA</p><h1>Hábitos</h1><p>Escolha uma prática e marque quando fizer. Um passo por vez.</p></header>
    {message && <p className="action-feedback" role="status">{message}</p>}
    <section className="log-date"><div className="log-date-copy"><span>Registrar atividade em</span><strong>{formatLongDay(logDate)}</strong></div><input aria-label="Data do registro" type="date" max={today()} value={logDate} onChange={event => setLogDate(event.target.value)} /></section>
    <section className="two-columns habits-layout">
      <form className="panel form habit-create-form" onSubmit={create}>
        <div><p className="eyebrow">NOVO HÁBITO</p><h2>Comece uma prática</h2><p>Dê um nome ao hábito. Os detalhes podem esperar.</p></div>
        <label>Nome<input required value={name} placeholder="Ex.: Caminhar 20 minutos" onChange={event => setName(event.target.value)} /></label>{logDate !== today() && <small className="muted">Este hábito vai começar em {formatLongDay(logDate)}, a data escolhida em “Registrar atividade em”.</small>}
        <details className="form-details"><summary>Adicionar detalhes (opcional)</summary><div className="form-details-content">
          <label>Categoria<Select value={category} onChange={event => setCategory(event.target.value as HabitCategory)}>{categories.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</Select></label>
          <label>Descrição<input value={description} placeholder="Opcional" onChange={event => setDescription(event.target.value)} /></label>
          <label>Tipo<Select value={type} onChange={event => setType(event.target.value as HabitType)}><option value="positive">Hábito positivo</option><option value="abstinence">Abstinência — Sem X</option></Select></label>
          <GoalSelector goals={goals} selected={goalIds} onChange={setGoalIds} />
        </div></details>
        <button>Criar hábito</button>
      </form>
      <section>{habits.length === 0 ? <div className="empty">Seu primeiro hábito pode ser pequeno. O importante é começar.</div> : <div className="stack habits-stack">{habits.map(habit => <HabitCard key={habit.id} habit={habit} goals={goals} logDate={logDate} logStatus={logs.find(log => log.habit_id === habit.id && log.date === logDate)?.status} onLog={update} onClear={clear} onDelete={() => setDeleting(habit)} />)}</div>}</section>
    </section>
    <ConfirmDialog open={Boolean(deleting)} title="Excluir este hábito?" description={`“${deleting?.name ?? ''}” e todos os registros associados serão apagados.`} onCancel={() => setDeleting(null)} onConfirm={remove} />
  </>
}

function GoalSelector({ goals, selected, onChange }: { goals: ReturnType<typeof getLocalGoals>; selected: string[]; onChange: (ids: string[]) => void }) {
  if (!goals.length) return <p className="linked-habits">Você pode vincular este hábito a uma meta depois.</p>
  return <fieldset className="goal-selector"><legend>Metas vinculadas</legend>{goals.map(goal => <label key={goal.id}><input type="checkbox" checked={selected.includes(goal.id)} onChange={event => onChange(event.target.checked ? [...selected, goal.id] : selected.filter(id => id !== goal.id))} /> {goal.title}</label>)}</fieldset>
}

function HabitCard({ habit, goals, logDate, logStatus, onLog, onClear, onDelete }: { habit: LocalHabit; goals: ReturnType<typeof getLocalGoals>; logDate: string; logStatus?: LocalHabitLog['status']; onLog: (habit: LocalHabit, status: LocalHabitLog['status']) => void; onClear: (habit: LocalHabit) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(habit.name)
  const [draftCategory, setDraftCategory] = useState(habit.category)
  const selected = getHabitGoalIds(habit.id)
  const linkedGoals = goals.filter(goal => selected.includes(goal.id))
  const beforeStart = logDate < habit.started_at.slice(0, 10)

  function toggleGoal(goalId: string, checked: boolean) {
    setHabitGoalLinks(habit.id, checked ? [...selected, goalId] : selected.filter(id => id !== goalId))
  }
  function save(event: FormEvent) {
    event.preventDefault()
    if (!draftName.trim()) return
    updateLocalHabit(habit.id, { name: draftName.trim(), category: draftCategory })
    setEditing(false)
  }
  function cancelEdit() {
    setDraftName(habit.name)
    setDraftCategory(habit.category)
    setEditing(false)
  }

  return <article className="panel habit-card">
    <div className="habit-card-heading"><div><p className="eyebrow">{categories.find(item => item.value === habit.category)?.label ?? 'Outro'} · {habit.type === 'abstinence' ? 'contador sem' : 'hábito'}</p><h2>{habit.name}</h2>{habit.description && <p>{habit.description}</p>}{linkedGoals.length > 0 && <p className="linked-habits">Metas: {linkedGoals.map(goal => goal.title).join(', ')}</p>}</div><div className="habit-streak"><strong>{habitStreak(habit.id)}</strong><span>dias seguidos</span></div></div>
    <div className="habit-actions"><button disabled={logStatus === 'completed' || beforeStart} onClick={() => onLog(habit, 'completed')}>{logStatus === 'completed' ? `Concluído em ${formatDay(logDate)}` : `Concluir em ${formatDay(logDate)}`}</button>{logStatus && <span className="habit-status">{logStatus === 'completed' ? 'Concluído' : logStatus === 'failed' ? 'Falha registrada' : 'Dia pulado'}</span>}</div>
    {beforeStart && <small className="muted">Este hábito começou em {formatLongDay(habit.started_at)}.</small>}
    <details className="habit-secondary"><summary>Outras ações</summary>
      {editing && <form className="habit-edit-form" onSubmit={save}><div className="goal-edit habit-edit"><label>Nome<input required value={draftName} onChange={event => setDraftName(event.target.value)} /></label><label>Categoria<Select value={draftCategory} onChange={event => setDraftCategory(event.target.value as HabitCategory)}>{categories.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</Select></label></div><div className="button-row"><button>Salvar alterações</button><button type="button" className="subtle" onClick={cancelEdit}>Cancelar edição</button></div></form>}
      <fieldset className="goal-selector"><legend>Metas vinculadas</legend>{goals.length ? goals.map(goal => <label key={goal.id}><input type="checkbox" checked={selected.includes(goal.id)} onChange={event => toggleGoal(goal.id, event.target.checked)} /> {goal.title}</label>) : <p>Crie uma meta para vincular.</p>}</fieldset>
      <div className="habit-actions">
        {logStatus && <button className="subtle" onClick={() => onClear(habit)}>Desfazer registro</button>}
        <button className="subtle" disabled={beforeStart} onClick={() => onLog(habit, 'failed')}>Marcar falha</button>
        <button className="subtle" disabled={beforeStart} onClick={() => onLog(habit, 'skipped')}>Pular dia</button>
        {!editing && <button className="subtle" onClick={() => setEditing(true)}>Editar hábito</button>}
        <button className="danger" onClick={onDelete}>Excluir</button>
      </div>
    </details>
  </article>
}

function formatDay(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(`${value}T12:00:00`)) }
function formatLongDay(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) }
