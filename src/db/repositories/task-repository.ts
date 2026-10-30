import { db } from '@/db/database'
import type { DataLocal, Task } from '@/db/types'
import { ordemEntre } from '@/lib/tarefas'

function agora() {
  return new Date().toISOString()
}

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

/**
 * Grava a nova posição de `idMovido` dentro de `idsEmOrdem` (pendentes do dia, já reordenadas).
 * Só a tarefa movida é alterada; se não houver espaço entre os vizinhos, renumera o dia.
 */
export async function reordenarTarefa(idsEmOrdem: string[], idMovido: string) {
  await db.transaction('rw', db.tasks, async () => {
    const tarefas = await db.tasks.bulkGet(idsEmOrdem)
    const ordemPorId = new Map(tarefas.map((tarefa) => [tarefa?.id, tarefa?.ordem]))
    const posicao = idsEmOrdem.indexOf(idMovido)
    const anterior = ordemPorId.get(idsEmOrdem[posicao - 1])
    const posterior = ordemPorId.get(idsEmOrdem[posicao + 1])
    const momento = agora()

    const novaOrdem = ordemEntre(anterior, posterior)
    if (novaOrdem !== null) {
      await db.tasks.update(idMovido, { ordem: novaOrdem, atualizadoEm: momento })
      return
    }

    await Promise.all(
      idsEmOrdem.map((id, indice) =>
        db.tasks.update(id, { ordem: indice + 1, atualizadoEm: momento }),
      ),
    )
  })
}
