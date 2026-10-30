import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { contarAnexos } from '@/db/repositories/attachment-repository'
import { donosComNota } from '@/db/repositories/note-repository'
import { listarSubtarefas } from '@/db/repositories/subtask-repository'
import { listarTarefasDoDia } from '@/db/repositories/task-repository'
import type { DataLocal } from '@/db/types'
import { filtrarPorCategoria, type FiltroCategoria } from '@/lib/categorias'
import { agruparSubtarefas, separarDoDia } from '@/lib/tarefas'
import type { ExtrasDaFolha } from '@/features/dia/hooks/contexto-extras'

const SEM_EXTRAS: ExtrasDaFolha = { anexosPorTarefa: new Map(), tarefasComNota: new Set() }

/** Tarefas do dia (com o filtro de categoria), subtarefas, anexos e anotações, atualizados sozinhos. */
export function useTarefasDoDia(data: DataLocal, filtro: FiltroCategoria = {}) {
  const resultado = useLiveQuery(async () => {
    const tarefas = await listarTarefasDoDia(data)
    const ids = tarefas.map((tarefa) => tarefa.id)
    const [subtarefas, anexosPorTarefa, tarefasComNota] = await Promise.all([
      listarSubtarefas(ids),
      contarAnexos('task', ids),
      donosComNota('task', ids),
    ])
    return { tarefas, subtarefas, extras: { anexosPorTarefa, tarefasComNota } }
  }, [data])
  const { categoriaId, subcategoriaId } = filtro

  return useMemo(() => {
    const visiveis = filtrarPorCategoria(resultado?.tarefas ?? [], {
      categoriaId,
      subcategoriaId,
    })
    return {
      ...separarDoDia(visiveis),
      subtarefasPorTarefa: agruparSubtarefas(resultado?.subtarefas ?? []),
      extras: resultado?.extras ?? SEM_EXTRAS,
      isCarregando: resultado === undefined,
    }
  }, [resultado, categoriaId, subcategoriaId])
}
