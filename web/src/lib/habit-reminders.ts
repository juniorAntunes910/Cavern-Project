export const REMINDER_ID_BASE = 7100
export const REMINDER_DAYS = 7

export type PlannedReminder = { id: number; at: Date; title: string; body: string }

const title = 'Hábitos pendentes no Cavern'

/** Texto do lembrete de hoje: nomeia até 3 hábitos pendentes. */
export function pendingBody(names: string[]) {
  const shown = names.slice(0, 3).join(', ')
  const extra = names.length > 3 ? ` e mais ${names.length - 3}` : ''
  return `${names.length} ${names.length === 1 ? 'hábito espera' : 'hábitos esperam'} por você: ${shown}${extra}.`
}

/**
 * Planeja os próximos lembretes para o agendador nativo (que não consegue olhar os hábitos na hora de disparar):
 * - hoje só entra se ainda houver hábito pendente e o horário não passou;
 * - os dias seguintes entram sempre, com um texto genérico, e são recalculados toda vez que o app abre ou os dados mudam.
 * `id` = base + deslocamento em dias, para poder cancelar a janela inteira antes de reagendar.
 */
export function planReminders({ now, hour, pendingNames, days = REMINDER_DAYS }: { now: Date; hour: number; pendingNames: string[]; days?: number }): PlannedReminder[] {
  const planned: PlannedReminder[] = []
  for (let offset = 0; offset < days; offset += 1) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, 0, 0, 0)
    if (at.getTime() <= now.getTime()) continue
    if (offset === 0 && pendingNames.length === 0) continue
    planned.push({ id: REMINDER_ID_BASE + offset, at, title, body: offset === 0 ? pendingBody(pendingNames) : 'Ainda há hábitos para marcar hoje? Abra o Cavern e mantenha a sequência.' })
  }
  return planned
}
