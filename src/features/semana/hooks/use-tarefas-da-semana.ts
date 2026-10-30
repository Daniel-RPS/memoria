import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listarSubtarefas } from '@/db/repositories/subtask-repository'
import { listarTarefasEntre } from '@/db/repositories/task-repository'
import type { DataLocal, Task } from '@/db/types'
import { diasDaSemana } from '@/lib/semana'
import { agruparSubtarefas, separarDoDia } from '@/lib/tarefas'

export interface DiaDaSemana {
  data: DataLocal
  pendentes: Task[]
  concluidas: Task[]
}

/** Os 7 dias da semana com suas tarefas e as subtarefas delas, atualizados sozinhos. */
export function useTarefasDaSemana(inicio: DataLocal) {
  const dias = useMemo(() => diasDaSemana(inicio), [inicio])
  const resultado = useLiveQuery(async () => {
    const tarefas = await listarTarefasEntre(dias[0], dias[dias.length - 1])
    const subtarefas = await listarSubtarefas(tarefas.map((tarefa) => tarefa.id))
    return { tarefas, subtarefas }
  }, [dias])

  return useMemo(() => {
    const tarefas = resultado?.tarefas ?? []
    const semana: DiaDaSemana[] = dias.map((data) => ({
      data,
      ...separarDoDia(tarefas.filter((tarefa) => tarefa.data === data)),
    }))
    return {
      semana,
      subtarefasPorTarefa: agruparSubtarefas(resultado?.subtarefas ?? []),
      isCarregando: resultado === undefined,
    }
  }, [dias, resultado])
}
