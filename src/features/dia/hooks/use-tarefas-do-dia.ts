import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listarSubtarefas } from '@/db/repositories/subtask-repository'
import { listarTarefasDoDia } from '@/db/repositories/task-repository'
import type { DataLocal } from '@/db/types'
import { filtrarPorCategoria, type FiltroCategoria } from '@/lib/categorias'
import { agruparSubtarefas, separarDoDia } from '@/lib/tarefas'

/** Tarefas do dia (com o filtro de categoria) e suas subtarefas, atualizadas sozinhas. */
export function useTarefasDoDia(data: DataLocal, filtro: FiltroCategoria = {}) {
  const resultado = useLiveQuery(async () => {
    const tarefas = await listarTarefasDoDia(data)
    const subtarefas = await listarSubtarefas(tarefas.map((tarefa) => tarefa.id))
    return { tarefas, subtarefas }
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
      isCarregando: resultado === undefined,
    }
  }, [resultado, categoriaId, subcategoriaId])
}
