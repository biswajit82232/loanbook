import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { loadSettings } from './data/settings'
import { applyAppearance } from './utils/appearance'
import './index.css'
import App from './App.tsx'

applyAppearance(loadSettings())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
