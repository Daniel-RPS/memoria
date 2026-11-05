import type { DataLocal, Subtask, Task } from '@/db/types'
import { diasEntre } from '@/lib/datas'

/**
 * Há quantos dias a tarefa está pendente, contando a partir de `dataOriginal`.
 * `null` quando não está pendente ou foi criada hoje (ou depois).
 */
export function diasPendente(tarefa: Pick<Task, 'status' | 'dataOriginal'>, hoje: DataLocal) {
  if (tarefa.status !== 'pendente') return null
  const dias = diasEntre(tarefa.dataOriginal, hoje)
  return dias > 0 ? dias : null
}

export function textoDiasPendente(dias: number) {
  return dias === 1 ? 'pendente há 1 dia' : `pendente há ${dias} dias`
}

/**
 * Ordem para uma tarefa colocada entre dois vizinhos.
 * `null` quando não há mais espaço entre eles (é preciso renumerar o dia).
 */
export function ordemEntre(anterior?: number, posterior?: number): number | null {
  if (anterior === undefined && posterior === undefined) return 1
  if (anterior === undefined) return posterior! - 1
  if (posterior === undefined) return anterior + 1
  const meio = (anterior + posterior) / 2
  return meio > anterior && meio < posterior ? meio : null
}

const porOrdem = (a: Task, b: Task) => a.ordem - b.ordem

/** Separa as tarefas visíveis do dia: pendentes por ordem, concluídas por ordem de conclusão. */
export function separarDoDia(tarefas: Task[]) {
  const pendentes = tarefas.filter((tarefa) => tarefa.status === 'pendente').sort(porOrdem)
  const concluidas = tarefas
    .filter((tarefa) => tarefa.status === 'concluida')
    .sort((a, b) => (a.concluidaEm ?? '').localeCompare(b.concluidaEm ?? ''))
  return { pendentes, concluidas }
}

export interface Progresso {
  concluidas: number
  total: number
}

/** Quantas subtarefas estão concluídas; `null` quando a tarefa não tem subtarefas. */
export function progressoSubtarefas(subtarefas: Pick<Subtask, 'concluida'>[]): Progresso | null {
  if (subtarefas.length === 0) return null
  return {
    concluidas: subtarefas.filter((subtarefa) => subtarefa.concluida).length,
    total: subtarefas.length,
  }
}

export function textoProgresso({ concluidas, total }: Progresso) {
  return `${concluidas}/${total}`
}

/** Agrupa subtarefas por tarefa, cada grupo em ordem. */
export function agruparSubtarefas(subtarefas: Subtask[]) {
  const porTarefa = new Map<string, Subtask[]>()
  for (const subtarefa of [...subtarefas].sort((a, b) => a.ordem - b.ordem)) {
    const grupo = porTarefa.get(subtarefa.taskId) ?? []
    grupo.push(subtarefa)
    porTarefa.set(subtarefa.taskId, grupo)
  }
  return porTarefa
}
