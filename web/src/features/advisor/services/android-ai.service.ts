import { Capacitor, registerPlugin } from '@capacitor/core'

type ModelStatus = 'available' | 'downloadable' | 'downloading' | 'unavailable'
type OnDeviceAiPlugin = {
  status(): Promise<{ status: ModelStatus }>
  download(): Promise<void>
  generate(options: { prompt: string }): Promise<{ text: string }>
}

const nativeAi = registerPlugin<OnDeviceAiPlugin>('OnDeviceAi')

export async function getOnDeviceModelStatus(): Promise<ModelStatus | 'not-android'> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return 'not-android'
  try { return (await nativeAi.status()).status } catch { return 'unavailable' }
}

export async function downloadOnDeviceModel() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') throw new Error('O modelo local está disponível somente no APK Android.')
  await nativeAi.download()
}

export async function generateOnDeviceText(prompt: string): Promise<string | null> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return null
  const status = await getOnDeviceModelStatus()
  if (status !== 'available') return null
  try {
    const result = await nativeAi.generate({ prompt: prompt.slice(0, 11500) })
    return result.text.trim() || null
  } catch { return null }
}
