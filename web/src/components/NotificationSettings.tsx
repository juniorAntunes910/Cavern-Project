import { Select } from './Select'
import { useEffect, useState } from 'react'
import { isAppInstalled } from '../lib/pwa'
import { disableHabitNotifications, enableHabitNotifications, getNotificationSettings, updateNotificationHour, type NotificationSettings as Settings } from '../lib/notifications'

const hours = [8, 12, 18, 20, 21]

export function NotificationSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { void getNotificationSettings().then(setSettings) }, [])

  async function toggle() {
    if (!settings) return
    setBusy(true)
    setMessage('')
    const next = settings.enabled ? await disableHabitNotifications() : await enableHabitNotifications(settings.hour)
    setSettings(next)
    setBusy(false)
    if (next.permission === 'denied') setMessage('As notificações estão bloqueadas. Libere-as nas configurações do navegador ou do aplicativo.')
    else setMessage(next.enabled ? 'Lembrete diário ativado.' : 'Lembrete diário desativado.')
  }

  async function changeHour(hour: number) {
    setSettings(await updateNotificationHour(hour))
    setMessage(`Horário do lembrete alterado para ${hour}:00.`)
  }

  if (!settings) return <div className="app-setting-row"><span>Carregando preferências de notificação...</span></div>
  const unsupported = settings.permission === 'unsupported'
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const unsupportedHint = isIos && !isAppInstalled()
    ? 'No iPhone os lembretes só funcionam com o Cavern instalado: toque em Compartilhar › Adicionar à Tela de Início e abra o app por lá.'
    : 'Este navegador não oferece notificações. No Android, use o aplicativo do Cavern ou o Chrome.'

  return <div className="app-setting-row">
    <div><strong>Lembrete de hábitos</strong><span>Uma notificação por dia quando ainda houver hábitos pendentes.</span></div>
    <div className="notification-actions">
      <label>Horário
        <Select compact disabled={!settings.enabled || busy} value={settings.hour} onChange={event => void changeHour(Number(event.target.value))}>
          {hours.map(hour => <option value={hour} key={hour}>{String(hour).padStart(2, '0')}:00</option>)}
        </Select>
      </label>
      <button type="button" className={settings.enabled ? 'danger' : 'subtle'} disabled={busy || unsupported} onClick={() => void toggle()}>
        {unsupported ? 'Indisponível' : busy ? 'Aguarde...' : settings.enabled ? 'Desativar' : 'Ativar notificações'}
      </button>
    </div>
    {unsupported && <p className="setting-message">{unsupportedHint}</p>}
    {message && <p className="setting-message" role="status">{message}</p>}
  </div>
}
