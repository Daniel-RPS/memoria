import { db } from '@/db/database'
import type { DataLocal, Procedure, Task } from '@/db/types'
import { agora, gravarNovaPosicao } from '@/db/repositories/ordenacao'
import { somarDias } from '@/lib/datas'
import { destinoDoAdiamento, pendenciasDeOntem, planejarMovimento } from '@/lib/mover'

/** Tarefas visíveis no dia (pendentes e concluídas; arquivadas ficam fora). */
export function listarTarefasDoDia(data: DataLocal) {
  return db.tasks
    .where('data')
    .equals(data)
    .filter((tarefa) => tarefa.status !== 'arquivada')
    .toArray()
}

/** Tarefas visíveis de `inicio` a `fim` (inclusive), para a visão de semana. */
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
  procedureId?: string
}

export async function criarTarefa(dados: NovaTarefa): Promise<Task> {
  return db.transaction('rw', db.tasks, async () => {
    const doDia = await db.tasks.where('data').equals(dados.data).toArray()
    const maiorOrdem = Math.max(0, ...doDia.map((tarefa) => tarefa.ordem))
    const momento = agora()
    const tarefa: Task = {
      id: crypto.randomUUID(),
      titulo: dados.titulo.trim(),
      data: dados.data,
      dataOriginal: dados.data,
      categoryId: dados.categoryId,
      subcategoryId: dados.categoryId ? dados.subcategoryId : undefined,
      procedureId: dados.procedureId,
      ordem: maiorOrdem + 1,
      status: 'pendente',
      criadoEm: momento,
      atualizadoEm: momento,
    }
    await db.tasks.add(tarefa)
    return tarefa
  })
}

/** Cria no dia uma tarefa ligada ao procedimento (título e categoria vêm dele). */
export function agendarProcedimento(
  procedimento: Pick<Procedure, 'id' | 'titulo' | 'categoryId'>,
  data: DataLocal,
) {
  return criarTarefa({
    titulo: procedimento.titulo,
    data,
    categoryId: procedimento.categoryId,
    procedureId: procedimento.id,
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

async function maiorOrdemDoDia(data: DataLocal, ignorar: Set<string>) {
  const doDia = await db.tasks.where('data').equals(data).toArray()
  return Math.max(0, ...doDia.filter((tarefa) => !ignorar.has(tarefa.id)).map((t) => t.ordem))
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
 * Move tarefas para outro dia: só troca `data` (e `ordem`, entrando no fim do dia).
 * NUNCA copia, apaga ou altera `dataOriginal`.
 */
export async function moverTarefas(ids: string[], destino: DataLocal): Promise<ResultadoMovimento> {
  return db.transaction('rw', db.tasks, async () => {
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
  return db.transaction('rw', db.tasks, async () => {
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

/** Pendentes de ontem (para o aviso "Trazer pendências de ontem"). */
export async function listarPendenciasDeOntem(hoje: DataLocal) {
  const deOntem = await db.tasks.where('data').equals(somarDias(hoje, -1)).toArray()
  return pendenciasDeOntem(deOntem, hoje)
}

/** Traz para o fim de hoje as pendentes de ontem. */
export async function trazerPendenciasDeOntem(hoje: DataLocal): Promise<ResultadoMovimento> {
  return db.transaction('rw', db.tasks, async () => {
    const pendentes = await listarPendenciasDeOntem(hoje)
    return moverTarefas(
      pendentes.map((tarefa) => tarefa.id),
      hoje,
    )
  })
}

/**
 * Solta uma tarefa arrastada em `destino`, na posição em que ela aparece em `idsEmOrdemNoDestino`
 * (lista do dia de destino já com a tarefa no lugar). Só troca `data` e `ordem`.
 */
export async function soltarTarefaNoDia(
  id: string,
  destino: DataLocal,
  idsEmOrdemNoDestino: string[],
) {
  await db.transaction('rw', db.tasks, async () => {
    await db.tasks.update(id, { data: destino, atualizadoEm: agora() })
    await gravarNovaPosicao(db.tasks, idsEmOrdemNoDestino, id)
  })
}
