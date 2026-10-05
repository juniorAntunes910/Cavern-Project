import { Select } from '../../components/Select'
import { useEffect, useMemo, useState } from 'react'
import { addLocalFocusSession, finishLocalFocusSession, getLocalFocusSessions, getLocalGoals, getLocalHabits, MINIMUM_FOCUS_SECONDS, updateLocalFocusSession } from '../../lib/local-store'
import { getChallenges } from '../challenges/services/challenge.repository'

export function Focus() {
  const [sessions, setSessions] = useState(getLocalFocusSessions)
  const active = useMemo(() => sessions.find(item => item.status === 'active' || item.status === 'paused'), [sessions])
  const [project, setProject] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [goalId, setGoalId] = useState('')
  const [habitId, setHabitId] = useState('')
  const [message, setMessage] = useState('')
  const [, tick] = useState(0)

  useEffect(() => {
    if (!active || active.status !== 'active') return
    const timer = window.setInterval(() => tick(value => value + 1), 1000)
    return () => clearInterval(timer)
  }, [active])

  const seconds = active ? elapsed(active) : 0
  const refresh = () => setSessions(getLocalFocusSessions())
  function start() {
    addLocalFocusSession({ started_at: new Date().toISOString(), project_name: project.trim() || null, challenge_id: challengeId || null, goal_id: goalId || null, habit_id: habitId || null })
    refresh()
    setProject('')
    setChallengeId('')
    setGoalId('')
    setHabitId('')
  }
  function pause() {
    if (!active) return
    updateLocalFocusSession(active.id, { status: 'paused', accumulated_seconds: elapsed(active), resumed_at: null })
    refresh()
  }
  function resume() {
    if (!active) return
    updateLocalFocusSession(active.id, { status: 'active', resumed_at: new Date().toISOString() })
    refresh()
  }
  function finish() {
    if (!active) return
    const result = finishLocalFocusSession(active.id)
    if (result && !result.valid) setMessage(`Sessões com menos de ${Math.floor(MINIMUM_FOCUS_SECONDS / 60)} minutos não entram no histórico.`)
    refresh()
  }
  function cancel() {
    if (!active) return
    updateLocalFocusSession(active.id, { status: 'cancelled', resumed_at: null })
    refresh()
  }

  const challenges = getChallenges().filter(item => item.status === 'ACTIVE')
  const goals = getLocalGoals().filter(item => item.status === 'active')
  const habits = getLocalHabits().filter(item => item.active)
  const completed = sessions.filter(item => item.status === 'completed').slice(0, 8)

  return <>
    <header><p className="eyebrow">ATENÇÃO</p><h1>Foco</h1><p>Comece uma sessão agora. Sessões de pelo menos {Math.floor(MINIMUM_FOCUS_SECONDS / 60)} minutos entram no seu histórico.</p></header>
    {message && <p className="action-feedback" role="status">{message}</p>}
    <section className="panel focus-timer">
      <p className="eyebrow">{active?.status === 'active' ? 'EM FOCO' : active?.status === 'paused' ? 'PAUSADO' : 'PRONTO'}</p>
      <strong>{formatSeconds(seconds)}</strong>
      {active ? <>
        <p>{active.project_name || 'Sessão de foco'}</p>
        <div className="focus-actions">
          {active.status === 'active' ? <button className="subtle" onClick={pause}>Pausar</button> : <button onClick={resume}>Continuar</button>}
          <button onClick={finish}>Encerrar sessão</button>
          <button className="danger" onClick={cancel}>Descartar</button>
        </div>
      </> : <div className="focus-start">
        <label>Em que vai focar? (opcional)<input value={project} placeholder="Ex.: estudar, escrever, planejar" onChange={event => setProject(event.target.value)} /></label>
        <details className="form-details"><summary>Relacionar à Caverna, meta ou hábito</summary><div className="form-details-content">
          <label>Caverna<Select value={challengeId} onChange={event => setChallengeId(event.target.value)}><option value="">Nenhuma</option>{challenges.map(challenge => <option key={challenge.id} value={challenge.id}>{challenge.name}</option>)}</Select></label>
          <label>Meta<Select value={goalId} onChange={event => setGoalId(event.target.value)}><option value="">Nenhuma</option>{goals.map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</Select></label>
          <label>Hábito<Select value={habitId} onChange={event => setHabitId(event.target.value)}><option value="">Nenhum</option>{habits.map(habit => <option key={habit.id} value={habit.id}>{habit.name}</option>)}</Select></label>
        </div></details>
        <button onClick={start}>Iniciar foco</button>
      </div>}
    </section>
    <section className="challenge-section"><h2>Últimas sessões</h2><div className="stack">
      {completed.map(item => <article className="panel challenge-row" key={item.id}><div><strong>{item.project_name || 'Foco'}</strong><p>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(item.started_at))}</p></div><strong>{Math.floor(item.duration_seconds / 60)} min</strong></article>)}
      {completed.length === 0 && <div className="empty">Suas sessões concluídas aparecerão aqui.</div>}
    </div></section>
  </>
}

function elapsed(session: ReturnType<typeof getLocalFocusSessions>[number]) {
  return session.accumulated_seconds + (session.status === 'active' ? Math.max(0, Math.floor((Date.now() - new Date(session.resumed_at ?? session.started_at).getTime()) / 1000)) : 0)
}
function formatSeconds(total: number) {
  return [Math.floor(total / 3600), Math.floor(total % 3600 / 60), total % 60].map(value => String(value).padStart(2, '0')).join(':')
}
