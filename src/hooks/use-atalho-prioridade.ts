import { useEffect } from 'react'
import type { AlvosDePrioridade } from '@/db/repositories/prioridade-repository'
import { usePrioridade } from '@/hooks/use-prioridade'
import { isCampoDeTexto } from '@/lib/teclado'

/** Marca de uma linha como alvo da tecla P: `tarefa:<id>` ou `item:<id>` (só pendentes). */
export const ATRIBUTO_ALVO_PRIORIDADE = 'data-alvo-prioridade'

/** Atributos de uma tarefa solta ou de um item de grupo como alvo da tecla P (só pendentes). */
export function alvoDePrioridade(tipo: 'tarefa' | 'item', id: string, isPendente: boolean) {
  return { [ATRIBUTO_ALVO_PRIORIDADE]: isPendente ? `${tipo}:${id}` : undefined }
}

function alvosDaLinha(alvo: EventTarget | null): AlvosDePrioridade | null {
  const linha = alvo instanceof Element ? alvo.closest(`[${ATRIBUTO_ALVO_PRIORIDADE}]`) : null
  const valor = linha?.getAttribute(ATRIBUTO_ALVO_PRIORIDADE)
  if (!valor) return null
  const [tipo, ...resto] = valor.split(':')
  const id = resto.join(':')
  return tipo === 'tarefa' ? { tarefas: [id] } : { itens: [id] }
}

/**
 * Tecla P: alterna a prioridade da linha em que está o foco (caixa, título, menu…) ou, sem foco
 * numa linha, a das tarefas e itens selecionados. Fora de campo de texto e sem menu ou diálogo
 * aberto; com Ctrl, ⌘, Alt ou Shift a tecla é de outro atalho.
 */
export function useAtalhoPrioridade(selecionados?: AlvosDePrioridade) {
  const { alternarPrioridade } = usePrioridade()
  const tarefas = selecionados?.tarefas
  const itens = selecionados?.itens

  useEffect(() => {
    function handleKeyDown(evento: KeyboardEvent) {
      if (evento.key.toLowerCase() !== 'p') return
      if (evento.ctrlKey || evento.metaKey || evento.altKey || evento.shiftKey) return
      if (isCampoDeTexto(evento.target)) return
      if (document.querySelector('[role="dialog"], [role="menu"]') !== null) return
      // Com algo selecionado, a seleção vale (o foco fica na última caixa clicada).
      const alvos =
        (tarefas?.length ?? 0) + (itens?.length ?? 0) > 0
          ? { tarefas, itens }
          : alvosDaLinha(evento.target)
      if (!alvos) return
      evento.preventDefault()
      void alternarPrioridade(alvos)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [alternarPrioridade, tarefas, itens])
}
