import { useEffect, useRef } from 'react'
import { useAparencia } from '@/app/use-aparencia'
import { temaOposto } from '@/lib/aparencia'

const DURACAO_DA_TROCA_MS = 200

/**
 * Leva o tema para o <html> (`data-tema`, lido pelos tokens de src/index.css) e liga o
 * Ctrl+Shift+L, que alterna entre claro e escuro. Na troca, as cores deslizam por ~200 ms
 * (`data-trocando-tema`), exceto com movimento reduzido. Ao abrir, quem põe o tema é o script
 * do index.html: aqui só confirma, sem transição.
 */
export function useAplicarTema() {
  const { tema, handleEscolherTema } = useAparencia()
  const anterior = useRef(document.documentElement.dataset.tema)

  useEffect(() => {
    const raiz = document.documentElement
    if (anterior.current === tema) return
    anterior.current = tema
    const isMovimentoReduzido = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!isMovimentoReduzido) raiz.setAttribute('data-trocando-tema', '')
    raiz.dataset.tema = tema
    const espera = setTimeout(() => raiz.removeAttribute('data-trocando-tema'), DURACAO_DA_TROCA_MS)
    return () => clearTimeout(espera)
  }, [tema])

  useEffect(() => {
    function handleKeyDown(evento: KeyboardEvent) {
      const isAtalho =
        (evento.ctrlKey || evento.metaKey) &&
        evento.shiftKey &&
        !evento.altKey &&
        evento.key.toLowerCase() === 'l'
      if (!isAtalho) return
      evento.preventDefault()
      handleEscolherTema(temaOposto(tema))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tema, handleEscolherTema])
}
