import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { addLocalCavern, getLocalCaverns } from '../lib/local-store'

type Cavern = { id: string; name: string; description: string | null; start_date: string; end_date: string; status: string }

const date = (value: Date) => value.toISOString().slice(0, 10)
const initialStartDate = date(new Date())
const initialEndDate = date(new Date(new Date().getTime() + 30 * 86400000))

export function Caverns() {
  const [caverns, setCaverns] = useState<Cavern[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)

  async function load() {
    if (!supabase) { setCaverns(getLocalCaverns()); setLoading(false); return }
    setLoading(true)
    const { data, error: requestError } = await supabase.from('caverns').select('id,name,description,start_date,end_date,status').order('start_date', { ascending: false })
    setError(requestError?.message ?? '')
    setCaverns(data ?? [])
    setLoading(false)
  }
  // Data is intentionally loaded once when this screen connects to Supabase.
  useEffect(() => { void Promise.resolve().then(load) }, [])

  async function create(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || endDate < startDate) return
    setCreating(true); setError('')
    if (!supabase) {
      setCaverns(addLocalCavern({ name: name.trim(), description: description.trim() || null, start_date: startDate, end_date: endDate }))
      setName(''); setDescription(''); setMessage('Caverna criada. Use metas e hábitos para dar forma a este período.'); setCreating(false)
      return
    }
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) { setError('Sessão expirada. Entre novamente.'); setCreating(false); return }
    const { error: requestError } = await supabase.from('caverns').insert({ user_id: userId, name: name.trim(), description: description.trim() || null, start_date: startDate, end_date: endDate })
    setCreating(false)
    if (requestError) { setError(requestError.message); return }
    setName(''); setDescription(''); setMessage('Caverna criada com sucesso.'); await load()
  }

  return <><header><p className="eyebrow">CAVERN</p><h1>Suas cavernas</h1><p>Crie períodos intencionais de foco para agrupar metas e hábitos em torno de uma fase da sua vida.</p></header>{message && <p className="action-feedback" role="status">{message}</p>}<section className="two-columns"><form className="panel form" onSubmit={create}><h2>Nova Caverna</h2><label>Nome<input required value={name} placeholder="Caverna Setembro" onChange={e => setName(e.target.value)} /></label><label>Descrição<input value={description} onChange={e => setDescription(e.target.value)} /></label><div className="date-pair"><label>Início<input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label><label>Fim<input required min={startDate} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label></div>{error && <p className="message">{error}</p>}<button disabled={creating}>{creating ? 'Criando...' : 'Criar Caverna'}</button></form><section>{loading ? <p>Carregando...</p> : caverns.length === 0 ? <div className="empty">Nenhuma Caverna criada ainda.</div> : <div className="stack">{caverns.map(cavern => <article className="panel" key={cavern.id}><p className="eyebrow">{cavern.status}</p><h2>{cavern.name}</h2><p>{cavern.description}</p><small>{formatDate(cavern.start_date)} — {formatDate(cavern.end_date)}</small></article>)}</div>}</section></section></>
}

function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`)) }
