import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listarSubtarefas } from '@/db/repositories/subtask-repository'
import { listarTarefasDoDia } from '@/db/repositories/task-repository'
import type { DataLocal } from '@/db/types'
import { agruparSubtarefas, separarDoDia } from '@/lib/tarefas'

/** Tarefas do dia e suas subtarefas, atualizadas sozinhas quando o banco muda. */
export function useTarefasDoDia(data: DataLocal) {
  const resultado = useLiveQuery(async () => {
    const tarefas = await listarTarefasDoDia(data)
    const subtarefas = await listarSubtarefas(tarefas.map((tarefa) => tarefa.id))
    return { tarefas, subtarefas }
  }, [data])

  return useMemo(
    () => ({
      ...separarDoDia(resultado?.tarefas ?? []),
      subtarefasPorTarefa: agruparSubtarefas(resultado?.subtarefas ?? []),
      isCarregando: resultado === undefined,
    }),
    [resultado],
  )
}
