import { useEffect, useState } from 'react'
import { canInstallApp, installApp, isAppInstalled } from '../lib/pwa'

export function InstallBanner() {
  const [installable, setInstallable] = useState(canInstallApp)
  const [installed, setInstalled] = useState(isAppInstalled)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const refresh = () => {
      setInstallable(canInstallApp())
      setInstalled(isAppInstalled())
    }
    window.addEventListener('cavern:install-state-changed', refresh)
    return () => window.removeEventListener('cavern:install-state-changed', refresh)
  }, [])

  if (installed) return null

  async function install() {
    const result = await installApp()
    setInstallable(canInstallApp())
    setInstalled(isAppInstalled())
    if (result === 'unavailable') setMessage('No Chrome ou Edge, abra o menu do navegador e escolha “Instalar aplicativo”.')
    if (result === 'dismissed') setMessage('Instalação cancelada. Você pode tentar novamente quando quiser.')
  }

  return <section className="install-banner" aria-label="Instalar aplicativo">
    <div><strong>Leve o Cavern com você</strong><span>Instale no celular ou desktop para usar como aplicativo.</span>{message && <small role="status">{message}</small>}</div>
    <button type="button" onClick={() => void install()}>{installable ? 'Instalar aplicativo' : 'Como instalar o aplicativo'}</button>
  </section>
}

export function InstallControl() {
  const [installable, setInstallable] = useState(canInstallApp)
  const [installed, setInstalled] = useState(isAppInstalled)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const refresh = () => {
      setInstallable(canInstallApp())
      setInstalled(isAppInstalled())
    }
    window.addEventListener('cavern:install-state-changed', refresh)
    return () => window.removeEventListener('cavern:install-state-changed', refresh)
  }, [])

  async function install() {
    const result = await installApp()
    if (result === 'dismissed') setMessage('Instalação cancelada. Você pode tentar novamente quando quiser.')
    if (result === 'unavailable') setMessage('Use a opção “Instalar aplicativo” no menu do Chrome ou Edge.')
  }

  return <div className="app-setting-row">
    <div><strong>Aplicativo</strong><span>{installed ? 'O Cavern já está instalado neste dispositivo.' : 'Instale com ícone próprio e acesso em tela cheia.'}</span></div>
    {installed ? <span className="status-pill">Instalado</span> : <button type="button" className="subtle" onClick={() => void install()}>{installable ? 'Instalar agora' : 'Como instalar'}</button>}
    {message && <p className="setting-message" role="status">{message}</p>}
  </div>
}
