import { db } from '@/db/database'
import type { DataLocal, GroupInstance, Procedure, Task } from '@/db/types'
import { excluirAnexosDe } from '@/db/repositories/attachment-repository'
import { excluirNotasDe } from '@/db/repositories/note-repository'
import { agora, gravarNovaPosicao } from '@/db/repositories/ordenacao'
import { somarDias } from '@/lib/datas'
import { destinoDoAdiamento, pendenciasDeOntem, planejarMovimento } from '@/lib/mover'

/** Tarefas visíveis no dia (pendentes e concluídas; arquivadas ficam fora), itens incluídos. */
export function listarTarefasDoDia(data: DataLocal) {
  return db.tasks
    .where('data')
    .equals(data)
    .filter((tarefa) => tarefa.status !== 'arquivada')
    .toArray()
}

/** Tarefas visíveis de `inicio` a `fim` (inclusive), itens de grupo incluídos. */
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
  return db.transaction('rw', db.tasks, db.groupInstances, async () => {
    const maiorOrdem = await maiorOrdemDoDia(dados.data)
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

/** Tira do calendário sem concluir. Item de grupo: o card some se ficar só com arquivados. */
export async function arquivarTarefa(id: string) {
  await db.transaction('rw', db.tasks, db.groupInstances, async () => {
    const tarefa = await db.tasks.get(id)
    await db.tasks.update(id, { status: 'arquivada', atualizadoEm: agora() })
    if (tarefa?.groupInstanceId) {
      await limparGrupoEsvaziado(tarefa.groupInstanceId, resultadoVazio())
    }
  })
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

/**
 * Tarefas soltas e cards de grupo vistos como uma tabela só: os dois dividem a `ordem` do dia.
 * Também serve para itens dentro do card (são tarefas).
 */
export const tabelaDoDia = {
  async bulkGet(ids: string[]) {
    const [tarefas, instancias] = await Promise.all([
      db.tasks.bulkGet(ids),
      db.groupInstances.bulkGet(ids),
    ])
    return ids.map((_, indice) => tarefas[indice] ?? instancias[indice])
  },
  async update(id: string, mudancas: { ordem: number; atualizadoEm: string }) {
    return (await db.tasks.update(id, mudancas)) || db.groupInstances.update(id, mudancas)
  },
}

/**
 * Grava a nova posição de `idMovido` (`idsEmOrdem` já reordenado): tarefas soltas e cards
 * entre si no dia, ou itens dentro de um card.
 */
export async function reordenarTarefa(idsEmOrdem: string[], idMovido: string) {
  await db.transaction('rw', db.tasks, db.groupInstances, () =>
    gravarNovaPosicao(tabelaDoDia, idsEmOrdem, idMovido),
  )
}

/** Maior `ordem` do dia entre tarefas soltas e cards (itens têm a ordem própria do card). */
export async function maiorOrdemDoDia(data: DataLocal, ignorar = new Set<string>()) {
  const [tarefas, instancias] = await Promise.all([
    db.tasks.where('data').equals(data).toArray(),
    db.groupInstances.where('data').equals(data).toArray(),
  ])
  const ordens = [
    ...tarefas.filter((tarefa) => !tarefa.groupInstanceId && !ignorar.has(tarefa.id)),
    ...instancias.filter((instancia) => !ignorar.has(instancia.id)),
  ].map((entrada) => entrada.ordem)
  return Math.max(0, ...ordens)
}

/** Maior `ordem` entre os itens do card. */
export async function maiorOrdemDoGrupo(instanciaId: string, ignorar = new Set<string>()) {
  const itens = await db.tasks.where('groupInstanceId').equals(instanciaId).toArray()
  return Math.max(0, ...itens.filter((item) => !ignorar.has(item.id)).map((item) => item.ordem))
}

/** Onde a tarefa estava antes de mover; permite "Desfazer". */
export interface PosicaoAnterior {
  id: string
  data: DataLocal
  ordem: number
  /** Card em que o item estava (ausente na tarefa solta). */
  groupInstanceId?: string
}

/** Cards alterados por um movimento: como estavam antes e os que foram criados. */
export interface EstadoDosGrupos {
  anteriores: GroupInstance[]
  criadas: string[]
}

export interface ResultadoMovimento {
  /** Tarefas (soltas ou itens) que mudaram de dia. */
  quantidade: number
  anteriores: PosicaoAnterior[]
  grupos: EstadoDosGrupos
  /** Cards vazios que mudaram de dia (não têm tarefa para contar). */
  gruposVaziosMovidos: number
}

export function resultadoVazio(): ResultadoMovimento {
  return {
    quantidade: 0,
    anteriores: [],
    grupos: { anteriores: [], criadas: [] },
    gruposVaziosMovidos: 0,
  }
}

export function juntarResultados(...resultados: ResultadoMovimento[]): ResultadoMovimento {
  const total = resultadoVazio()
  for (const resultado of resultados) {
    total.quantidade += resultado.quantidade
    total.anteriores.push(...resultado.anteriores)
    // Vale o estado mais antigo de cada card: é para ele que o "Desfazer" volta.
    for (const instancia of resultado.grupos.anteriores) guardarEstadoDoGrupo(total, instancia)
    total.grupos.criadas.push(...resultado.grupos.criadas)
    total.gruposVaziosMovidos += resultado.gruposVaziosMovidos
  }
  return total
}

/** Guarda como o card estava antes da primeira mudança deste movimento. */
export function guardarEstadoDoGrupo(resultado: ResultadoMovimento, instancia: GroupInstance) {
  const { anteriores, criadas } = resultado.grupos
  if (criadas.includes(instancia.id) || anteriores.some((outra) => outra.id === instancia.id)) {
    return
  }
  anteriores.push({ ...instancia })
}

/**
 * Card que perdeu itens: sem nenhum item, some; só com arquivados, sai do calendário.
 * Deve rodar dentro de uma transação com `tasks` e `groupInstances`.
 */
export async function limparGrupoEsvaziado(instanciaId: string, resultado: ResultadoMovimento) {
  const instancia = await db.groupInstances.get(instanciaId)
  if (!instancia) return
  const restantes = await db.tasks.where('groupInstanceId').equals(instanciaId).toArray()
  if (restantes.length === 0) {
    guardarEstadoDoGrupo(resultado, instancia)
    await db.groupInstances.delete(instanciaId)
  } else if (restantes.every((item) => item.status === 'arquivada') && !instancia.arquivado) {
    guardarEstadoDoGrupo(resultado, instancia)
    await db.groupInstances.update(instanciaId, { arquivado: true, atualizadoEm: agora() })
  }
}

/** Card de origem que ficaria sem nenhum item depois do movimento (pode ir inteiro). */
async function primeiraQueFicaVazia(origens: GroupInstance[], idsMovendo: Set<string>) {
  for (const origem of origens) {
    const itens = await db.tasks.where('groupInstanceId').equals(origem.id).toArray()
    if (itens.every((item) => idsMovendo.has(item.id))) return origem
  }
  return undefined
}

/**
 * Card da série em `destino` para receber itens: o que já existe (mescla), um card de origem
 * que ficaria vazio (o card vai inteiro, mesmo id) ou um novo no fim do dia.
 */
async function cardDeDestino(
  seriesId: string,
  destino: DataLocal,
  origens: GroupInstance[],
  idsMovendo: Set<string>,
  resultado: ResultadoMovimento,
): Promise<GroupInstance> {
  const momento = agora()
  const existente = await db.groupInstances
    .where('[seriesId+data]')
    .equals([seriesId, destino])
    .first()
  if (existente) {
    if (!existente.arquivado) return existente
    guardarEstadoDoGrupo(resultado, existente)
    const reaberto = { ...existente, arquivado: false, atualizadoEm: momento }
    await db.groupInstances.put(reaberto)
    return reaberto
  }

  const ordem = (await maiorOrdemDoDia(destino)) + 1
  const inteira = await primeiraQueFicaVazia(origens, idsMovendo)
  if (inteira) {
    guardarEstadoDoGrupo(resultado, inteira)
    const movida = { ...inteira, data: destino, ordem, arquivado: false, atualizadoEm: momento }
    await db.groupInstances.put(movida)
    return movida
  }

  const nova: GroupInstance = {
    id: crypto.randomUUID(),
    seriesId,
    data: destino,
    ordem,
    arquivado: false,
    criadoEm: momento,
    atualizadoEm: momento,
  }
  await db.groupInstances.add(nova)
  resultado.grupos.criadas.push(nova.id)
  return nova
}

const porDiaEOrdem = (a: Task, b: Task) =>
  a.data === b.data ? a.ordem - b.ordem : a.data.localeCompare(b.data)

/**
 * Leva itens pendentes para o card da MESMA série em `destino` (ver `cardDeDestino`).
 * Os concluídos ficam onde estão. Deve rodar dentro de uma transação com `tasks` e
 * `groupInstances`.
 */
async function levarItensParaSerie(itens: Task[], destino: DataLocal) {
  const resultado = resultadoVazio()
  const idsMovendo = new Set(itens.map((item) => item.id))
  const idsOrigem = [...new Set(itens.map((item) => item.groupInstanceId!))]
  const origens = (await db.groupInstances.bulkGet(idsOrigem)).filter(
    (instancia): instancia is GroupInstance => instancia !== undefined,
  )
  const momento = agora()

  for (const seriesId of new Set(origens.map((origem) => origem.seriesId))) {
    const origensDaSerie = origens.filter((origem) => origem.seriesId === seriesId)
    const idsOrigensDaSerie = new Set(origensDaSerie.map((origem) => origem.id))
    const itensDaSerie = itens
      .filter((item) => idsOrigensDaSerie.has(item.groupInstanceId!))
      .sort(porDiaEOrdem)

    const alvo = await cardDeDestino(seriesId, destino, origensDaSerie, idsMovendo, resultado)
    const maiorOrdem = await maiorOrdemDoGrupo(alvo.id, idsMovendo)
    await Promise.all(
      itensDaSerie.map((item, indice) =>
        db.tasks.update(item.id, {
          data: destino,
          groupInstanceId: alvo.id,
          ordem: maiorOrdem + indice + 1,
          atualizadoEm: momento,
        }),
      ),
    )
    resultado.anteriores.push(
      ...itensDaSerie.map(({ id, data, ordem, groupInstanceId }) => ({
        id,
        data,
        ordem,
        groupInstanceId,
      })),
    )
    for (const origem of origensDaSerie) {
      if (origem.id !== alvo.id) await limparGrupoEsvaziado(origem.id, resultado)
    }
  }
  resultado.quantidade = resultado.anteriores.length
  return resultado
}

/**
 * Move tarefas para outro dia: só troca `data` (e `ordem`, entrando no fim do dia).
 * Item de grupo pendente vai para o card da mesma série no destino; item concluído fica.
 * NUNCA copia, apaga ou altera `dataOriginal`.
 */
export async function moverTarefas(ids: string[], destino: DataLocal): Promise<ResultadoMovimento> {
  return db.transaction('rw', db.tasks, db.groupInstances, async () => {
    const tarefas = (await db.tasks.bulkGet(ids)).filter((tarefa) => tarefa !== undefined)
    const soltas = tarefas.filter((tarefa) => !tarefa.groupInstanceId)
    const itens = tarefas.filter(
      (tarefa) => tarefa.groupInstanceId && tarefa.status === 'pendente' && tarefa.data !== destino,
    )
    const maiorOrdem = await maiorOrdemDoDia(destino, new Set(ids))
    const movimentos = planejarMovimento(soltas, destino, maiorOrdem)
    const porId = new Map(soltas.map((tarefa) => [tarefa.id, tarefa]))
    const momento = agora()
    await Promise.all(
      movimentos.map(({ id, data, ordem }) =>
        db.tasks.update(id, { data, ordem, atualizadoEm: momento }),
      ),
    )
    const dasSoltas = resultadoVazio()
    dasSoltas.quantidade = movimentos.length
    dasSoltas.anteriores = movimentos.map(({ id }) => {
      const { data, ordem } = porId.get(id)!
      return { id, data, ordem }
    })
    if (itens.length === 0) return dasSoltas
    return juntarResultados(dasSoltas, await levarItensParaSerie(itens, destino))
  })
}

/** Adia pendentes um dia (ver `destinoDoAdiamento`). */
export async function adiarTarefas(ids: string[], hoje: DataLocal): Promise<ResultadoMovimento> {
  return db.transaction('rw', db.tasks, db.groupInstances, async () => {
    const pendentes = (await db.tasks.bulkGet(ids)).filter(
      (tarefa) => tarefa?.status === 'pendente',
    )
    const porDestino = new Map<DataLocal, string[]>()
    for (const tarefa of pendentes) {
      const destino = destinoDoAdiamento(tarefa!.data, hoje)
      porDestino.set(destino, [...(porDestino.get(destino) ?? []), tarefa!.id])
    }
    const parciais: ResultadoMovimento[] = []
    for (const [destino, idsDoDestino] of porDestino) {
      parciais.push(await moverTarefas(idsDoDestino, destino))
    }
    return juntarResultados(...parciais)
  })
}

/**
 * Desfaz um movimento: devolve cada tarefa ao dia, posição e card em que estava, restaura os
 * cards alterados ou apagados e remove os criados.
 */
export async function restaurarPosicoes(
  anteriores: PosicaoAnterior[],
  grupos: EstadoDosGrupos = { anteriores: [], criadas: [] },
) {
  const momento = agora()
  await db.transaction('rw', db.tasks, db.groupInstances, async () => {
    await db.groupInstances.bulkPut(grupos.anteriores)
    await Promise.all(
      anteriores.map(({ id, data, ordem, groupInstanceId }) =>
        db.tasks.update(id, { data, ordem, groupInstanceId, atualizadoEm: momento }),
      ),
    )
    await db.groupInstances.bulkDelete(grupos.criadas)
  })
}

/** Pendentes de ontem, soltas e itens de grupo (para o aviso "Trazer pendências de ontem"). */
export async function listarPendenciasDeOntem(hoje: DataLocal) {
  const deOntem = await db.tasks.where('data').equals(somarDias(hoje, -1)).toArray()
  return pendenciasDeOntem(deOntem, hoje)
}

/** Traz para hoje as pendentes de ontem; itens de grupo entram no card da série de hoje. */
export async function trazerPendenciasDeOntem(hoje: DataLocal): Promise<ResultadoMovimento> {
  return db.transaction('rw', db.tasks, db.groupInstances, async () => {
    const pendentes = await listarPendenciasDeOntem(hoje)
    return moverTarefas(
      pendentes.map((tarefa) => tarefa.id),
      hoje,
    )
  })
}

/**
 * Solta uma tarefa solta arrastada em `destino`, na posição em que ela aparece em
 * `idsEmOrdemNoDestino` (lista do dia de destino, com cards, já com a tarefa no lugar).
 * Só troca `data` e `ordem`.
 */
export async function soltarTarefaNoDia(
  id: string,
  destino: DataLocal,
  idsEmOrdemNoDestino: string[],
) {
  await db.transaction('rw', db.tasks, db.groupInstances, async () => {
    await db.tasks.update(id, { data: destino, atualizadoEm: agora() })
    await gravarNovaPosicao(tabelaDoDia, idsEmOrdemNoDestino, id)
  })
}
