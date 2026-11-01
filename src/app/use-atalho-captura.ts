import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { isCampoDeTexto } from '@/lib/teclado'

/** Estado de navegação que pede à captura do Início para pegar o foco. */
interface PedidoDeFocarCaptura {
  focarCaptura: number
}

export function isPedidoDeFocarCaptura(estado: unknown): estado is PedidoDeFocarCaptura {
  return typeof estado === 'object' && estado !== null && 'focarCaptura' in estado
}

/**
 * Ctrl+K (ou ⌘K) de qualquer tela, ou "N" fora de um campo de texto, abre o Início com o
 * campo de captura focado. Cada pedido leva um número novo para focar mesmo já estando lá.
 */
export function useAtalhoCaptura() {
  const navigate = useNavigate()

  useEffect(() => {
    function handleKeyDown(evento: KeyboardEvent) {
      const tecla = evento.key.toLowerCase()
      const isCtrlK =
        (evento.ctrlKey || evento.metaKey) && !evento.shiftKey && !evento.altKey && tecla === 'k'
      const isN =
        tecla === 'n' &&
        !evento.ctrlKey &&
        !evento.metaKey &&
        !evento.altKey &&
        !isCampoDeTexto(evento.target) &&
        // Com menu ou diálogo aberto, a tecla é deles.
        document.querySelector('[role="dialog"], [role="menu"]') === null
      if (!isCtrlK && !isN) return
      evento.preventDefault()
      const pedido: PedidoDeFocarCaptura = { focarCaptura: Date.now() }
      // Já no Início, não empilha histórico a cada atalho.
      void navigate('/inicio', { state: pedido, replace: window.location.pathname === '/inicio' })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])
}
