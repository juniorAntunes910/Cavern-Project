import { useEffect, useState } from 'react'
import { canInstallApp, installApp, isAppInstalled } from '../lib/pwa'

function useInstallState() { const [installable, setInstallable] = useState(canInstallApp); const [installed, setInstalled] = useState(isAppInstalled); useEffect(() => { const refresh = () => { setInstallable(canInstallApp()); setInstalled(isAppInstalled()) }; window.addEventListener('cavern:install-state-changed', refresh); return () => window.removeEventListener('cavern:install-state-changed', refresh) }, []); return { installable, installed, refresh: () => { setInstallable(canInstallApp()); setInstalled(isAppInstalled()) } } }
function instructions() { const agent = navigator.userAgent.toLowerCase(); if (/iphone|ipad|ipod/.test(agent)) return 'No Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.'; if (/firefox/.test(agent)) return 'O Firefox não oferece instalação de PWA nesta plataforma. Abra este site no Chrome, Edge ou Safari.'; return 'No menu do Chrome ou Edge, escolha “Instalar aplicativo” (ou o ícone de instalação na barra de endereço). Em celulares, use “Adicionar à tela inicial”.' }
function InstallHelp({ onClose }: { onClose: () => void }) { return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="confirm-dialog install-help" role="dialog" aria-modal="true" aria-labelledby="install-help-title" onMouseDown={event => event.stopPropagation()}><p className="eyebrow">INSTALAÇÃO</p><h2 id="install-help-title">Instale pelo navegador</h2><p>{instructions()}</p><small>O navegador só libera a instalação depois que esta página estiver aberta em uma origem segura (HTTPS, ou localhost para testes).</small><div><button onClick={onClose}>Entendi</button></div></section></div> }

export function InstallBanner() {
  const { installable, installed, refresh } = useInstallState(); const [message, setMessage] = useState(''); const [help, setHelp] = useState(false)
  if (installed) return null
  async function install() { if (!installable) return setHelp(true); const result = await installApp(); refresh(); if (result === 'dismissed') setMessage('Instalação cancelada. Você pode tentar novamente quando quiser.'); if (result === 'unavailable') setHelp(true) }
  return <><section className="install-banner" aria-label="Instalar aplicativo"><div><strong>Leve o Cavern com você</strong><span>Instale no celular ou desktop para usar como aplicativo.</span>{message && <small role="status">{message}</small>}</div><button type="button" onClick={() => void install()}>{installable ? 'Instalar aplicativo' : 'Ver como instalar'}</button></section>{help && <InstallHelp onClose={() => setHelp(false)} />}</>
}

export function InstallControl() {
  const { installable, installed, refresh } = useInstallState(); const [message, setMessage] = useState(''); const [help, setHelp] = useState(false)
  async function install() { if (!installable) return setHelp(true); const result = await installApp(); refresh(); if (result === 'dismissed') setMessage('Instalação cancelada. Você pode tentar novamente quando quiser.'); if (result === 'unavailable') setHelp(true) }
  return <><div className="app-setting-row"><div><strong>Aplicativo</strong><span>{installed ? 'O Cavern já está instalado neste dispositivo.' : installable ? 'Pronto para instalar com ícone próprio e tela cheia.' : 'Abra as instruções para instalar pelo seu navegador.'}</span></div>{installed ? <span className="status-pill">Instalado</span> : <button type="button" className="subtle" onClick={() => void install()}>{installable ? 'Instalar agora' : 'Ver como instalar'}</button>}{message && <p className="setting-message" role="status">{message}</p>}</div>{help && <InstallHelp onClose={() => setHelp(false)} />}</>
}
