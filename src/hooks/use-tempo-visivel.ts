import { useEffect, useEffectEvent, useRef } from 'react'

/**
 * Chama `onExpirar` depois de `duracaoMs` contados só com a aba visível
 * (`document.visibilityState === "visible"`): em segundo plano o contador pausa.
 */
export function useTempoVisivel(duracaoMs: number, onExpirar: () => void) {
  const restanteRef = useRef(duracaoMs)
  const expirar = useEffectEvent(onExpirar)

  useEffect(() => {
    let temporizador: number | undefined
    let inicio = 0

    function iniciar() {
      inicio = Date.now()
      temporizador = window.setTimeout(() => expirar(), restanteRef.current)
    }
    function pausar() {
      if (temporizador === undefined) return
      window.clearTimeout(temporizador)
      temporizador = undefined
      restanteRef.current = Math.max(0, restanteRef.current - (Date.now() - inicio))
    }
    function handleVisibilidade() {
      if (document.visibilityState === 'visible') {
        if (temporizador === undefined) iniciar()
      } else {
        pausar()
      }
    }

    if (document.visibilityState === 'visible') iniciar()
    document.addEventListener('visibilitychange', handleVisibilidade)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilidade)
      pausar()
    }
  }, [])
}
