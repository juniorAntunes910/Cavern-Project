import { useEffect, useRef, useState } from 'react'
import { getLocalAchievements, grantLocalReward, unlockLocalAchievement } from '../../lib/local-store'
import { useLocalRevision } from '../../lib/use-local-revision'
import { achievements, type Achievement } from './domain/achievement'
import { evaluateAchievements, formatAchievementProgress } from './services/achievement.service'
import './achievements.css'

const rarityLabels: Record<Achievement['rarity'], string> = { COMMON: 'Comum', RARE: 'Rara', EPIC: 'Épica', LEGENDARY: 'Lendária' }
const categoryLabels: Record<Achievement['category'], string> = { STREAK: 'Sequência', HABITS: 'Hábitos', FOCUS: 'Foco', READING: 'Leitura', GYM: 'Academia', GOALS: 'Metas', CHALLENGES: 'Caverna', SPECIAL: 'Especial' }

export function AchievementsPage() {
  useLocalRevision()
  const [selected, setSelected] = useState<Achievement | null>(null)
  useEffect(() => {
    evaluateAchievements().forEach(item => {
      if (unlockLocalAchievement(item.id)) grantLocalReward('achievement', item.id, item.rewardXp, item.rewardEmbers, item.title)
    })
  }, [])
  const unlocked = new Set(getLocalAchievements().map(item => item.id))
  const secret = achievements.find(item => item.hidden)
  const regular = achievements.filter(item => !item.hidden)
  const platinum = unlocked.size === achievements.length

  return <>
    <header><p className="eyebrow">CONQUISTAS</p><h1>Conquistas</h1><p>Seus marcos aparecem aqui conforme a jornada avança.</p></header>
    <section className={`platinum-marker ${platinum ? 'complete' : ''}`}><span>{platinum ? '🏆' : '◇'}</span><div><p className="eyebrow">PLATINA DA CAVERNA</p><h2>{unlocked.size} / {achievements.length} conquistas</h2><p>{platinum ? 'Você alcançou todos os marcos da Caverna.' : 'Complete os marcos para alcançar a Platina.'}</p></div><div className="progress-track"><i style={{ width: `${unlocked.size / achievements.length * 100}%` }} /></div></section>
    <section className="shop-grid">{regular.map(item => <AchievementCard item={item} unlocked={unlocked.has(item.id)} onOpen={() => setSelected(item)} key={item.id} />)}</section>
    {secret && <section className="secret-achievement-wrap"><AchievementCard item={secret} unlocked={unlocked.has(secret.id)} secret onOpen={() => setSelected(secret)} /></section>}
    <AchievementDialog achievement={selected} unlocked={selected ? unlocked.has(selected.id) : false} onClose={() => setSelected(null)} />
  </>
}

function AchievementCard({ item, unlocked, secret = false, onOpen }: { item: Achievement; unlocked: boolean; secret?: boolean; onOpen: () => void }) {
  const title = unlocked || !item.hidden ? item.title : 'Conquista secreta'
  return <article className={`panel shop-item achievement-card ${unlocked ? 'achievement-unlocked' : ''} ${secret ? 'secret-achievement' : ''}`} role="button" tabIndex={0} aria-label={`Ver conquista: ${title}`} onClick={onOpen} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen() } }}>
    {unlocked && <span className="achievement-complete" aria-label="Conquista concluída">✓ Concluída</span>}
    <strong aria-hidden="true">{secret && !unlocked ? '🏆' : item.icon}</strong>
    <p className="eyebrow">{unlocked ? 'DESBLOQUEADA' : 'EM PROGRESSO'}</p>
    <h2>{title}</h2>
    <p>{unlocked ? item.description : item.hidden ? 'Continue sua jornada para descobrir.' : formatAchievementProgress(item.condition)}</p>
    <b>+{item.rewardXp} XP · +{item.rewardEmbers} Brasas</b>
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
  return <div className="dialog-backdrop" onMouseDown={onClose}><section className="confirm-dialog achievement-dialog" role="dialog" aria-modal="true" aria-labelledby="achievement-dialog-title" onMouseDown={event => event.stopPropagation()}>
    <p className="eyebrow">{categoryLabels[achievement.category]} · {rarityLabels[achievement.rarity]}</p>
    <strong>{hidden ? '🏆' : achievement.icon}</strong>
    <h2 id="achievement-dialog-title">{hidden ? 'Conquista secreta' : achievement.title}</h2>
    <p>{hidden ? 'Continue sua jornada para descobrir este marco.' : achievement.description}</p>
    <div className="achievement-requirement"><span>Para desbloquear</span><b>{hidden ? 'Critério secreto' : achievement.progressLabel}</b><strong>{hidden ? '???' : formatAchievementProgress(achievement.condition)}</strong></div>
    <p className="achievement-reward">+{achievement.rewardXp} XP · +{achievement.rewardEmbers} Brasas</p>
    <button ref={closeRef} onClick={onClose}>Fechar</button>
  </section></div>
}
