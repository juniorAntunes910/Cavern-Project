import { useState } from 'react'
import type { FormEvent } from 'react'
import { addLocalHabit, deleteLocalHabit, getLocalHabits, habitStreak, logHabit, today, updateLocalHabit, type HabitCategory, type HabitType, type LocalHabit } from '../lib/local-store'

const categories: { value: HabitCategory; label: string }[] = [{ value: 'workout', label: 'Treino' }, { value: 'study', label: 'Estudo' }, { value: 'meditation', label: 'Meditação' }, { value: 'reading', label: 'Leitura' }, { value: 'custom', label: 'Outro' }]

export function Habits() {
  const [habits, setHabits] = useState(getLocalHabits)
  const [name, setName] = useState('')
  const [type, setType] = useState<HabitType>('positive')
  const [category, setCategory] = useState<HabitCategory>('workout')
  const [description, setDescription] = useState('')
  const [logDate, setLogDate] = useState(today())
  const [message, setMessage] = useState('')

  function create(event: FormEvent) { event.preventDefault(); if (!name.trim()) return; const created = name.trim(); setHabits(addLocalHabit({ name: created, description: description.trim() || null, type, category, cavern_id: null, target_days: null, started_at: logDate })); setName(''); setDescription(''); setMessage(`Hábito “${created}” criado. Registre-o quando concluir.`) }
  function update(item: LocalHabit, status: 'completed' | 'failed' | 'skipped') { logHabit(item.id, logDate, status); setHabits([...getLocalHabits()]); setMessage(status === 'completed' ? `“${item.name}” marcado como concluído.` : status === 'failed' ? `Registro de “${item.name}” marcado como não concluído.` : `“${item.name}” foi pulado nesta data.`) }

  return <><header><p className="eyebrow">CONSISTÊNCIA</p><h1>Hábitos</h1><p>Crie práticas que quer repetir e registre o resultado do dia para transformar consistência em progresso visível.</p></header>{message && <p className="action-feedback" role="status">{message}</p>}<section className="log-date" aria-label="Data para registrar atividade"><div className="log-date-copy"><span>Registrar atividade em</span><strong>{formatLongDay(logDate)}</strong></div><input aria-label="Data do registro" type="date" max={today()} value={logDate} onChange={event => setLogDate(event.target.value)} /></section><section className="two-columns habits-layout"><form className="panel form habit-create-form" onSubmit={create}><div><p className="eyebrow">NOVO REGISTRO</p><h2>Novo hábito</h2><p>Crie uma prática simples para acompanhar todos os dias.</p></div><label>Nome<input required value={name} placeholder="Ex.: Academia" onChange={event => setName(event.target.value)} /></label><label>Categoria<select value={category} onChange={event => setCategory(event.target.value as HabitCategory)}>{categories.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><label>Descrição<input value={description} placeholder="Opcional" onChange={event => setDescription(event.target.value)} /></label><label>Tipo<select value={type} onChange={event => setType(event.target.value as HabitType)}><option value="positive">Hábito positivo</option><option value="abstinence">Abstinência — Sem X</option></select></label><button>Criar hábito</button></form><section>{habits.length === 0 ? <div className="empty">Crie um hábito positivo ou um contador “Sem X”.</div> : <div className="stack habits-stack">{habits.filter(habit => habit.active).map(habit => <HabitCard habit={habit} logDate={logDate} onLog={update} onChange={changes => setHabits(updateLocalHabit(habit.id, changes))} onDelete={() => { if (window.confirm(`Excluir o hábito “${habit.name}” e seus registros?`)) { setHabits(deleteLocalHabit(habit.id)); setMessage(`Hábito “${habit.name}” removido.`) } }} key={habit.id} />)}</div>}</section></section></>
}

function HabitCard({ habit, logDate, onLog, onChange, onDelete }: { habit: LocalHabit; logDate: string; onLog: (habit: LocalHabit, status: 'completed' | 'failed' | 'skipped') => void; onChange: (changes: Partial<LocalHabit>) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const streak = habitStreak(habit.id)
  const category = categories.find(item => item.value === habit.category)?.label ?? 'Outro'

  return <article className="panel habit-card"><div className="habit-card-heading"><div><p className="eyebrow">{category} · {habit.type === 'abstinence' ? 'contador sem' : 'hábito'}</p><h2>{habit.name}</h2>{habit.description && <p>{habit.description}</p>}</div><div className="habit-streak"><strong>{streak}</strong><span>dias seguidos</span></div></div>{editing && <div className="goal-edit habit-edit"><label>Nome<input value={habit.name} onChange={event => onChange({ name: event.target.value })} /></label><label>Categoria<select value={habit.category} onChange={event => onChange({ category: event.target.value as HabitCategory })}>{categories.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label></div>}<div className="habit-actions"><button onClick={() => onLog(habit, 'completed')}>Concluí em {formatDay(logDate)}</button><button className="subtle" onClick={() => onLog(habit, 'failed')}>Falhei</button><button className="subtle" onClick={() => onLog(habit, 'skipped')}>Pular</button><button className="subtle" onClick={() => setEditing(!editing)}>{editing ? 'Fechar edição' : 'Editar'}</button><button className="danger" onClick={onDelete}>Excluir</button></div></article>
}

function formatDay(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(`${value}T12:00:00`)) }
function formatLongDay(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) }
