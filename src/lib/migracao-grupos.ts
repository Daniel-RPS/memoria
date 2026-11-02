import type { DataLocal, GroupCard, GroupItem, GroupItemStatus, Task, TaskStatus } from '@/db/types'

/** Card do modelo anterior (banco v3, backup formato 2): mesmo formato do `GroupCard`. */
export interface CardAntigo {
  id: string
  seriesId: string
  data: DataLocal
  ordem: number
  arquivado: boolean
  criadoEm: string
  atualizadoEm: string
}

/** No modelo anterior, item de grupo era tarefa com `groupInstanceId`. */
export type TarefaAntiga = Task & { groupInstanceId?: string }

const STATUS_DO_ITEM: Record<TaskStatus, GroupItemStatus> = {
  pendente: 'pendente',
  concluida: 'concluido',
  arquivada: 'arquivado',
}

/**
 * Converte grupos do modelo anterior: cada tarefa com card vira `GroupItem` (mesmo id);
 * as demais continuam tarefas soltas, sem `groupInstanceId`.
 */
export function converterGruposAntigos(instancias: CardAntigo[], tarefas: TarefaAntiga[]) {
  const idsCards = new Set(instancias.map((instancia) => instancia.id))
  const cards: GroupCard[] = instancias.map((instancia) => ({ ...instancia }))
  const itens: GroupItem[] = []
  const soltas: Task[] = []
  for (const { groupInstanceId, ...tarefa } of tarefas) {
    if (!groupInstanceId || !idsCards.has(groupInstanceId)) {
      soltas.push(tarefa)
      continue
    }
    itens.push({
      id: tarefa.id,
      cadeiaId: tarefa.id,
      cardId: groupInstanceId,
      titulo: tarefa.titulo,
      ordem: tarefa.ordem,
      status: STATUS_DO_ITEM[tarefa.status],
      ...(tarefa.concluidaEm && { concluidoEm: tarefa.concluidaEm }),
      dataOriginal: tarefa.dataOriginal,
      criadoEm: tarefa.criadoEm,
      atualizadoEm: tarefa.atualizadoEm,
    })
  }
  return { cards, itens, soltas }
}
