import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { contarAnexos } from '@/db/repositories/attachment-repository'
import { listarGruposEntre } from '@/db/repositories/group-repository'
import { donosComNota } from '@/db/repositories/note-repository'
import { listarSubtarefas } from '@/db/repositories/subtask-repository'
import { listarTarefasDoDia } from '@/db/repositories/task-repository'
import type { DataLocal } from '@/db/types'
import { filtrarPorCategoria, type FiltroCategoria } from '@/lib/categorias'
import { intercalarNoDia, isGrupoConcluido, montarGrupos } from '@/lib/grupos'
import { agruparSubtarefas, separarDoDia } from '@/lib/tarefas'
import type { ExtrasDaFolha } from '@/features/dia/hooks/contexto-extras'

const SEM_EXTRAS: ExtrasDaFolha = {
  anexosPorTarefa: new Map(),
  tarefasComNota: new Set(),
  gruposDoDia: [],
}

/**
 * Tarefas soltas e cards de grupo do dia (com o filtro de categoria), subtarefas, anexos e
 * anotações, atualizados sozinhos. Cards concluídos vão para junto das concluídas.
 */
export function useTarefasDoDia(data: DataLocal, filtro: FiltroCategoria = {}) {
  const resultado = useLiveQuery(async () => {
    const [tarefas, grupos] = await Promise.all([
      listarTarefasDoDia(data),
      listarGruposEntre(data, data),
    ])
    const ids = tarefas.map((tarefa) => tarefa.id)
    const [subtarefas, anexosPorTarefa, tarefasComNota] = await Promise.all([
      listarSubtarefas(ids),
      contarAnexos('task', ids),
      donosComNota('task', ids),
    ])
    return { tarefas, grupos, subtarefas, anexosPorTarefa, tarefasComNota }
  }, [data])
  const { categoriaId, subcategoriaId } = filtro

  return useMemo(() => {
    const tarefas = resultado?.tarefas ?? []
    const filtroAtivo = { categoriaId, subcategoriaId }
    const soltas = filtrarPorCategoria(
      tarefas.filter((tarefa) => !tarefa.groupInstanceId),
      filtroAtivo,
    )
    const todosOsGrupos = montarGrupos(
      resultado?.grupos.instancias ?? [],
      resultado?.grupos.series ?? [],
      tarefas,
    )
    // O card segue a categoria da série (os itens têm a mesma).
    const grupos = todosOsGrupos.filter(
      (grupo) => filtrarPorCategoria([grupo.serie], filtroAtivo).length > 0,
    )
    const { pendentes, concluidas } = separarDoDia(soltas)
    const gruposPendentes = grupos.filter((grupo) => !isGrupoConcluido(grupo))
    return {
      /** Tarefas soltas pendentes e cards não concluídos, na ordem do dia. */
      entradas: intercalarNoDia(pendentes, gruposPendentes),
      concluidas,
      gruposConcluidos: grupos.filter(isGrupoConcluido),
      subtarefasPorTarefa: agruparSubtarefas(resultado?.subtarefas ?? []),
      extras: resultado
        ? {
            anexosPorTarefa: resultado.anexosPorTarefa,
            tarefasComNota: resultado.tarefasComNota,
            gruposDoDia: todosOsGrupos
              .filter((grupo) => !isGrupoConcluido(grupo))
              .map((grupo) => ({ id: grupo.instancia.id, titulo: grupo.serie.titulo })),
          }
        : SEM_EXTRAS,
      isCarregando: resultado === undefined,
    }
  }, [resultado, categoriaId, subcategoriaId])
}
