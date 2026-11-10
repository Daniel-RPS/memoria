import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Liga uma barra de rolagem "espelho" (presa ao pé da janela) à caixa que rola os dias para o
 * lado: rolar uma move a outra. Devolve a ref da barra, a largura do conteúdo a imitar e se há
 * o que rolar (sem sobra, a barra não aparece).
 */
export function useRolagemEspelhada(caixa: RefObject<HTMLDivElement | null>) {
  const barra = useRef<HTMLDivElement>(null)
  const [larguraDoConteudo, setLarguraDoConteudo] = useState(0)
  const [isRolavel, setIsRolavel] = useState(false)

  useEffect(() => {
    const elementoCaixa = caixa.current
    const elementoBarra = barra.current
    if (!elementoCaixa || !elementoBarra) return

    const handleMedir = () => {
      setLarguraDoConteudo(elementoCaixa.scrollWidth)
      setIsRolavel(elementoCaixa.scrollWidth > elementoCaixa.clientWidth + 1)
      elementoBarra.scrollLeft = elementoCaixa.scrollLeft
    }
    const handleRolarCaixa = () => {
      if (elementoBarra.scrollLeft !== elementoCaixa.scrollLeft) {
        elementoBarra.scrollLeft = elementoCaixa.scrollLeft
      }
    }
    const handleRolarBarra = () => {
      if (elementoCaixa.scrollLeft !== elementoBarra.scrollLeft) {
        elementoCaixa.scrollLeft = elementoBarra.scrollLeft
      }
    }

    // Sem ResizeObserver (ex.: jsdom), mede só uma vez.
    const observador =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleMedir)
    observador?.observe(elementoCaixa)
    if (elementoCaixa.firstElementChild) observador?.observe(elementoCaixa.firstElementChild)
    handleMedir()
    elementoCaixa.addEventListener('scroll', handleRolarCaixa, { passive: true })
    elementoBarra.addEventListener('scroll', handleRolarBarra, { passive: true })
    return () => {
      observador?.disconnect()
      elementoCaixa.removeEventListener('scroll', handleRolarCaixa)
      elementoBarra.removeEventListener('scroll', handleRolarBarra)
    }
  }, [caixa])

  // A barra fica escondida enquanto não há o que rolar: ao aparecer, assume a posição da caixa.
  useEffect(() => {
    const elementoCaixa = caixa.current
    const elementoBarra = barra.current
    if (isRolavel && elementoCaixa && elementoBarra) {
      elementoBarra.scrollLeft = elementoCaixa.scrollLeft
    }
  }, [caixa, isRolavel, larguraDoConteudo])

  return { barra, larguraDoConteudo, isRolavel }
}
