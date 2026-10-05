import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/wallet/polyfill'
import './index.css'
import App from './App.tsx'
import { startIntentsTokenRefresh } from '@/lib/intents-tokens'
import { WalletProvider } from '@/wallet/WalletProvider'

startIntentsTokenRefresh()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </StrictMode>,
)
