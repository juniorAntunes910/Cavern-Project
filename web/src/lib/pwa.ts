interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let installPrompt: InstallPromptEvent | null = null

function announceInstallState() {
  window.dispatchEvent(new Event('cavern:install-state-changed'))
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault()
  installPrompt = event as InstallPromptEvent
  announceInstallState()
})

window.addEventListener('appinstalled', () => {
  installPrompt = null
  announceInstallState()
})

export function isAppInstalled() {
  return Capacitor.isNativePlatform() || window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function canInstallApp() {
  return installPrompt !== null
}

export async function installApp() {
  if (!installPrompt) return 'unavailable' as const
  await installPrompt.prompt()
  const { outcome } = await installPrompt.userChoice
  if (outcome === 'accepted') installPrompt = null
  announceInstallState()
  return outcome
}

export async function registerAppServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' })
    void registration.update()
    return registration
  } catch (error) {
    console.error('Não foi possível registrar o modo offline.', error)
    return null
  }
}
import { Capacitor } from '@capacitor/core'
