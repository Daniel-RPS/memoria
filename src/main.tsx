import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import { App } from '@/app/app'
import { solicitarArmazenamentoPersistente } from '@/lib/armazenamento'

void solicitarArmazenamentoPersistente()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
