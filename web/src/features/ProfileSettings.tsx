import { useEffect, useRef, useState } from 'react'
import { getLocalProfile, getProfileAvatar, saveLocalProfile, saveProfileAvatar, type LocalProfile } from '../lib/local-store'
import './profile.css'
import { BackupSettings } from '../components/BackupSettings'

const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const focusLabels = { discipline: 'Disciplina', reading: 'Leitura', fitness: 'Treino', finance: 'Finanças', custom: 'Personalizado' }

export function ProfileSettings({ email, onSignOut }: { email?: string; onSignOut?: () => void }) {
  const [profile, setProfile] = useState<LocalProfile>(getLocalProfile)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => { void getProfileAvatar().then(value => setAvatar(value ?? null)) }, [])
  useEffect(() => { document.documentElement.dataset.motion = profile.motion }, [profile.motion])
  const update = <K extends keyof LocalProfile>(key: K, value: LocalProfile[K]) => setProfile(current => ({ ...current, [key]: value }))
  function save(event: React.FormEvent) { event.preventDefault(); saveLocalProfile(profile); setMessage('Perfil atualizado.'); window.setTimeout(() => setMessage(''), 2600) }
  async function chooseAvatar(event: React.ChangeEvent<HTMLInputElement>) { const selected = event.target.files?.[0]; if (!selected) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 5_000_000) { setMessage('Escolha uma imagem JPG, PNG ou WebP de até 5 MB.'); return }; const data = await compress(selected); await saveProfileAvatar(data); setAvatar(data); setMessage('Foto de perfil atualizada.') }
  const initials = (profile.name || email || 'C').trim().slice(0, 2).toUpperCase()
  return <div className="profile-page">
    <header><p className="eyebrow">PREFERÊNCIAS</p><h1>Perfil</h1><p>Personalize seu espaço e mantenha seus dados neste dispositivo.</p></header>
    <form onSubmit={save} className="profile-grid">
      <section className="panel profile-identity"><div className="avatar-wrap">{avatar ? <img className="profile-avatar" src={avatar} alt="Sua foto de perfil" /> : <span className="profile-avatar profile-avatar-fallback">{initials}</span>}<button type="button" className="avatar-edit" aria-label="Alterar foto de perfil" onClick={() => file.current?.click()}>✎</button></div><input ref={file} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar}/><div><p className="eyebrow">IDENTIDADE</p><h2>{profile.name || 'Seu perfil'}</h2>{email && <p>{email}</p>}<div className="button-row"><button type="button" className="subtle" onClick={() => file.current?.click()}>Escolher foto</button>{avatar && <button type="button" className="subtle" onClick={() => { void saveProfileAvatar(null); setAvatar(null); setMessage('Foto removida.') }}>Remover</button>}</div></div></section>
      <section className="panel profile-section"><h2>Sobre você</h2><label>Como quer ser chamado?<input value={profile.name} placeholder="Seu nome" onChange={event => update('name', event.target.value)} /></label><label>Frase curta<textarea value={profile.bio} placeholder="O que você quer construir?" maxLength={140} onChange={event => update('bio', event.target.value)} /></label><label>Foco atual<select value={profile.focus} onChange={event => update('focus', event.target.value as LocalProfile['focus'])}>{Object.entries(focusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></section>
      <section className="panel profile-section"><h2>Rotina</h2><label>Horário preferido para lembretes<input type="time" value={profile.reminderTime} onChange={event => update('reminderTime', event.target.value)} /></label><span>Dias ativos</span><div className="day-picker">{days.map((day, index) => <button type="button" aria-pressed={profile.activeDays.includes(index)} className={profile.activeDays.includes(index) ? 'selected' : 'subtle'} key={index} onClick={() => update('activeDays', profile.activeDays.includes(index) ? profile.activeDays.filter(value => value !== index) : [...profile.activeDays, index])}>{day}</button>)}</div><label>Semana começa em<select value={profile.weekStartsOn} onChange={event => update('weekStartsOn', event.target.value as LocalProfile['weekStartsOn'])}><option value="monday">Segunda-feira</option><option value="sunday">Domingo</option></select></label></section>
      <section className="panel profile-section"><h2>Aparência</h2><label>Movimento da interface<select value={profile.motion} onChange={event => update('motion', event.target.value as LocalProfile['motion'])}><option value="full">Animações completas</option><option value="reduced">Reduzir animações</option></select></label><p className="profile-note">A redução de movimento também respeita a preferência de acessibilidade do aparelho.</p></section>
      <section className="panel profile-section profile-privacy"><h2>Privacidade</h2><p>Foto e preferências ficam neste dispositivo. A foto é guardada no IndexedDB, não no LocalStorage.</p>{onSignOut && <button type="button" className="subtle" onClick={onSignOut}>Sair</button>}</section>
      <BackupSettings />
      <button className="profile-save">Salvar perfil</button>{message && <p className="saved-message" role="status">{message}</p>}
    </form>
  </div>
}

async function compress(file: File) { const source = await createImageBitmap(file); const size = Math.min(512, source.width, source.height); const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size; const context = canvas.getContext('2d')!; const side = Math.min(source.width, source.height); context.drawImage(source, (source.width - side) / 2, (source.height - side) / 2, side, side, 0, 0, size, size); source.close(); return canvas.toDataURL('image/webp', .86) }
