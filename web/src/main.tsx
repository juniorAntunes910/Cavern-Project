import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { initializeLocalDatabase } from './lib/app-db'
import { localDataKeys, removeCavernsData } from './lib/local-store'
import { gymDataKeys } from './features/gym/services/gym.service'
import { registerAppServiceWorker } from './lib/pwa'
import './index.css'

async function startApp() {
  try {
    await initializeLocalDatabase([...Object.values(localDataKeys), ...Object.values(gymDataKeys)])
    await removeCavernsData()
  } catch (error) {
    console.error('O armazenamento do navegador está indisponível. Tentando abrir os dados locais.', error)
  }
  void registerAppServiceWorker()
  createRoot(document.getElementById('root')!).render(
    <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>,
  )
}

void startApp()
