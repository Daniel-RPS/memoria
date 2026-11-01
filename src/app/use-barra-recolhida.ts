import { useCallback, useEffect, useState } from 'react'
import { gravarPreferencia, lerPreferencia } from '@/app/preferencia-local'

export const CHAVE_BARRA_RECOLHIDA = 'memoria:barra-recolhida'

/**
 * Barra lateral recolhida (só ícones) ou expandida. Só muda quando o usuário manda (botão ou
 * Ctrl+B), nunca ao trocar de tela; a escolha fica guardada entre sessões.
 */
export function useBarraRecolhida() {
  const [isRecolhida, setIsRecolhida] = useState(
    () => lerPreferencia(CHAVE_BARRA_RECOLHIDA) === 'true',
  )

  useEffect(() => {
    gravarPreferencia(CHAVE_BARRA_RECOLHIDA, String(isRecolhida))
  }, [isRecolhida])

  const handleAlternar = useCallback(() => setIsRecolhida((recolhida) => !recolhida), [])

  useEffect(() => {
    function handleTecla(event: KeyboardEvent) {
      const isCtrlB =
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'b'
      if (!isCtrlB || event.repeat) return
      event.preventDefault()
      handleAlternar()
    }
    window.addEventListener('keydown', handleTecla)
    return () => window.removeEventListener('keydown', handleTecla)
  }, [handleAlternar])

  return { isRecolhida, handleAlternar }
}
