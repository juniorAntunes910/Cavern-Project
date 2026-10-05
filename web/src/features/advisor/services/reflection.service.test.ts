import { describe, expect, it } from 'vitest'
import { crisisResourcesMessage, detectImmediateRisk, reflectWithAi } from './reflection.service'

describe('reflectWithAi', () => {
  it('responde com recursos de crise e marca risco urgente', async () => {
    const answer = await reflectWithAi('quero me matar', [], [])
    expect(answer.riskLevel).toBe('urgent')
    expect(answer.reply).toBe(crisisResourcesMessage)
  })

  it('não trata negações como risco', () => {
    expect(detectImmediateRisk('não quero me matar, só estou cansado')).toBe(false)
  })

  it('avisa quando o assunto pertence a uma área não liberada', async () => {
    const answer = await reflectWithAi('como estão meus gastos?', [], ['reading'])
    expect(answer.mode).toBe('local')
    expect(answer.reply).toContain('finanças')
    expect(answer.reply).toContain('não liberou')
  })

  it('herda o assunto anterior em mensagens curtas de continuação', async () => {
    const history = [{ role: 'user' as const, content: 'como estão meus gastos?' }, { role: 'assistant' as const, content: 'ok' }]
    const answer = await reflectWithAi('e agora?', history, ['reading'])
    expect(answer.reply).toContain('finanças')
  })

  it('sem assunto reconhecido, não presume causa e faz uma pergunta', async () => {
    const answer = await reflectWithAi('hoje o dia foi estranho', [], ['reading'])
    expect(answer.reply).toContain('não vou presumir uma causa')
    expect(answer.reply).toContain('?')
  })
})
