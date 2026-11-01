import { db } from '@/db/database'
import type { DataLocal, Task } from '@/db/types'
import { excluirAnexosDe } from '@/db/repositories/attachment-repository'
import { excluirNotasDe } from '@/db/repositories/note-repository'
import { agora, gravarNovaPosicao } from '@/db/repositories/ordenacao'
import { somarDias } from '@/lib/datas'
import { destinoDoAdiamento, pendenciasDeOntem, planejarMovimento } from '@/lib/mover'

/** Tarefas soltas visíveis no dia (pendentes e concluídas; arquivadas ficam fora). */
export function listarTarefasDoDia(data: DataLocal) {
  return db.tasks
    .where('data')
    .equals(data)
    .filter((tarefa) => tarefa.status !== 'arquivada')
    .toArray()
}

/** Tarefas soltas visíveis de `inicio` a `fim` (inclusive). */
export function listarTarefasEntre(inicio: DataLocal, fim: DataLocal) {
  return db.tasks
    .where('data')
    .between(inicio, fim, true, true)
    .filter((tarefa) => tarefa.status !== 'arquivada')
    .toArray()
}

export interface NovaTarefa {
  titulo: string
  data: DataLocal
  categoryId?: string
  subcategoryId?: string
}

export async function criarTarefa(dados: NovaTarefa): Promise<Task> {
  return db.transaction('rw', db.tasks, db.groupCards, async () => {
    const maiorOrdem = await maiorOrdemDoDia(dados.data)
    const momento = agora()
    const tarefa: Task = {
      id: crypto.randomUUID(),
      titulo: dados.titulo.trim(),
      data: dados.data,
      dataOriginal: dados.data,
      categoryId: dados.categoryId,
      subcategoryId: dados.categoryId ? dados.subcategoryId : undefined,
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

/** Define a categoria (e opcionalmente a subcategoria); sem `categoryId`, tira a categoria. */
export async function definirCategoria(
  id: string,
  categoria: { categoryId?: string; subcategoryId?: string },
) {
  await db.tasks.update(id, {
    categoryId: categoria.categoryId,
    subcategoryId: categoria.categoryId ? categoria.subcategoryId : undefined,
    atualizadoEm: agora(),
  })
}

/** Tira do calendário sem concluir. */
export async function arquivarTarefa(id: string) {
  await db.tasks.update(id, { status: 'arquivada', atualizadoEm: agora() })
}

/** Exclusão definitiva, junto com subtarefas, anotação e anexos. */
export async function excluirTarefa(id: string) {
  await db.transaction('rw', [db.tasks, db.subtasks, db.notes, db.attachments], async () => {
    const dono = [{ tipo: 'task' as const, id }]
    await excluirAnexosDe(dono)
    await excluirNotasDe(dono)
    await db.subtasks.where('taskId').equals(id).delete()
    await db.tasks.delete(id)
  })
}

/** Tarefas soltas e cards de grupo vistos como uma tabela só: os dois dividem a `ordem` do dia. */
export const tabelaDoDia = {
  async bulkGet(ids: string[]) {
    const [tarefas, cards] = await Promise.all([db.tasks.bulkGet(ids), db.groupCards.bulkGet(ids)])
    return ids.map((_, indice) => tarefas[indice] ?? cards[indice])
  },
  async update(id: string, mudancas: { ordem: number; atualizadoEm: string }) {
    return (await db.tasks.update(id, mudancas)) || db.groupCards.update(id, mudancas)
  },
}

/** Grava a nova posição de `idMovido` entre as tarefas soltas e cards do dia (`idsEmOrdem` já reordenado). */
export async function reordenarTarefa(idsEmOrdem: string[], idMovido: string) {
  await db.transaction('rw', db.tasks, db.groupCards, () =>
    gravarNovaPosicao(tabelaDoDia, idsEmOrdem, idMovido),
  )
}

/** Maior `ordem` do dia entre tarefas soltas e cards. */
export async function maiorOrdemDoDia(data: DataLocal, ignorar = new Set<string>()) {
  const [tarefas, cards] = await Promise.all([
    db.tasks.where('data').equals(data).toArray(),
    db.groupCards.where('data').equals(data).toArray(),
  ])
  const ordens = [...tarefas, ...cards]
    .filter((entrada) => !ignorar.has(entrada.id))
    .map((entrada) => entrada.ordem)
  return Math.max(0, ...ordens)
}

/** Onde a tarefa estava antes de mover; permite "Desfazer". */
export interface PosicaoAnterior {
  id: string
  data: DataLocal
  ordem: number
}

export interface ResultadoMovimento {
  quantidade: number
  anteriores: PosicaoAnterior[]
}

/**
 * Move tarefas soltas para outro dia: só troca `data` (e `ordem`, entrando no fim do dia).
 * NUNCA copia, apaga ou altera `dataOriginal`. (Cards de grupo são copiados, não movidos:
 * ver `copiarItens` em `group-repository`.)
 */
export async function moverTarefas(ids: string[], destino: DataLocal): Promise<ResultadoMovimento> {
  return db.transaction('rw', db.tasks, db.groupCards, async () => {
    const tarefas = (await db.tasks.bulkGet(ids)).filter((tarefa) => tarefa !== undefined)
    const maiorOrdem = await maiorOrdemDoDia(destino, new Set(ids))
    const movimentos = planejarMovimento(tarefas, destino, maiorOrdem)
    const porId = new Map(tarefas.map((tarefa) => [tarefa.id, tarefa]))
    const momento = agora()
    await Promise.all(
      movimentos.map(({ id, data, ordem }) =>
        db.tasks.update(id, { data, ordem, atualizadoEm: momento }),
      ),
    )
    return {
      quantidade: movimentos.length,
      anteriores: movimentos.map(({ id }) => {
        const { data, ordem } = porId.get(id)!
        return { id, data, ordem }
      }),
    }
  })
}

/** Adia pendentes um dia (ver `destinoDoAdiamento`). */
export async function adiarTarefas(ids: string[], hoje: DataLocal): Promise<ResultadoMovimento> {
  return db.transaction('rw', db.tasks, db.groupCards, async () => {
    const pendentes = (await db.tasks.bulkGet(ids)).filter(
      (tarefa) => tarefa?.status === 'pendente',
    )
    const porDestino = new Map<DataLocal, string[]>()
    for (const tarefa of pendentes) {
      const destino = destinoDoAdiamento(tarefa!.data, hoje)
      porDestino.set(destino, [...(porDestino.get(destino) ?? []), tarefa!.id])
    }
    const resultado: ResultadoMovimento = { quantidade: 0, anteriores: [] }
    for (const [destino, idsDoDestino] of porDestino) {
      const parcial = await moverTarefas(idsDoDestino, destino)
      resultado.quantidade += parcial.quantidade
      resultado.anteriores.push(...parcial.anteriores)
    }
    return resultado
  })
}

/** Desfaz um movimento, devolvendo cada tarefa ao dia e à posição em que estava. */
export async function restaurarPosicoes(anteriores: PosicaoAnterior[]) {
  const momento = agora()
  await db.transaction('rw', db.tasks, () =>
    Promise.all(
      anteriores.map(({ id, data, ordem }) =>
        db.tasks.update(id, { data, ordem, atualizadoEm: momento }),
      ),
    ),
  )
}

/** Tarefas soltas pendentes de ontem. */
export async function listarPendenciasDeOntem(hoje: DataLocal) {
  const deOntem = await db.tasks.where('data').equals(somarDias(hoje, -1)).toArray()
  return pendenciasDeOntem(deOntem, hoje)
}

/** Traz para o fim de hoje as tarefas soltas pendentes de ontem. */
export async function trazerPendenciasDeOntem(hoje: DataLocal): Promise<ResultadoMovimento> {
  return db.transaction('rw', db.tasks, db.groupCards, async () => {
    const pendentes = await listarPendenciasDeOntem(hoje)
    return moverTarefas(
      pendentes.map((tarefa) => tarefa.id),
      hoje,
    )
  })
}

/**
 * Solta uma tarefa arrastada em `destino`, na posição em que ela aparece em
 * `idsEmOrdemNoDestino` (tarefas e cards do dia de destino, já com ela no lugar).
 * Só troca `data` e `ordem`.
 */
export async function soltarTarefaNoDia(
  id: string,
  destino: DataLocal,
  idsEmOrdemNoDestino: string[],
) {
  await db.transaction('rw', db.tasks, db.groupCards, async () => {
    await db.tasks.update(id, { data: destino, atualizadoEm: agora() })
    await gravarNovaPosicao(tabelaDoDia, idsEmOrdemNoDestino, id)
  })
}
