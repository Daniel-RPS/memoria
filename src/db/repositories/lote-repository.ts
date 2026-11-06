import { db } from '@/db/database'
import type { Attachment, GroupCard, GroupItem, Note, Subtask, Task, TimeSession } from '@/db/types'
import {
  colocarNoGrupo,
  passarItemParaCard,
  tirarDoGrupo,
} from '@/db/repositories/group-repository'
import { agora } from '@/db/repositories/ordenacao'
import {
  montarAviso,
  mudancaAoEntrarNoGrupo,
  mudancaAoSairDoGrupo,
  type AvisoDeCategoria,
} from '@/domain/categoria-no-grupo'
import { tabelaDoDia } from '@/db/repositories/task-repository'
import {
  BLOCO_DEMAIS,
  blocoDe,
  chaveDoTopo,
  manterBlocos,
  type Bloco,
  type Ordenavel,
} from '@/domain/ordem-de-exibicao'
import { planejarOrdens } from '@/domain/selecao-em-lote'

/**
 * Movimento em lote de tarefas soltas e itens (arrastar várias juntas, Alt+↑/↓): numa transação
 * só, com o "Desfazer" que devolve cada registro (e o que a conversão tocou) ao que era.
 */

export interface ResultadoLote {
  /** Quantos registros foram movidos. */
  quantidade: number
  /** Linhas que perderam a categoria ao entrar num grupo ou sair dele (para o aviso). */
  avisos: AvisoDeCategoria[]
  /** Devolve tudo ao que era antes do movimento. */
  desfazer: () => Promise<void>
}

/** Onde as linhas caem: as tarefas soltas do dia ou um card. */
export type DestinoDoLote = { tipo: 'soltas' } | { tipo: 'card'; cardId: string }

const TABELAS = [
  db.tasks,
  db.subtasks,
  db.notes,
  db.attachments,
  db.groupSeries,
  db.groupCards,
  db.groupItems,
  db.sessions,
  db.categories,
  db.subcategories,
]

/** Os registros como estavam: o suficiente para voltar atrás (inclusive depois de converter). */
interface Instantaneo {
  /** Ids das linhas da lista de destino e dos movidos (as linhas que podem mudar). */
  ids: string[]
  tarefas: Task[]
  itens: GroupItem[]
  /** Cards da lista (tarefas soltas e cards dividem a escala de `ordem` do dia). */
  cards: GroupCard[]
  subtarefas: Subtask[]
  notas: Note[]
  anexos: Attachment[]
  sessoes: TimeSession[]
}

function existentes<T>(lista: (T | undefined)[]) {
  return lista.filter((registro): registro is T => registro !== undefined)
}

async function capturar(ids: string[], movidos: string[]): Promise<Instantaneo> {
  const [tarefas, itens, cards] = await Promise.all([
    db.tasks.bulkGet(ids),
    db.groupItems.bulkGet(ids),
    db.groupCards.bulkGet(ids),
  ])
  const itensMovidos = existentes(await db.groupItems.bulkGet(movidos))
  const donos = new Set(movidos)
  const cadeias = new Set(itensMovidos.map((item) => item.cadeiaId))
  const [subtarefas, notas, anexos, sessoes] = await Promise.all([
    db.subtasks.where('taskId').anyOf(movidos).toArray(),
    db.notes
      .filter(
        (nota) =>
          nota.vinculo !== undefined &&
          ((nota.vinculo.tipo === 'tarefa' && donos.has(nota.vinculo.id)) ||
            (nota.vinculo.tipo === 'item' &&
              (donos.has(nota.vinculo.id) || cadeias.has(nota.vinculo.id)))),
      )
      .toArray(),
    db.attachments
      .filter((anexo) => anexo.dono.tipo === 'task' && donos.has(anexo.dono.id))
      .toArray(),
    db.sessions
      .filter(
        (sessao) =>
          (sessao.tarefaId !== undefined && donos.has(sessao.tarefaId)) ||
          (sessao.itemId !== undefined && donos.has(sessao.itemId)) ||
          (sessao.cadeiaId !== undefined && cadeias.has(sessao.cadeiaId)),
      )
      .toArray(),
  ])
  return {
    ids,
    tarefas: existentes(tarefas),
    itens: existentes(itens),
    cards: existentes(cards),
    subtarefas,
    notas,
    anexos,
    sessoes,
  }
}

async function restaurar(instantaneo: Instantaneo, movidos: string[]) {
  await db.transaction('rw', TABELAS, async () => {
    // Tarefa que virou item (ou o contrário) tem o mesmo id: apaga dos dois lados e regrava.
    await db.tasks.bulkDelete(instantaneo.ids)
    await db.groupItems.bulkDelete(instantaneo.ids)
    await db.tasks.bulkPut(instantaneo.tarefas)
    await db.groupItems.bulkPut(instantaneo.itens)
    await db.groupCards.bulkPut(instantaneo.cards)
    await db.subtasks.where('taskId').anyOf(movidos).delete()
    await db.subtasks.bulkPut(instantaneo.subtarefas)
    await db.notes.bulkPut(instantaneo.notas)
    await db.attachments.bulkPut(instantaneo.anexos)
    await db.sessions.bulkPut(instantaneo.sessoes)
  })
}

/** Nomes de todas as categorias e subcategorias, por id. */
async function lerNomesDeCategoria() {
  const [categorias, subcategorias] = await Promise.all([
    db.categories.toArray(),
    db.subcategories.toArray(),
  ])
  return new Map([...categorias, ...subcategorias].map((registro) => [registro.id, registro.nome]))
}

/**
 * Antes de converter: quem vai perder a categoria (tarefa solta entrando no card `destino`, ou
 * item saindo do grupo para as soltas). A regra está em `domain/categoria-no-grupo`.
 */
async function avisosDeCategoria(movidos: string[], destino: DestinoDoLote) {
  const avisos: AvisoDeCategoria[] = []
  let nomes: Map<string, string> | undefined
  const nomesDe = async () => (nomes ??= await lerNomesDeCategoria())
  const serieDoCard = async (cardId: string) => {
    const card = await db.groupCards.get(cardId)
    return card ? db.groupSeries.get(card.seriesId) : undefined
  }
  const serieDestino = destino.tipo === 'card' ? await serieDoCard(destino.cardId) : undefined
  for (const id of movidos) {
    const tarefa = await db.tasks.get(id)
    if (tarefa && serieDestino) {
      const mudanca = mudancaAoEntrarNoGrupo(tarefa, serieDestino)
      if (mudanca) {
        avisos.push(
          montarAviso('entrou', tarefa.titulo, serieDestino.titulo, mudanca, await nomesDe()),
        )
      }
      continue
    }
    const item = tarefa ? undefined : await db.groupItems.get(id)
    if (!item || destino.tipo !== 'soltas') continue
    const serie = await serieDoCard(item.cardId)
    const mudanca = serie && mudancaAoSairDoGrupo(serie)
    if (serie && mudanca) {
      avisos.push(montarAviso('saiu', item.titulo, serie.titulo, mudanca, await nomesDe()))
    }
  }
  return avisos
}

/** Lê tarefas e itens da lista para saber o bloco de exibição e a `ordem` de cada um. */
async function lerOrdenaveis(ids: string[]) {
  const [tarefas, itens] = await Promise.all([db.tasks.bulkGet(ids), db.groupItems.bulkGet(ids)])
  const porId = new Map<string, Ordenavel>()
  ids.forEach((id, indice) => {
    const registro = tarefas[indice] ?? itens[indice]
    if (registro) porId.set(id, registro)
  })
  return porId
}

/**
 * Grava a lista final: dentro de cada bloco do topo que ganhou movidos, a posição de todos os
 * membros; nos demais, a `ordem` só dos movidos, entre os vizinhos que ficaram parados.
 * `escala`: `dia` (tarefas soltas e cards, na mesma escala) ou `card` (itens).
 */
async function gravarOrdemFinal(
  idsEmOrdem: string[],
  movidos: Set<string>,
  escala: 'dia' | 'card',
) {
  const ordenaveis = await lerOrdenaveis(idsEmOrdem)
  const blocoDoId = (id: string): Bloco => {
    const registro = ordenaveis.get(id)
    return registro ? blocoDe(registro) : BLOCO_DEMAIS
  }
  const final = manterBlocos(idsEmOrdem, blocoDoId)
  const momento = agora()

  for (const bloco of [0, 1, 2] as const) {
    const membros = final.filter((id) => blocoDoId(id) === bloco)
    if (!membros.some((id) => movidos.has(id))) continue
    for (const [indice, id] of membros.entries()) {
      const registro = ordenaveis.get(id)!
      const mudancas = {
        ordemNoTopo: { chave: chaveDoTopo(registro), posicao: indice + 1 },
        atualizadoEm: momento,
      }
      if (await db.tasks.get(id)) await db.tasks.update(id, mudancas)
      else await db.groupItems.update(id, mudancas)
    }
  }

  const demais = final.filter((id) => blocoDoId(id) === BLOCO_DEMAIS)
  const movidosDosDemais = new Set(demais.filter((id) => movidos.has(id)))
  if (movidosDosDemais.size === 0) return
  const tabela = escala === 'dia' ? tabelaDoDia : db.groupItems
  const registros = await tabela.bulkGet(demais)
  const ordemPorId = new Map(demais.map((id, indice) => [id, registros[indice]?.ordem ?? 0]))
  const plano = planejarOrdens(demais, movidosDosDemais, (id) => ordemPorId.get(id) ?? 0)
  if (plano.tipo === 'ordens') {
    for (const [id, ordem] of plano.ordens)
      await tabela.update(id, { ordem, atualizadoEm: momento })
  } else {
    for (const [indice, id] of demais.entries()) {
      await tabela.update(id, { ordem: indice + 1, atualizadoEm: momento })
    }
  }
}

export interface PedidoDeLote {
  /** As linhas movidas (tarefas soltas e itens), na ordem da tela. */
  movidos: string[]
  destino: DestinoDoLote
  /** A lista do destino como deve ficar, com os movidos no lugar onde foram soltos. */
  idsEmOrdemNoDestino: string[]
}

/**
 * Leva as linhas para `destino` e as põe na posição de `idsEmOrdemNoDestino`, em UMA operação.
 * Linha que já estava ali só muda de posição (ou o bloco inteiro anda junto); a de outra lista
 * é convertida com as mesmas funções de sempre (`colocarNoGrupo`, `tirarDoGrupo`,
 * `passarItemParaCard`). Arrastar não atravessa blocos (prioridade, andamento). O "Desfazer"
 * volta tudo.
 */
export async function moverLote(pedido: PedidoDeLote): Promise<ResultadoLote> {
  const { movidos, destino, idsEmOrdemNoDestino } = pedido
  const ids = [...new Set([...idsEmOrdemNoDestino, ...movidos])]
  return db.transaction('rw', TABELAS, async () => {
    const instantaneo = await capturar(ids, movidos)
    const avisos = await avisosDeCategoria(movidos, destino)
    for (const id of movidos) {
      const isTarefa = await db.tasks.get(id)
      if (destino.tipo === 'soltas') {
        if (!isTarefa) await tirarDoGrupo(id)
      } else if (isTarefa) {
        await colocarNoGrupo(id, destino.cardId)
      } else {
        const item = await db.groupItems.get(id)
        if (item && item.cardId !== destino.cardId) await passarItemParaCard(id, destino.cardId)
      }
    }
    await gravarOrdemFinal(
      idsEmOrdemNoDestino,
      new Set(movidos),
      destino.tipo === 'soltas' ? 'dia' : 'card',
    )
    return {
      quantidade: movidos.length,
      avisos,
      desfazer: () => restaurar(instantaneo, movidos),
    }
  })
}

/**
 * Uma tarefa solta vira item do card (arrastar uma só, menu ⋯ "Colocar no grupo"): o mesmo
 * `colocarNoGrupo`, com o "Desfazer" (devolve a tarefa solta com categoria, dia, posição, notas e
 * anexos) e o aviso se ela perdeu a categoria.
 */
export async function colocarNoGrupoComDesfazer(
  tarefaId: string,
  cardId: string,
  idsEmOrdem?: string[],
): Promise<ResultadoLote> {
  return converterUm(
    tarefaId,
    { tipo: 'card', cardId },
    () => colocarNoGrupo(tarefaId, cardId, idsEmOrdem),
    idsEmOrdem,
  )
}

/** Um item vira tarefa solta (arrastar um só, menu ⋯ "Tirar do grupo"), com "Desfazer" e aviso. */
export async function tirarDoGrupoComDesfazer(
  itemId: string,
  idsEmOrdemNoDia?: string[],
): Promise<ResultadoLote> {
  return converterUm(
    itemId,
    { tipo: 'soltas' },
    () => tirarDoGrupo(itemId, idsEmOrdemNoDia),
    idsEmOrdemNoDia,
  )
}

async function converterUm(
  id: string,
  destino: DestinoDoLote,
  converter: () => Promise<void>,
  idsEmOrdem: string[] = [],
): Promise<ResultadoLote> {
  const ids = [...new Set([id, ...idsEmOrdem])]
  return db.transaction('rw', TABELAS, async () => {
    const instantaneo = await capturar(ids, [id])
    const avisos = await avisosDeCategoria([id], destino)
    await converter()
    return { quantidade: 1, avisos, desfazer: () => restaurar(instantaneo, [id]) }
  })
}

/**
 * Reordena várias subetapas da MESMA tarefa/item de uma vez: só os movidos ganham `ordem` nova,
 * entre os vizinhos parados. O "Desfazer" devolve a ordem de antes.
 */
export async function reordenarSubetapasEmLote(
  idsEmOrdem: string[],
  movidos: string[],
): Promise<ResultadoLote> {
  return db.transaction('rw', db.subtasks, async () => {
    const antes = existentes(await db.subtasks.bulkGet(idsEmOrdem))
    const ordemPorId = new Map(antes.map((subetapa) => [subetapa.id, subetapa.ordem]))
    const momento = agora()
    const plano = planejarOrdens(idsEmOrdem, new Set(movidos), (id) => ordemPorId.get(id) ?? 0)
    if (plano.tipo === 'ordens') {
      for (const [id, ordem] of plano.ordens) {
        await db.subtasks.update(id, { ordem, atualizadoEm: momento })
      }
    } else {
      for (const [indice, id] of idsEmOrdem.entries()) {
        await db.subtasks.update(id, { ordem: indice + 1, atualizadoEm: momento })
      }
    }
    return {
      quantidade: movidos.length,
      avisos: [],
      desfazer: async () => {
        await db.subtasks.bulkPut(antes)
      },
    }
  })
}
