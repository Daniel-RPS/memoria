import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listarTarefasDoDia } from '@/db/repositories/task-repository'
import type { DataLocal } from '@/db/types'
import { separarDoDia } from '@/lib/tarefas'

/** Pendentes e concluídas do dia, atualizadas sozinhas quando o banco muda. */
export function useTarefasDoDia(data: DataLocal) {
  const tarefas = useLiveQuery(() => listarTarefasDoDia(data), [data])
  const separadas = useMemo(() => separarDoDia(tarefas ?? []), [tarefas])
  return { ...separadas, isCarregando: tarefas === undefined }
}
