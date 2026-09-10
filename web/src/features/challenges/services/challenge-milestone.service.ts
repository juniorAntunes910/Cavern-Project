import { addLocalTimelineEvent, grantConfiguredReward } from '../../../lib/local-store'
import type { Challenge } from '../domain/challenge'
import { calculateChallengeProgress } from './challenge-progress.service'
import { saveChallenge } from './challenge.repository'

export function reconcileChallengeMilestones(challenge: Challenge) { const progress = calculateChallengeProgress(challenge); const changed = challenge.checkpoints.map(checkpoint => progress.currentDay >= checkpoint.day && !checkpoint.reachedAt ? { ...checkpoint, reachedAt: new Date().toISOString() } : checkpoint); const reached = changed.filter((checkpoint, index) => checkpoint.reachedAt && !challenge.checkpoints[index].reachedAt); if (!reached.length) return challenge; const next = { ...challenge, checkpoints: changed }; saveChallenge(next); reached.forEach(checkpoint => { grantConfiguredReward('CHALLENGE_CHECKPOINT', 'checkpoint', `${challenge.id}:${checkpoint.day}`, `Checkpoint: ${checkpoint.title}`); addLocalTimelineEvent({ type: 'challenge_checkpoint', title: checkpoint.title, description: `Checkpoint do dia ${checkpoint.day} em ${challenge.name}` }) }); return next }
