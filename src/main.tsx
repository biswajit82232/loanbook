import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { loadSettings } from './data/settings'
import { registerAppUpdates } from './lib/pwa-update'
import { applyAppearance } from './utils/appearance'
import './index.css'
import App from './App.tsx'

applyAppearance(loadSettings())
registerAppUpdates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
