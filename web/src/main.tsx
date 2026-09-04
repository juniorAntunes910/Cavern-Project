import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { initializeLocalDatabase } from './lib/app-db'
import { localDataKeys } from './lib/local-store'
import { registerAppServiceWorker } from './lib/pwa'
import './index.css'

async function startApp() {
  await initializeLocalDatabase(Object.values(localDataKeys))
  void registerAppServiceWorker()
  createRoot(document.getElementById('root')!).render(
    <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>,
  )
}

void startApp()
