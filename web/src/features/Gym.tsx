import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { addLocalWorkout, deleteLocalWorkout, getLocalWorkouts, today, type LocalWorkout } from '../lib/local-store'

const focuses = ['Peito e tríceps', 'Costas e bíceps', 'Pernas', 'Ombros', 'Cardio', 'Corpo inteiro', 'Outro']

export function Gym() {
  const [workouts, setWorkouts] = useState(getLocalWorkouts)
  const [date, setDate] = useState(today())
  const [title, setTitle] = useState('')
  const [focus, setFocus] = useState(focuses[0])
  const [duration, setDuration] = useState('60')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const summary = useMemo(() => {
    const month = today().slice(0, 7)
    const currentMonth = workouts.filter(workout => workout.date.startsWith(month))
    return { count: currentMonth.length, minutes: currentMonth.reduce((total, workout) => total + workout.duration_minutes, 0), latest: workouts[0]?.date ?? null }
  }, [workouts])

  function submit(event: FormEvent) {
    event.preventDefault()
    const name = title.trim() || focus
    const next = addLocalWorkout({ date, title: name, focus, duration_minutes: Math.max(1, Number(duration) || 0), notes: notes.trim() || null })
    setWorkouts(next)
    setTitle('')
    setNotes('')
    setMessage('Treino registrado com sucesso.')
  }

  function remove(workout: LocalWorkout) {
    setWorkouts(deleteLocalWorkout(workout.id))
    setMessage('Treino removido.')
  }

  return <><header><p className="eyebrow">MOVIMENTO</p><h1>Academia</h1><p>Planeje e registre seus treinos para manter a evolução visível.</p></header>{message && <p className="action-feedback" role="status">{message}</p>}<section className="metric-row gym-summary"><div className="metric"><p>Treinos no mês</p><strong>{summary.count}</strong></div><div className="metric"><p>Minutos no mês</p><strong>{summary.minutes}</strong></div><div className="metric"><p>Último treino</p><strong>{summary.latest ? formatDate(summary.latest) : '—'}</strong></div></section><section className="two-columns habits-layout"><form className="panel form habit-create-form" onSubmit={submit}><div><p className="eyebrow">NOVO TREINO</p><h2>Registrar sessão</h2><p>Salve o foco, duração e observações do treino.</p></div><label>Data<input required type="date" max={today()} value={date} onChange={event => setDate(event.target.value)} /></label><label>Nome do treino<input value={title} placeholder="Ex.: Treino A" onChange={event => setTitle(event.target.value)} /></label><label>Foco<select value={focus} onChange={event => setFocus(event.target.value)}>{focuses.map(item => <option key={item}>{item}</option>)}</select></label><label>Duração (minutos)<input required min="1" type="number" value={duration} onChange={event => setDuration(event.target.value)} /></label><label>Observações<textarea value={notes} placeholder="Exercícios, carga ou como você se sentiu" onChange={event => setNotes(event.target.value)} /></label><button>Salvar treino</button></form><section>{workouts.length === 0 ? <div className="empty">Seu histórico de academia aparecerá aqui. Registre o primeiro treino.</div> : <div className="stack habits-stack">{workouts.map(workout => <article className="panel workout-card" key={workout.id}><div><p className="eyebrow">{formatDate(workout.date)} · {workout.focus}</p><h2>{workout.title}</h2><p className="workout-meta">{workout.duration_minutes} min</p>{workout.notes && <p>{workout.notes}</p>}</div><button className="subtle" onClick={() => remove(workout)}>Excluir</button></article>)}</div>}</section></section></>
}

function formatDate(date: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`)) }
