import { db } from '@/db/database'
import type { DataLocal, Task } from '@/db/types'
import { agora, gravarNovaPosicao } from '@/db/repositories/ordenacao'

/** Tarefas visíveis no dia (pendentes e concluídas; arquivadas ficam fora). */
export function listarTarefasDoDia(data: DataLocal) {
  return db.tasks
    .where('data')
    .equals(data)
    .filter((tarefa) => tarefa.status !== 'arquivada')
    .toArray()
}

export async function criarTarefa(dados: { titulo: string; data: DataLocal }): Promise<Task> {
  return db.transaction('rw', db.tasks, async () => {
    const doDia = await db.tasks.where('data').equals(dados.data).toArray()
    const maiorOrdem = Math.max(0, ...doDia.map((tarefa) => tarefa.ordem))
    const momento = agora()
    const tarefa: Task = {
      id: crypto.randomUUID(),
      titulo: dados.titulo.trim(),
      data: dados.data,
      dataOriginal: dados.data,
      ordem: maiorOrdem + 1,
      status: 'pendente',
      criadoEm: momento,
      atualizadoEm: momento,
    }
    await db.tasks.add(tarefa)
    return tarefa
  })
}

export async function renomearTarefa(id: string, titulo: string) {
  await db.tasks.update(id, { titulo: titulo.trim(), atualizadoEm: agora() })
}

export async function definirConclusao(id: string, concluida: boolean) {
  const momento = agora()
  await db.tasks.update(
    id,
    concluida
      ? { status: 'concluida', concluidaEm: momento, atualizadoEm: momento }
      : { status: 'pendente', concluidaEm: undefined, atualizadoEm: momento },
  )
}

/** Tira do calendário sem concluir. */
export async function arquivarTarefa(id: string) {
  await db.tasks.update(id, { status: 'arquivada', atualizadoEm: agora() })
}

/** Exclusão definitiva, junto com as subtarefas. */
export async function excluirTarefa(id: string) {
  await db.transaction('rw', db.tasks, db.subtasks, async () => {
    await db.subtasks.where('taskId').equals(id).delete()
    await db.tasks.delete(id)
  })
}

/** Grava a nova posição de `idMovido` entre as pendentes do dia (`idsEmOrdem` já reordenado). */
export async function reordenarTarefa(idsEmOrdem: string[], idMovido: string) {
  await db.transaction('rw', db.tasks, () => gravarNovaPosicao(db.tasks, idsEmOrdem, idMovido))
}
