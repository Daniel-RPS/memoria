import { useLiveQuery } from 'dexie-react-hooks'
import { listarTarefasEntre } from '@/db/repositories/task-repository'
import type { DataLocal, Task } from '@/db/types'

const NENHUMA: Task[] = []

/** Tarefas visíveis (sem arquivadas) de `inicio` a `fim`, atualizadas sozinhas. */
export function useTarefasDoPeriodo(inicio: DataLocal, fim: DataLocal) {
  const tarefas = useLiveQuery(() => listarTarefasEntre(inicio, fim), [inicio, fim])
  return { tarefas: tarefas ?? NENHUMA, isCarregando: tarefas === undefined }
}
