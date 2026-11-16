import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import { App } from '@/app/app'
import { solicitarArmazenamentoPersistente } from '@/lib/armazenamento'

// Após deploys, o navegador pode tentar carregar módulos dinâmicos antigos com hash desatualizado.
// Recarrega a página automaticamente para buscar os novos arquivos, limitando a uma recarga a cada 10s para evitar laço.
window.addEventListener('vite:preloadError', (evento) => {
  evento.preventDefault()

  const CHAVE_RECARGA = 'memoria:recarga-por-versao'
  const AGORA = Date.now()
  const INTERVALO_MINIMO_MS = 10_000

  try {
    const ultimaRecargaStr = sessionStorage.getItem(CHAVE_RECARGA)
    const ultimaRecarga = ultimaRecargaStr ? Number(ultimaRecargaStr) : 0

    if (AGORA - ultimaRecarga < INTERVALO_MINIMO_MS) {
      return
    }

    sessionStorage.setItem(CHAVE_RECARGA, String(AGORA))
  } catch {
    // Se o sessionStorage não estiver disponível ou falhar, prossegue com a recarga
  }

  window.location.reload()
})

void solicitarArmazenamentoPersistente()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

