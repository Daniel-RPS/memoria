import { useLayoutEffect, useRef, type RefObject } from 'react'

/** Duração da troca de lugar dos cartões (curta: é só para mostrar o que mudou). */
const DURACAO_MS = 180
/** Depois de arrastar, o cartão já está no lugar escolhido: não anima de novo. */
const FOLGA_APOS_ARRASTAR_MS = 600

/**
 * Anima o elemento do lugar antigo para o novo quando a `posicao` dele muda (técnica FLIP).
 * Mudança de layout sem troca de posição (abrir/recolher um bloco) não anima. Parado com
 * `prefers-reduced-motion`, durante um arrasto e logo depois dele.
 */
export function useAnimarTrocaDeLugar(
  ref: RefObject<HTMLElement | null>,
  posicao: number,
  isArrastando = false,
) {
  const anteriorRef = useRef<{ posicao: number; x: number; y: number } | null>(null)
  const ultimoArrastoRef = useRef(Number.NEGATIVE_INFINITY)

  useLayoutEffect(() => {
    if (isArrastando) ultimoArrastoRef.current = performance.now()
    const elemento = ref.current
    if (!elemento) return
    const atual = { posicao, x: elemento.offsetLeft, y: elemento.offsetTop }
    const anterior = anteriorRef.current
    anteriorRef.current = atual
    if (!anterior || anterior.posicao === posicao) return
    if (isArrastando || performance.now() - ultimoArrastoRef.current < FOLGA_APOS_ARRASTAR_MS)
      return
    if (typeof elemento.animate !== 'function') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const dx = anterior.x - atual.x
    const dy = anterior.y - atual.y
    if (dx === 0 && dy === 0) return
    elemento.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
      { duration: DURACAO_MS, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    )
  })
}
