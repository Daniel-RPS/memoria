import { useEffect } from 'react'
import { aplicarTemaNoHtml } from '@/app/trocar-tema'
import { useAparencia } from '@/app/use-aparencia'
import { temaOposto, type Tema } from '@/lib/aparencia'

/**
 * Mantém o `<html>` no tema que vale quando ele muda por fora do seletor (outra aba, sistema
 * operacional em "Sistema") e liga o Ctrl+Shift+L, que alterna entre claro e escuro. Ao abrir,
 * quem põe o tema é o script do index.html: aqui só confirma. Use num componente pequeno (ver
 * `AplicadorDoTema`): quem chama re-renderiza a cada troca.
 */
export function useAplicarTema() {
  const { tema, handleEscolherTema } = useAparencia()

  useEffect(() => {
    aplicarTemaNoHtml(tema)
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
      // O <html> já tem o tema da última troca, mesmo antes de ela ser gravada.
      const atual: Tema = document.documentElement.dataset.tema === 'escuro' ? 'escuro' : 'claro'
      handleEscolherTema(temaOposto(atual))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleEscolherTema])
}
