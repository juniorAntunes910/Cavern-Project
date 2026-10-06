import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App.tsx'
import { initializeLocalDatabase } from './lib/app-db'
import { closeStaleReadingSessions, localDataKeys, removeCavernsData } from './lib/local-store'
import { gymDataKeys } from './features/gym/services/gym.service'
import { registerAppServiceWorker } from './lib/pwa'
import './index.css'
import './motion.css'

async function startApp() {
  try {
    await initializeLocalDatabase([...Object.values(localDataKeys), ...Object.values(gymDataKeys)])
    await removeCavernsData()
    closeStaleReadingSessions()
  } catch (error) {
    console.error('O armazenamento do navegador está indisponível. Tentando abrir os dados locais.', error)
  }
  // No Electron o app abre como arquivo (file://): não há service worker e as rotas usam #.
  const desktopFile = window.location.protocol === 'file:'
  if (!desktopFile) void registerAppServiceWorker()
  const Router = desktopFile ? HashRouter : BrowserRouter
  createRoot(document.getElementById('root')!).render(
    <StrictMode><Router><App /></Router></StrictMode>,
  )
}

void startApp()
