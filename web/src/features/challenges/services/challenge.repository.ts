import { localDataKeys, readCollection as read, revokeSourceRewards, writeCollection as write } from '../../../lib/local-store'
import type { Challenge, ChallengeRuleLog } from '../domain/challenge'

export function getChallenges() { return read<Challenge>(localDataKeys.challenges).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }
export function getChallenge(id: string) { return getChallenges().find(challenge => challenge.id === id) }
export function saveChallenge(challenge: Challenge) { const current = getChallenges(); const exists = current.some(item => item.id === challenge.id); const next = exists ? current.map(item => item.id === challenge.id ? challenge : item) : [challenge, ...current]; write(localDataKeys.challenges, next); return challenge }
export function removeChallenge(id: string) { write(localDataKeys.challenges, getChallenges().filter(item => item.id !== id)); write(localDataKeys.challengeRuleLogs, getChallengeRuleLogs().filter(item => item.challengeId !== id)); revokeSourceRewards('challenge', sourceId => sourceId === id) }
export function getChallengeRuleLogs() { return read<ChallengeRuleLog>(localDataKeys.challengeRuleLogs) }
export function setChallengeRuleLog(challengeId: string, ruleId: string, date: string, value: number) { const logs = getChallengeRuleLogs(); const found = logs.find(item => item.challengeId === challengeId && item.ruleId === ruleId && item.date === date); const entry: ChallengeRuleLog = { id: found?.id ?? crypto.randomUUID(), challengeId, ruleId, date, value }; write(localDataKeys.challengeRuleLogs, found ? logs.map(item => item.id === found.id ? entry : item) : [...logs, entry]); return entry }
