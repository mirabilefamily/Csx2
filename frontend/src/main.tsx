import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource-variable/inter/opsz.css'
import './index.css'
import App from './App'
import { demoToolsEnabled } from './components/DemoStateSwitcher'
import { initTitleFont } from './lib/titleFont'
import { setDemoState, type DemoState } from './api'

if (demoToolsEnabled) initTitleFont()
// Demo states without UI, read once on load: ?demo=loading|empty|error|live
const demo = new URLSearchParams(window.location.search).get('demo')
if (demo && ['loading', 'empty', 'error', 'live'].includes(demo)) setDemoState(demo as DemoState)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
