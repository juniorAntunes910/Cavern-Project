import { useEffect, useRef, useState } from 'react'
import { CountUp } from '../../components/CountUp'
import { getLocalAchievements } from '../../lib/local-store'
import { useLocalRevision } from '../../lib/use-local-revision'
import { achievements, type Achievement } from './domain/achievement'
import { formatAchievementProgress, getAchievementRatio } from './services/achievement.service'
import './achievements.css'

const rarityLabels: Record<Achievement['rarity'], string> = { COMMON: 'Comum', RARE: 'Rara', EPIC: 'Épica', LEGENDARY: 'Lendária' }
const rarityOrder: Achievement['rarity'][] = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY']
const categoryLabels: Record<Achievement['category'], string> = { STREAK: 'Sequência', HABITS: 'Hábitos', FOCUS: 'Foco', READING: 'Leitura', GYM: 'Academia', GOALS: 'Metas', CHALLENGES: 'Caverna', SPECIAL: 'Especial' }
type StatusFilter = 'all' | 'unlocked' | 'progress'
const statusLabels: Record<StatusFilter, string> = { all: 'Todas', unlocked: 'Desbloqueadas', progress: 'Em progresso' }

export function AchievementsPage() {
  useLocalRevision()
  const [selected, setSelected] = useState<Achievement | null>(null)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [category, setCategory] = useState<Achievement['category'] | 'all'>('all')
  const unlocked = new Set(getLocalAchievements().map(item => item.id))
  const secret = achievements.find(item => item.hidden)
  const regular = achievements.filter(item => !item.hidden)
  const platinum = unlocked.size === achievements.length
  const percent = Math.round(unlocked.size / achievements.length * 100)
  const earned = achievements.filter(item => unlocked.has(item.id)).reduce((sum, item) => ({ xp: sum.xp + item.rewardXp, embers: sum.embers + item.rewardEmbers }), { xp: 0, embers: 0 })
  const categories = [...new Set(regular.map(item => item.category))]
  const counts: Record<StatusFilter, number> = { all: regular.length, unlocked: regular.filter(item => unlocked.has(item.id)).length, progress: regular.filter(item => !unlocked.has(item.id)).length }
  const visible = regular
    .filter(item => status === 'all' || (status === 'unlocked') === unlocked.has(item.id))
    .filter(item => category === 'all' || item.category === category)
    .sort((left, right) => Number(unlocked.has(right.id)) - Number(unlocked.has(left.id)) || rarityOrder.indexOf(right.rarity) - rarityOrder.indexOf(left.rarity))

  return <>
    <header><p className="eyebrow">CONQUISTAS</p><h1>Conquistas</h1><p>Seus marcos aparecem aqui conforme a jornada avança.</p></header>

    <section className={`achievement-hero${platinum ? ' complete' : ''}`} aria-label="Resumo das conquistas">
      <div className="achievement-ring" role="img" aria-label={`${unlocked.size} de ${achievements.length} conquistas, ${percent}%`}>
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="ring-bg" cx="60" cy="60" r="52" /><circle className="ring-fill" cx="60" cy="60" r="52" pathLength={100} style={{ strokeDasharray: `${percent} 100` }} /></svg>
        <div><strong><CountUp value={unlocked.size} /></strong><span>de {achievements.length}</span></div>
      </div>
      <div className="achievement-hero-info">
        <p className="eyebrow">{platinum ? 'PLATINA ALCANÇADA' : 'PLATINA DA CAVERNA'}</p>
        <h2>{platinum ? '🏆 Você alcançou todos os marcos' : `${percent}% da jornada concluída`}</h2>
        <p>{platinum ? 'Cada conquista da Caverna é sua.' : 'Complete todos os marcos para alcançar a Platina.'}</p>
        <div className="achievement-rarities">{rarityOrder.map(rarity => {
          const total = achievements.filter(item => item.rarity === rarity).length
          const done = achievements.filter(item => item.rarity === rarity && unlocked.has(item.id)).length
          return total ? <span className={`rarity-pill ${rarity.toLowerCase()}`} key={rarity}><i aria-hidden="true" />{rarityLabels[rarity]} <b>{done}/{total}</b></span> : null
        })}</div>
      </div>
      <dl className="achievement-earned"><div><dt>XP ganho</dt><dd>+<CountUp value={earned.xp} /></dd></div><div><dt>Brasas ganhas</dt><dd>+<CountUp value={earned.embers} /></dd></div></dl>
    </section>

    <section className="achievement-toolbar" aria-label="Filtrar conquistas">
      <div className="achievement-tabs" role="group" aria-label="Situação">{(Object.keys(statusLabels) as StatusFilter[]).map(key => <button type="button" className={`subtle${status === key ? ' active' : ''}`} aria-pressed={status === key} onClick={() => setStatus(key)} key={key}>{statusLabels[key]} <small>{counts[key]}</small></button>)}</div>
      <div className="achievement-tabs" role="group" aria-label="Categoria"><button type="button" className={`subtle${category === 'all' ? ' active' : ''}`} aria-pressed={category === 'all'} onClick={() => setCategory('all')}>Todas as áreas</button>{categories.map(key => <button type="button" className={`subtle${category === key ? ' active' : ''}`} aria-pressed={category === key} onClick={() => setCategory(key)} key={key}>{categoryLabels[key]}</button>)}</div>
    </section>

    {visible.length ? <section className="achievement-grid" aria-live="polite">{visible.map(item => <AchievementCard item={item} unlocked={unlocked.has(item.id)} onOpen={() => setSelected(item)} key={item.id} />)}</section>
      : <p className="empty achievement-empty">Nenhuma conquista neste filtro ainda. Continue a jornada!</p>}
    {secret && <section className="secret-achievement-wrap"><AchievementCard item={secret} unlocked={unlocked.has(secret.id)} secret onOpen={() => setSelected(secret)} /></section>}
    <AchievementDialog achievement={selected} unlocked={selected ? unlocked.has(selected.id) : false} onClose={() => setSelected(null)} />
  </>
}

function AchievementCard({ item, unlocked, secret = false, onOpen }: { item: Achievement; unlocked: boolean; secret?: boolean; onOpen: () => void }) {
  const hidden = item.hidden && !unlocked
  const title = hidden ? 'Conquista secreta' : item.title
  const ratio = unlocked ? 1 : hidden ? 0 : getAchievementRatio(item.condition)
  return <article className={`panel achievement-card rarity-${item.rarity.toLowerCase()}${unlocked ? ' achievement-unlocked' : ' locked'}${secret ? ' secret-achievement' : ''}`} role="button" tabIndex={0} aria-label={`Ver conquista: ${title}`} onClick={onOpen} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen() } }}>
    <div className="achievement-medal" aria-hidden="true"><span>{hidden ? '❔' : item.icon}</span>{!unlocked && <em>🔒</em>}</div>
    <div className="achievement-card-head"><span className="rarity-tag">{rarityLabels[item.rarity]}</span>{unlocked && <span className="achievement-complete" aria-label="Conquista concluída">✓ Concluída</span>}</div>
    <h2>{title}</h2>
    <p className="achievement-text">{unlocked ? item.description : hidden ? 'Continue sua jornada para descobrir.' : item.description}</p>
    {!hidden && <div className="achievement-meter" aria-hidden="true"><div className="progress-track"><i style={{ width: `${ratio * 100}%` }} /></div><small>{unlocked ? 'Completa' : formatAchievementProgress(item.condition)}</small></div>}
    <div className="achievement-rewards"><span>+{item.rewardXp} XP</span><span>+{item.rewardEmbers} Brasas</span></div>
  </article>
}

function AchievementDialog({ achievement, unlocked, onClose }: { achievement: Achievement | null; unlocked: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    if (!achievement) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onCloseRef.current() }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); previous?.focus() }
  }, [achievement])
  if (!achievement) return null
  const hidden = achievement.hidden && !unlocked
  const ratio = unlocked ? 1 : hidden ? 0 : getAchievementRatio(achievement.condition)
  return <div className="dialog-backdrop" onMouseDown={onClose}><section className={`confirm-dialog achievement-dialog rarity-${achievement.rarity.toLowerCase()}${unlocked ? ' achievement-unlocked' : ' locked'}`} role="dialog" aria-modal="true" aria-labelledby="achievement-dialog-title" onMouseDown={event => event.stopPropagation()}>
    <div className="achievement-medal large" aria-hidden="true"><span>{hidden ? '❔' : achievement.icon}</span>{!unlocked && <em>🔒</em>}</div>
    <p className="eyebrow">{categoryLabels[achievement.category]} · {rarityLabels[achievement.rarity]}</p>
    <h2 id="achievement-dialog-title">{hidden ? 'Conquista secreta' : achievement.title}</h2>
    <p>{hidden ? 'Continue sua jornada para descobrir este marco.' : achievement.description}</p>
    <div className="achievement-requirement"><span>{unlocked ? 'Concluída' : 'Para desbloquear'}</span><b>{hidden ? 'Critério secreto' : achievement.progressLabel}</b>{!hidden && <div className="progress-track"><i style={{ width: `${ratio * 100}%` }} /></div>}<strong>{hidden ? '???' : formatAchievementProgress(achievement.condition)}</strong></div>
    <div className="achievement-rewards center"><span>+{achievement.rewardXp} XP</span><span>+{achievement.rewardEmbers} Brasas</span></div>
    <button ref={closeRef} onClick={onClose}>Fechar</button>
  </section></div>
}
