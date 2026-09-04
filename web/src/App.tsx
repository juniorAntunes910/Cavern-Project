import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { allowedEmail, supabase, supabaseConfigured } from './lib/supabase'
import { Caverns } from './features/Caverns'
import { Goals } from './features/Goals'
import { Habits } from './features/Habits'
import { Progress } from './features/Progress'
import { CheckIn } from './features/CheckIn'
import { Books } from './features/Books'
import { Reader } from './features/Reader'
import { InstallBanner, InstallControl } from './components/AppInstall'
import { NotificationSettings } from './components/NotificationSettings'
import { getLocalGoals, getLocalHabitLogs, getLocalHabits, goalProgress, overallStreak, today } from './lib/local-store'
import { startHabitReminderChecks } from './lib/notifications'
import { useLocalRevision } from './lib/use-local-revision'
import './App.css'
import './theme-overrides.css'
import './reader.css'

type Session = Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']
const nav = [['/', 'Home'], ['/caverns', 'Cavernas'], ['/goals', 'Metas'], ['/habits', 'Hábitos'], ['/books', 'Livros'], ['/statistics', 'Progresso'], ['/checkins', 'Check-in'], ['/profile', 'Perfil']]

export default function App() {
  const [session, setSession] = useState<Session>(null)
  const [loading, setLoading] = useState(supabaseConfigured)
  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])
  if (!supabaseConfigured) return <LocalApp />
  if (loading) return <main className="centered">Carregando...</main>
  if (!session) return <Auth />
  if (allowedEmail && session.user.email?.toLowerCase() !== allowedEmail) return <PrivateAccessDenied />
  return <Shell profile={<Profile email={session.user.email ?? ''} />} />
}

function LocalApp() {
  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem('cavern.local.authenticated') === 'true')
  if (!authenticated) return <LocalLogin onSuccess={() => setAuthenticated(true)} />
  return <Shell profile={<LocalProfile onLogout={() => setAuthenticated(false)} />} />
}

function LocalLogin({ onSuccess }: { onSuccess: () => void }) {
  const [user, setUser] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('')
  function submit(event: FormEvent) { event.preventDefault(); const credentials: Record<string, string> = { junior_ga_souza: 'senha123', denis_dev: 'denis_d', deretti: 'deretti-lindo' }; if (credentials[user] === password) { localStorage.setItem('cavern.local.authenticated', 'true'); localStorage.setItem('cavern.local.user', user); onSuccess() } else setError('Usuário ou senha incorretos.') }
  return <main className="auth">
    <form className="auth-card" onSubmit={submit}>
      <AuthBrand />
      <div className="auth-heading">
        <h1>Entrar no Cavern</h1>
        <p>Seus dados permanecem protegidos e disponíveis neste dispositivo.</p>
      </div>
      <label htmlFor="local-user">Usuário
        <input id="local-user" required autoComplete="username" placeholder="Digite seu usuário" spellCheck={false} value={user} onChange={event => setUser(event.target.value)} />
      </label>
      <label htmlFor="local-password">Senha
        <input id="local-password" required autoComplete="current-password" placeholder="Digite sua senha" type="password" value={password} onChange={event => setPassword(event.target.value)} />
      </label>
      {error && <p className="message" role="alert">{error}</p>}
      <button className="auth-submit">Entrar</button>
      <p className="auth-footnote"><span aria-hidden="true" /> Seus dados ficam neste dispositivo</p>
    </form>
  </main>
}

function Shell({ profile }: { profile: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => startHabitReminderChecks(), [])
  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return <div className="app-shell">
    <div className="mobile-topbar">
      <button className="mobile-menu-trigger" type="button" aria-label="Abrir menu" aria-expanded={menuOpen} aria-controls="main-sidebar" onClick={() => setMenuOpen(true)}>
        <span aria-hidden="true"><i /><i /><i /></span>
        Menu
      </button>
      <div className="mobile-brand">CAVERN</div>
    </div>
    <button className={`mobile-menu-backdrop${menuOpen ? ' is-open' : ''}`} type="button" aria-label="Fechar menu" tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)} />
    <aside id="main-sidebar" className={`sidebar${menuOpen ? ' is-open' : ''}`} aria-label="Menu principal">
      <div className="sidebar-heading"><div className="brand">CAVERN</div><button className="mobile-menu-close" type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}>×</button></div>
      <nav>{nav.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)}>{label}</NavLink>)}</nav>
      <ThemeToggle />
    </aside>
    <main className="content"><InstallBanner /><Routes>
    <Route path="/" element={<Home />} /><Route path="/caverns" element={<Caverns />} /><Route path="/goals" element={<Goals />} /><Route path="/habits" element={<Habits />} /><Route path="/books" element={<Books />} /><Route path="/books/:id/read" element={<Reader />} /><Route path="/statistics" element={<Progress />} /><Route path="/checkins" element={<CheckIn />} /><Route path="/profile" element={profile} /><Route path="*" element={<Navigate to="/" replace />} />
  </Routes></main></div>
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem('cavern.theme') ?? 'dark')
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('cavern.theme', theme) }, [theme])
  return <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</button>
}

function Home() {
  useLocalRevision()
  const logs = getLocalHabitLogs(); const habits = getLocalHabits().filter(habit => habit.active); const goals = getLocalGoals().filter(goal => goal.status === 'active'); const streak = overallStreak(logs); const completedToday = logs.filter(log => log.date === today() && log.status === 'completed').length; const completedGoals = goals.filter(goal => goalProgress(goal, logs) >= goal.target_value).length
  return <><header><p className="eyebrow">CAVERN</p><h1>Bom dia.</h1><p>O Cavern transforma intenção em prática: você define um ciclo de foco, estabelece metas e registra hábitos para enxergar sua evolução sem depender da memória.</p></header><section className="home-intro" aria-label="Como o Cavern funciona"><div><p className="eyebrow">COMO FUNCIONA</p><h2>Um lugar para construir constância.</h2><p>Use as ferramentas abaixo em conjunto ou comece por apenas uma. O objetivo não é preencher tudo, e sim ter clareza sobre o próximo passo.</p></div><ol><li><strong>Crie uma Caverna</strong><span>para delimitar uma fase de foco, como um mês ou um projeto.</span></li><li><strong>Defina metas</strong><span>para transformar essa intenção em alvos acompanháveis.</span></li><li><strong>Registre hábitos e leitura</strong><span>para alimentar o progresso com ações reais do dia a dia.</span></li><li><strong>Faça check-ins</strong><span>para refletir, ajustar o rumo e manter o ritmo sustentável.</span></li></ol><div className="home-intro-actions"><NavLink className="button" to="/caverns">Começar uma Caverna</NavLink><NavLink className="subtle" to="/habits">Criar um hábito</NavLink></div></section><section className="metric-row"><Metric label="Sequência atual" value={`${streak} dias`} /><Metric label="Hábitos hoje" value={`${completedToday} / ${habits.length}`} /><Metric label="Metas no alvo" value={`${completedGoals} / ${goals.length}`} /></section><section className="home-grid"><article className="panel"><h2>Hoje</h2>{habits.length === 0 ? <p>Crie seu primeiro hábito para começar.</p> : <div className="home-list">{habits.slice(0, 4).map(habit => <NavLink to="/habits" key={habit.id}><span>{habit.name}</span><small>{logs.some(log => log.habit_id === habit.id && log.date === today() && log.status === 'completed') ? 'Concluído' : 'Pendente'}</small></NavLink>)}</div>}<NavLink className="button" to="/habits">Registrar hábito</NavLink></article><article className="panel"><h2>Metas ativas</h2>{goals.length === 0 ? <p>Defina uma meta mensurável.</p> : <div className="home-list">{goals.slice(0, 4).map(goal => <NavLink to="/goals" key={goal.id}><span>{goal.title}</span><small>{goalProgress(goal, logs)} / {goal.target_value} {goal.unit}</small></NavLink>)}</div>}<NavLink className="button secondary-button" to="/goals">Ver metas</NavLink></article></section></>
}

function Metric({ label, value }: { label: string; value: string }) { return <article className="metric"><p>{label}</p><strong>{value}</strong></article> }
function PrivateAccessDenied() { return <main className="centered setup"><h1>Acesso privado</h1><p>Esta instalação do Cavern não está autorizada para esta conta.</p><button onClick={() => void supabase?.auth.signOut()}>Sair</button></main> }
function Profile({ email }: { email: string }) { return <><header><p className="eyebrow">CAVERN</p><h1>Perfil</h1></header><section className="panel"><p>{email}</p><button onClick={() => void supabase?.auth.signOut()}>Sair</button></section><DeviceSettings /></> }
function LocalProfile({ onLogout }: { onLogout?: () => void }) {
  const [name, setName] = useState(() => localStorage.getItem('cavern.profile.name') ?? '')
  const [saved, setSaved] = useState(false)
  function save(event: FormEvent) { event.preventDefault(); localStorage.setItem('cavern.profile.name', name.trim()); setSaved(true); window.setTimeout(() => setSaved(false), 2200) }
  function logout() { localStorage.removeItem('cavern.local.authenticated'); localStorage.removeItem('cavern.local.user'); onLogout?.() }
  return <><header><p className="eyebrow">PREFERÊNCIAS</p><h1>Perfil</h1><p>Este perfil fica salvo neste dispositivo.</p></header><section className="panel profile-form"><form className="form" onSubmit={save}><label>Como quer ser chamado?<input value={name} placeholder="Seu nome" onChange={event => setName(event.target.value)} /></label><button>Salvar perfil</button>{saved && <p className="saved-message" role="status">Perfil salvo.</p>}</form><div className="profile-preference"><span>Tema da interface</span><ThemeToggle /></div><p className="profile-note">Hábitos, metas, livros e progresso permanecem disponíveis neste dispositivo, inclusive sem internet.</p><button className="danger" onClick={logout}>Sair da instalação</button></section><DeviceSettings /></>
}

function DeviceSettings() {
  return <section className="panel device-settings"><div><p className="eyebrow">APLICATIVO</p><h2>Instalação e lembretes</h2><p>Configure o Cavern para funcionar como aplicativo no celular ou desktop.</p></div><InstallControl /><NotificationSettings /></section>
}

function Auth() {
  const [register, setRegister] = useState(false); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const canRegister = !allowedEmail
  async function submit(event: FormEvent) { event.preventDefault(); if (!supabase) return; setBusy(true); setMessage(''); const response = register ? await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } }) : await supabase.auth.signInWithPassword({ email, password }); setBusy(false); setMessage(response.error?.message ?? (register ? 'Conta criada. Confira seu e-mail para confirmar o cadastro.' : '')) }
  async function reset() { if (!supabase || !email) return setMessage('Informe seu e-mail para recuperar a senha.'); const { error } = await supabase.auth.resetPasswordForEmail(email); setMessage(error?.message ?? 'Instruções enviadas para seu e-mail.') }
  return <main className="auth">
    <form className="auth-card" onSubmit={submit}>
      <AuthBrand />
      <div className="auth-heading"><h1>{register ? 'Criar sua conta' : 'Entrar no Cavern'}</h1><p>{register ? 'Comece seu ciclo com intenção.' : 'Entre na sua caverna.'}</p></div>
      {register && <label htmlFor="auth-name">Nome
        <input id="auth-name" required autoComplete="name" placeholder="Como quer ser chamado?" value={name} onChange={event => setName(event.target.value)} />
      </label>}
      <label htmlFor="auth-email">E-mail
        <input id="auth-email" required autoComplete="email" placeholder="voce@exemplo.com" type="email" value={email} onChange={event => setEmail(event.target.value)} />
      </label>
      <label htmlFor="auth-password">Senha
        <input id="auth-password" required autoComplete={register ? 'new-password' : 'current-password'} minLength={8} placeholder="Digite sua senha" type="password" value={password} onChange={event => setPassword(event.target.value)} />
      </label>
      {message && <p className="message" role="status">{message}</p>}
      <button className="auth-submit" disabled={busy}>{busy ? 'Aguarde...' : register ? 'Criar conta' : 'Entrar'}</button>
      <div className="auth-secondary-actions">
        {!register && <button type="button" className="link" onClick={reset}>Esqueci minha senha</button>}
        {canRegister && <button type="button" className="link" onClick={() => setRegister(!register)}>{register ? 'Já tenho uma conta' : 'Criar conta'}</button>}
      </div>
    </form>
  </main>
}

function AuthBrand() {
  return <div className="auth-brand"><img alt="" aria-hidden="true" src="/app-icon.svg" /><span>CAVERN</span></div>
}
