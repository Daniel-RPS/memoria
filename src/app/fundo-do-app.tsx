import { useEffect, useRef, useState } from 'react'
import type { Fundo } from '@/lib/aparencia'

/**
 * Camada decorativa fixa atrás de tudo (estilos `.fundo-do-app` em src/index.css): não recebe
 * ponteiro nem mexe no layout ou no arrasto. "Liso" não desenha nada.
 */
export function FundoDoApp({ fundo }: { fundo: Fundo }) {
  const ref = useRef<HTMLDivElement>(null)
  const isPausado = useAbaEscondida()
  useHolofote(ref, fundo === 'grade')

  if (fundo === 'liso') return null
  return (
    <div
      ref={ref}
      aria-hidden
      data-fundo={fundo}
      data-pausado={isPausado || undefined}
      className="fundo-do-app"
    >
      {fundo === 'aurora' && (
        <>
          <span className="mancha" />
          <span className="mancha" />
          <span className="mancha" />
        </>
      )}
    </div>
  )
}

/** Aba escondida: a animação para (o navegador já desacelera, aqui ela congela de vez). */
function useAbaEscondida() {
  const [isEscondida, setIsEscondida] = useState(() => document.hidden)
  useEffect(() => {
    const handleVisibilidade = () => setIsEscondida(document.hidden)
    document.addEventListener('visibilitychange', handleVisibilidade)
    return () => document.removeEventListener('visibilitychange', handleVisibilidade)
  }, [])
  return isEscondida
}

/** Leva o centro do holofote ao ponteiro, no máximo uma vez por quadro; nada com movimento reduzido. */
function useHolofote(ref: React.RefObject<HTMLDivElement | null>, isAtivo: boolean) {
  useEffect(() => {
    if (!isAtivo || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let quadro = 0
    let ultimo: PointerEvent | null = null
    const handleMover = (evento: PointerEvent) => {
      ultimo = evento
      if (quadro) return
      quadro = requestAnimationFrame(() => {
        quadro = 0
        if (!ref.current || !ultimo) return
        ref.current.style.setProperty('--holofote-x', `${ultimo.clientX}px`)
        ref.current.style.setProperty('--holofote-y', `${ultimo.clientY}px`)
      })
    }
    window.addEventListener('pointermove', handleMover, { passive: true })
    return () => {
      window.removeEventListener('pointermove', handleMover)
      cancelAnimationFrame(quadro)
    }
  }, [ref, isAtivo])
}
