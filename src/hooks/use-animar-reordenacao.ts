import { useCallback, useLayoutEffect, useRef } from 'react'

const DURACAO_MS = 200
/** Depois de um arrastar, a ordem nova é a que a pessoa escolheu: não anima o assentamento. */
const FOLGA_APOS_ARRASTAR_MS = 600

/**
 * Anima (FLIP, ~200 ms) os itens de uma lista que subiram ou desceram porque a ordem de
 * exibição mudou (marcar prioridade ou andamento, parar, tirar, concluir). Cada filho direto a
 * animar leva `data-flip-id`. Não anima enquanto se arrasta nem logo depois, nem com
 * `prefers-reduced-motion`. `chave` identifica a ordem atual (ex.: os ids unidos).
 */
export function useAnimarReordenacao<T extends HTMLElement = HTMLUListElement>(
  chave: string,
  isArrastando = false,
) {
  const lista = useRef<T | null>(null)
  const posicoes = useRef(new Map<string, number>())
  const chaveAnterior = useRef(chave)
  const ultimoArrasto = useRef(Number.NEGATIVE_INFINITY)

  // Sem lista de dependências: mede a cada renderização para saber de onde cada item veio.
  useLayoutEffect(() => {
    const elemento = lista.current
    if (!elemento) return
    const filhos = Array.from(elemento.children).filter(
      (filho): filho is HTMLElement => filho instanceof HTMLElement && !!filho.dataset.flipId,
    )
    const novas = new Map(
      filhos.map((filho) => [filho.dataset.flipId!, filho.getBoundingClientRect().top]),
    )
    if (isArrastando) ultimoArrasto.current = performance.now()
    const mudou = chave !== chaveAnterior.current
    chaveAnterior.current = chave
    const isRecente = performance.now() - ultimoArrasto.current < FOLGA_APOS_ARRASTAR_MS
    const isMovimentoReduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (mudou && !isArrastando && !isRecente && !isMovimentoReduzido) {
      for (const filho of filhos) {
        const id = filho.dataset.flipId!
        const antes = posicoes.current.get(id)
        const depois = novas.get(id)
        if (antes === undefined || depois === undefined || Math.abs(antes - depois) < 1) continue
        if (typeof filho.animate !== 'function') continue
        filho.animate(
          [{ transform: `translateY(${antes - depois}px)` }, { transform: 'translateY(0)' }],
          { duration: DURACAO_MS, easing: 'ease-out' },
        )
      }
    }
    posicoes.current = novas
  })

  // Ref de callback: quem já tem outro ref (arrastar e soltar) chama os dois.
  return useCallback((elemento: T | null) => {
    lista.current = elemento
  }, [])
}
