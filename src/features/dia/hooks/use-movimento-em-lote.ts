import { useEffect } from 'react'
import {
  moverLote,
  reordenarSubetapasEmLote,
  type DestinoDoLote,
  type ResultadoLote,
} from '@/db/repositories/lote-repository'
import type { Bloco } from '@/domain/ordem-de-exibicao'
import { manterBlocos } from '@/domain/ordem-de-exibicao'
import { deslocar } from '@/domain/selecao-em-lote'
import type { Subtask } from '@/db/types'
import type { Selecao } from '@/features/dia/hooks/use-selecao'
import { avisarComDesfazer } from '@/hooks/use-mover-tarefas'
import { isCampoDeTexto } from '@/lib/teclado'

/** Uma lista em que as linhas selecionadas podem subir e descer: o destino e os ids em ordem. */
export interface ListaMovel {
  destino: DestinoDoLote
  ids: string[]
}

function textoDoLote(quantidade: number, singular: string, plural: string) {
  return quantidade === 1 ? `1 ${singular} movida` : `${quantidade} ${plural} movidas`
}

/** Um aviso só, com um "Desfazer" só, para o movimento em lote (também Ctrl+Z). */
export function avisarLote(resultados: ResultadoLote[], singular = 'tarefa', plural = 'tarefas') {
  const quantidade = resultados.reduce((total, resultado) => total + resultado.quantidade, 0)
  if (quantidade === 0) return
  avisarComDesfazer(textoDoLote(quantidade, singular, plural), async () => {
    // Desfaz na ordem contrária à que foi feita.
    for (const resultado of [...resultados].reverse()) await resultado.desfazer()
  })
}

interface Opcoes {
  selecao: Selecao
  /** As listas em que as linhas se reordenam (soltas do dia e cada card; ou cada dia da Semana). */
  listas: ListaMovel[]
  blocoDoId: (id: string) => Bloco | undefined
  /** Subetapas por dono, para Alt+↑/↓ nas subetapas selecionadas. */
  subetapasPorDono: Map<string, Subtask[]>
}

/**
 * Alt+↑ e Alt+↓ sobem e descem as linhas selecionadas uma posição, cada uma na sua lista
 * (e as subetapas selecionadas dentro da tarefa/item delas), em UMA operação com aviso e
 * "Desfazer". Não atravessa os blocos de prioridade e andamento.
 */
export function useAtalhoDeMovimento({ selecao, listas, blocoDoId, subetapasPorDono }: Opcoes) {
  const { selecionados, tipo, donoDasSubetapas } = selecao

  useEffect(() => {
    if (selecionados.size === 0) return
    async function mover(direcao: -1 | 1) {
      if (tipo === 'subetapas') {
        const lista = (subetapasPorDono.get(donoDasSubetapas ?? '') ?? []).map((s) => s.id)
        const final = deslocar(lista, selecionados, direcao)
        if (final.join() === lista.join()) return
        const movidos = lista.filter((id) => selecionados.has(id))
        avisarLote([await reordenarSubetapasEmLote(final, movidos)], 'subetapa', 'subetapas')
        return
      }
      const resultados: ResultadoLote[] = []
      for (const lista of listas) {
        const movidos = lista.ids.filter((id) => selecionados.has(id))
        if (movidos.length === 0) continue
        const final = manterBlocos(deslocar(lista.ids, selecionados, direcao), blocoDoId)
        if (final.join() === lista.ids.join()) continue
        resultados.push(
          await moverLote({ movidos, destino: lista.destino, idsEmOrdemNoDestino: final }),
        )
      }
      avisarLote(resultados)
    }

    function handleKeyDown(evento: KeyboardEvent) {
      const isSetaDeAlt =
        evento.altKey &&
        !evento.ctrlKey &&
        !evento.metaKey &&
        !evento.shiftKey &&
        (evento.key === 'ArrowUp' || evento.key === 'ArrowDown')
      if (!isSetaDeAlt || isCampoDeTexto(evento.target)) return
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return
      evento.preventDefault()
      void mover(evento.key === 'ArrowUp' ? -1 : 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selecionados, tipo, donoDasSubetapas, listas, blocoDoId, subetapasPorDono])
}
