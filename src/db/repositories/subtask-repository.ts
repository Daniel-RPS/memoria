import { db } from '@/db/database'
import type { Subtask } from '@/db/types'
import { agora, gravarNovaPosicao } from '@/db/repositories/ordenacao'

/** Subtarefas de várias tarefas de uma vez (uma consulta para o dia inteiro). */
export function listarSubtarefas(taskIds: string[]) {
  return db.subtasks.where('taskId').anyOf(taskIds).toArray()
}

export async function criarSubtarefa(dados: { taskId: string; titulo: string }): Promise<Subtask> {
  return db.transaction('rw', db.subtasks, async () => {
    const irmas = await db.subtasks.where('taskId').equals(dados.taskId).toArray()
    const maiorOrdem = Math.max(0, ...irmas.map((subtarefa) => subtarefa.ordem))
    const momento = agora()
    const subtarefa: Subtask = {
      id: crypto.randomUUID(),
      taskId: dados.taskId,
      titulo: dados.titulo.trim(),
      concluida: false,
      ordem: maiorOrdem + 1,
      criadoEm: momento,
      atualizadoEm: momento,
    }
    await db.subtasks.add(subtarefa)
    return subtarefa
  })
}

export async function renomearSubtarefa(id: string, titulo: string) {
  await db.subtasks.update(id, { titulo: titulo.trim(), atualizadoEm: agora() })
}

export async function definirConclusaoSubtarefa(id: string, concluida: boolean) {
  await db.subtasks.update(id, { concluida, atualizadoEm: agora() })
}

export async function excluirSubtarefa(id: string) {
  await db.subtasks.delete(id)
}

/** Grava a nova posição de `idMovido` entre as subtarefas da tarefa (`idsEmOrdem` já reordenado). */
export async function reordenarSubtarefa(idsEmOrdem: string[], idMovido: string) {
  await db.transaction('rw', db.subtasks, () =>
    gravarNovaPosicao(db.subtasks, idsEmOrdem, idMovido),
  )
}
