import { db } from '@/db/database'
import type { DataLocal, GroupCard, GroupItem, GroupSeries, Task } from '@/db/types'
import { excluirAnexosDe } from '@/db/repositories/attachment-repository'
import { excluirNotasDe } from '@/db/repositories/note-repository'
import { agora, gravarNovaPosicao } from '@/db/repositories/ordenacao'
import {
  adiarTarefas,
  listarPendenciasDeOntem,
  maiorOrdemDoDia,
  moverTarefas,
  restaurarPosicoes,
  tabelaDoDia,
  type PosicaoAnterior,
} from '@/db/repositories/task-repository'
import { somarDias } from '@/lib/datas'
import { ErroDeValidacao } from '@/lib/erros'
import { mesmoTituloDeSerie } from '@/lib/grupos'
import { destinoDoAdiamento } from '@/lib/mover'

/** Cards visíveis (não arquivados) de `inicio` a `fim`, as séries e os itens deles. */
export async function listarGruposEntre(inicio: DataLocal, fim: DataLocal) {
  const cards = await db.groupCards
    .where('data')
    .between(inicio, fim, true, true)
    .filter((card) => !card.arquivado)
    .toArray()
  const idsSeries = [...new Set(cards.map((card) => card.seriesId))]
  const [series, itens] = await Promise.all([
    db.groupSeries.bulkGet(idsSeries),
    db.groupItems
      .where('cardId')
      .anyOf(cards.map((card) => card.id))
      .toArray(),
  ])
  // Dia de cada card que recebeu itens transferidos (para a etiqueta "transferido para").
  const idsDestinos = [...new Set(itens.flatMap((item) => item.transferidoParaCardId ?? []))]
  const destinos = await db.groupCards.bulkGet(idsDestinos)
  const dataDoDestino = new Map(
    destinos.flatMap((card) => (card ? [[card.id, card.data] as const] : [])),
  )
  return {
    cards,
    series: series.filter((serie): serie is GroupSeries => serie !== undefined),
    itens,
    dataDoDestino,
  }
}

async function serieComTitulo(titulo: string) {
  const series = await db.groupSeries.toArray()
  return series.find((serie) => mesmoTituloDeSerie(serie.titulo, titulo))
}

async function cardDaSerieNoDia(seriesId: string, data: DataLocal) {
  return db.groupCards.where('[seriesId+data]').equals([seriesId, data]).first()
}

async function maiorOrdemDoCard(cardId: string) {
  const itens = await db.groupItems.where('cardId').equals(cardId).toArray()
  return Math.max(0, ...itens.map((item) => item.ordem))
}

function novoCard(seriesId: string, data: DataLocal, ordem: number): GroupCard {
  const momento = agora()
  return {
    id: crypto.randomUUID(),
    seriesId,
    data,
    ordem,
    arquivado: false,
    criadoEm: momento,
    atualizadoEm: momento,
  }
}

export interface NovoGrupo {
  titulo: string
  data: DataLocal
  categoryId?: string
  subcategoryId?: string
}

/**
 * Cria o card no fim do dia. Nome de série que já existe reusa a série (e a categoria dela);
 * se ela já tem card neste dia, lança `ErroDeValidacao`.
 */
export async function criarGrupo(dados: NovoGrupo): Promise<GroupCard> {
  return db.transaction('rw', db.tasks, db.groupSeries, db.groupCards, async () => {
    const momento = agora()
    let serie = await serieComTitulo(dados.titulo)
    if (!serie) {
      serie = {
        id: crypto.randomUUID(),
        titulo: dados.titulo.trim(),
        categoryId: dados.categoryId,
        subcategoryId: dados.categoryId ? dados.subcategoryId : undefined,
        criadoEm: momento,
        atualizadoEm: momento,
      }
      await db.groupSeries.add(serie)
    }
    const ordem = (await maiorOrdemDoDia(dados.data)) + 1
    const existente = await cardDaSerieNoDia(serie.id, dados.data)
    if (existente && !existente.arquivado) {
      throw new ErroDeValidacao(`Já existe o grupo “${serie.titulo}” neste dia.`)
    }
    if (existente) {
      const reaberto = { ...existente, arquivado: false, ordem, atualizadoEm: momento }
      await db.groupCards.put(reaberto)
      return reaberto
    }
    const card = novoCard(serie.id, dados.data, ordem)
    await db.groupCards.add(card)
    return card
  })
}

/** Novo item pendente no fim do card; nasce com a data do card. */
export async function criarItem(cardId: string, titulo: string): Promise<GroupItem> {
  return db.transaction('rw', db.groupCards, db.groupItems, async () => {
    const card = await db.groupCards.get(cardId)
    if (!card) throw new Error('Grupo não encontrado.')
    const momento = agora()
    const item: GroupItem = {
      id: crypto.randomUUID(),
      cardId,
      titulo: titulo.trim(),
      ordem: (await maiorOrdemDoCard(cardId)) + 1,
      status: 'pendente',
      dataOriginal: card.data,
      criadoEm: momento,
      atualizadoEm: momento,
    }
    await db.groupItems.add(item)
    return item
  })
}

/** Renomeia a série: vale para o card em todos os dias. Nome de outra série é recusado. */
export async function renomearGrupo(seriesId: string, titulo: string) {
  await db.transaction('rw', db.groupSeries, async () => {
    const outra = await serieComTitulo(titulo)
    if (outra && outra.id !== seriesId) {
      throw new ErroDeValidacao('Já existe um grupo com esse nome.')
    }
    await db.groupSeries.update(seriesId, { titulo: titulo.trim(), atualizadoEm: agora() })
  })
}

/** Categoria da série (cor e filtro do card em todos os dias). */
export async function definirCategoriaDoGrupo(
  seriesId: string,
  categoria: { categoryId?: string; subcategoryId?: string },
) {
  await db.groupSeries.update(seriesId, {
    categoryId: categoria.categoryId,
    subcategoryId: categoria.categoryId ? categoria.subcategoryId : undefined,
    atualizadoEm: agora(),
  })
}

export async function renomearItem(id: string, titulo: string) {
  await db.groupItems.update(id, { titulo: titulo.trim(), atualizadoEm: agora() })
}

/** Marca ou desmarca. Item transferido não muda (e a cópia nunca é afetada). */
export async function definirConclusaoItem(id: string, concluido: boolean) {
  await db.transaction('rw', db.groupItems, async () => {
    const item = await db.groupItems.get(id)
    if (!item || item.status === 'transferido' || item.status === 'arquivado') return
    const momento = agora()
    await db.groupItems.update(
      id,
      concluido
        ? { status: 'concluido', concluidoEm: momento, atualizadoEm: momento }
        : { status: 'pendente', concluidoEm: undefined, atualizadoEm: momento },
    )
  })
}

/** Grava a nova posição de `idMovido` entre os itens do card (`idsEmOrdem` já reordenado). */
export async function reordenarItem(idsEmOrdem: string[], idMovido: string) {
  await db.transaction('rw', db.groupItems, () =>
    gravarNovaPosicao(db.groupItems, idsEmOrdem, idMovido),
  )
}

export async function arquivarItem(id: string) {
  await db.groupItems.update(id, { status: 'arquivado', atualizadoEm: agora() })
}

export async function excluirItem(id: string) {
  await db.groupItems.delete(id)
}

/**
 * Arquiva o card: os itens pendentes saem do calendário. Com feitos ou transferidos, o card
 * fica (encerrado, como registro); sem eles, sai do calendário também.
 */
export async function arquivarGrupo(cardId: string) {
  await db.transaction('rw', db.groupCards, db.groupItems, async () => {
    const momento = agora()
    await db.groupItems
      .where('cardId')
      .equals(cardId)
      .filter((item) => item.status === 'pendente')
      .modify({ status: 'arquivado', atualizadoEm: momento })
    const restantes = await db.groupItems
      .where('cardId')
      .equals(cardId)
      .filter((item) => item.status !== 'arquivado')
      .count()
    if (restantes === 0) {
      await db.groupCards.update(cardId, { arquivado: true, atualizadoEm: momento })
    }
  })
}

/** Exclusão definitiva do card e dos itens dele. A série some quando fica sem nenhum card. */
export async function excluirGrupo(cardId: string) {
  await db.transaction('rw', db.groupSeries, db.groupCards, db.groupItems, async () => {
    const card = await db.groupCards.get(cardId)
    if (!card) return
    await db.groupItems.where('cardId').equals(cardId).delete()
    await db.groupCards.delete(cardId)
    const restantes = await db.groupCards.where('seriesId').equals(card.seriesId).count()
    if (restantes === 0) await db.groupSeries.delete(card.seriesId)
  })
}

/** O que uma cópia criou e mudou, para o "Desfazer". */
export interface DesfazerCopia {
  cardsCriados: string[]
  cardsReabertos: string[]
  itensCriados: string[]
  /** Originais que viraram `transferido`. */
  itensTransferidos: string[]
}

/** Resultado de mover tarefas soltas e copiar itens de grupo numa ação só. */
export interface ResultadoAcao {
  tarefasMovidas: number
  itensCopiados: number
  anteriores: PosicaoAnterior[]
  copia: DesfazerCopia
}

function acaoVazia(): ResultadoAcao {
  return {
    tarefasMovidas: 0,
    itensCopiados: 0,
    anteriores: [],
    copia: { cardsCriados: [], cardsReabertos: [], itensCriados: [], itensTransferidos: [] },
  }
}

function juntar(...resultados: ResultadoAcao[]): ResultadoAcao {
  const total = acaoVazia()
  for (const resultado of resultados) {
    total.tarefasMovidas += resultado.tarefasMovidas
    total.itensCopiados += resultado.itensCopiados
    total.anteriores.push(...resultado.anteriores)
    total.copia.cardsCriados.push(...resultado.copia.cardsCriados)
    total.copia.cardsReabertos.push(...resultado.copia.cardsReabertos)
    total.copia.itensCriados.push(...resultado.copia.itensCriados)
    total.copia.itensTransferidos.push(...resultado.copia.itensTransferidos)
  }
  return total
}

/** Card da série em `destino` que recebe as cópias: o que existe (mescla) ou um novo. */
async function cardDeDestino(seriesId: string, destino: DataLocal, resultado: ResultadoAcao) {
  const existente = await cardDaSerieNoDia(seriesId, destino)
  if (existente && !existente.arquivado) return existente
  if (existente) {
    await db.groupCards.update(existente.id, { arquivado: false, atualizadoEm: agora() })
    resultado.copia.cardsReabertos.push(existente.id)
    return existente
  }
  const card = novoCard(seriesId, destino, (await maiorOrdemDoDia(destino)) + 1)
  await db.groupCards.add(card)
  resultado.copia.cardsCriados.push(card.id)
  return card
}

/**
 * Copia itens pendentes para o card da MESMA série em `destino` (mescla se existir, cria se
 * não). As cópias nascem pendentes, com a `dataOriginal` preservada e `origemItemId`; os
 * originais ficam no card de origem como `transferido`. Uma transação só.
 */
export async function copiarItens(ids: string[], destino: DataLocal): Promise<ResultadoAcao> {
  return db.transaction('rw', db.tasks, db.groupCards, db.groupItems, async () => {
    const resultado = acaoVazia()
    const itens = (await db.groupItems.bulkGet(ids)).filter(
      (item): item is GroupItem => item?.status === 'pendente',
    )
    const cards = new Map(
      (await db.groupCards.bulkGet([...new Set(itens.map((item) => item.cardId))]))
        .filter((card): card is GroupCard => card !== undefined)
        .map((card) => [card.id, card]),
    )
    const aCopiar = itens
      .filter((item) => cards.get(item.cardId) && cards.get(item.cardId)!.data !== destino)
      .sort((a, b) => {
        const dataA = cards.get(a.cardId)!.data
        const dataB = cards.get(b.cardId)!.data
        return dataA === dataB ? a.ordem - b.ordem : dataA.localeCompare(dataB)
      })
    const momento = agora()

    for (const seriesId of new Set(aCopiar.map((item) => cards.get(item.cardId)!.seriesId))) {
      const daSerie = aCopiar.filter((item) => cards.get(item.cardId)!.seriesId === seriesId)
      const alvo = await cardDeDestino(seriesId, destino, resultado)
      const maiorOrdem = await maiorOrdemDoCard(alvo.id)
      const copias: GroupItem[] = daSerie.map((original, indice) => ({
        id: crypto.randomUUID(),
        cardId: alvo.id,
        titulo: original.titulo,
        ordem: maiorOrdem + indice + 1,
        status: 'pendente',
        origemItemId: original.id,
        dataOriginal: original.dataOriginal,
        criadoEm: momento,
        atualizadoEm: momento,
      }))
      await db.groupItems.bulkAdd(copias)
      await Promise.all(
        daSerie.map((original) =>
          db.groupItems.update(original.id, {
            status: 'transferido',
            transferidoParaCardId: alvo.id,
            atualizadoEm: momento,
          }),
        ),
      )
      resultado.copia.itensCriados.push(...copias.map((copia) => copia.id))
      resultado.copia.itensTransferidos.push(...daSerie.map((original) => original.id))
    }
    resultado.itensCopiados = resultado.copia.itensCriados.length
    return resultado
  })
}

async function pendentesDosCards(cardIds: string[]) {
  return db.groupItems
    .where('cardId')
    .anyOf(cardIds)
    .filter((item) => item.status === 'pendente')
    .toArray()
}

/**
 * Copia o card para `destino`: o original fica como está e o destino recebe os itens
 * pendentes. Card sem pendentes não tem o que copiar (nada acontece).
 */
export async function copiarGrupos(cardIds: string[], destino: DataLocal) {
  return db.transaction('rw', db.tasks, db.groupCards, db.groupItems, async () =>
    copiarItens(
      (await pendentesDosCards(cardIds)).map((item) => item.id),
      destino,
    ),
  )
}

/** Copia itens (soltos ou de cards inteiros) um dia adiante (ver `destinoDoAdiamento`). */
async function adiarItensECards(itemIds: string[], cardIds: string[], hoje: DataLocal) {
  const itens = [
    ...(await pendentesDosCards(cardIds)),
    ...(await db.groupItems.bulkGet(itemIds)).filter(
      (item): item is GroupItem => item?.status === 'pendente',
    ),
  ]
  const cards = await db.groupCards.bulkGet([...new Set(itens.map((item) => item.cardId))])
  const dataDoCard = new Map(cards.filter((card) => card).map((card) => [card!.id, card!.data]))
  const porDestino = new Map<DataLocal, Set<string>>()
  for (const item of itens) {
    const data = dataDoCard.get(item.cardId)
    if (!data) continue
    const destino = destinoDoAdiamento(data, hoje)
    porDestino.set(destino, (porDestino.get(destino) ?? new Set()).add(item.id))
  }
  const parciais: ResultadoAcao[] = []
  for (const [destino, ids] of porDestino) parciais.push(await copiarItens([...ids], destino))
  return juntar(...parciais)
}

/** O que foi escolhido para mover: tarefas soltas, cards inteiros e itens avulsos. */
export interface Selecionados {
  tarefas?: string[]
  grupos?: string[]
  itens?: string[]
}

const TABELAS_DA_ACAO = [db.tasks, db.groupCards, db.groupItems]

/** Move as tarefas soltas e copia os itens pendentes (dos cards e avulsos) para `destino`. */
export async function moverSelecao(
  { tarefas = [], grupos = [], itens = [] }: Selecionados,
  destino: DataLocal,
): Promise<ResultadoAcao> {
  return db.transaction('rw', TABELAS_DA_ACAO, async () => {
    const movidas = await moverTarefas(tarefas, destino)
    const idsItens = [...(await pendentesDosCards(grupos)).map((item) => item.id), ...itens]
    const copia = await copiarItens([...new Set(idsItens)], destino)
    return {
      ...copia,
      tarefasMovidas: movidas.quantidade,
      anteriores: movidas.anteriores,
    }
  })
}

/** Adia um dia: tarefas soltas são movidas; itens pendentes dos cards são copiados. */
export async function adiarSelecao(
  { tarefas = [], grupos = [], itens = [] }: Selecionados,
  hoje: DataLocal,
): Promise<ResultadoAcao> {
  return db.transaction('rw', TABELAS_DA_ACAO, async () => {
    const movidas = await adiarTarefas(tarefas, hoje)
    const copia = await adiarItensECards(itens, grupos, hoje)
    return { ...copia, tarefasMovidas: movidas.quantidade, anteriores: movidas.anteriores }
  })
}

/** Itens pendentes nos cards de ontem. */
async function itensPendentesDeOntem(hoje: DataLocal) {
  const cards = await db.groupCards
    .where('data')
    .equals(somarDias(hoje, -1))
    .filter((card) => !card.arquivado)
    .primaryKeys()
  return pendentesDosCards(cards)
}

/** Quantas pendências ficaram ontem: tarefas soltas e itens de cards. */
export async function contarPendenciasDeOntem(hoje: DataLocal) {
  const [tarefas, itens] = await Promise.all([
    listarPendenciasDeOntem(hoje),
    itensPendentesDeOntem(hoje),
  ])
  return tarefas.length + itens.length
}

/** Traz as tarefas soltas de ontem (move) e copia os pendentes dos cards de ontem para hoje. */
export async function trazerPendenciasDeOntem(hoje: DataLocal): Promise<ResultadoAcao> {
  return db.transaction('rw', TABELAS_DA_ACAO, async () => {
    const tarefas = (await listarPendenciasDeOntem(hoje)).map((tarefa) => tarefa.id)
    const itens = (await itensPendentesDeOntem(hoje)).map((item) => item.id)
    return moverSelecao({ tarefas, itens }, hoje)
  })
}

/**
 * Desfaz mover/adiar/trazer: as tarefas voltam; as cópias somem e os originais voltam a
 * pendentes. Card criado pela cópia some se ficar vazio; card reaberto volta a arquivado.
 */
export async function desfazerAcao(resultado: ResultadoAcao) {
  const { copia } = resultado
  await restaurarPosicoes(resultado.anteriores)
  await db.transaction('rw', db.groupCards, db.groupItems, async () => {
    const momento = agora()
    await db.groupItems.bulkDelete(copia.itensCriados)
    await Promise.all(
      copia.itensTransferidos.map((id) =>
        db.groupItems.update(id, {
          status: 'pendente',
          transferidoParaCardId: undefined,
          atualizadoEm: momento,
        }),
      ),
    )
    for (const id of [...copia.cardsCriados, ...copia.cardsReabertos]) {
      const restantes = await db.groupItems
        .where('cardId')
        .equals(id)
        .filter((item) => item.status !== 'arquivado')
        .count()
      if (restantes > 0) continue
      if (copia.cardsCriados.includes(id)) await db.groupCards.delete(id)
      else await db.groupCards.update(id, { arquivado: true, atualizadoEm: momento })
    }
  })
}

/**
 * Converte a tarefa solta em item do card (mesmo id), na posição de `idsEmOrdem` (itens do
 * card já com ela) ou no fim. Subtarefas, anotação e anexos da tarefa não passam para o item.
 */
export async function colocarNoGrupo(tarefaId: string, cardId: string, idsEmOrdem?: string[]) {
  await db.transaction(
    'rw',
    [db.tasks, db.subtasks, db.notes, db.attachments, db.groupCards, db.groupItems],
    async () => {
      const [tarefa, card] = await Promise.all([db.tasks.get(tarefaId), db.groupCards.get(cardId)])
      if (!tarefa || !card || tarefa.status === 'arquivada') return
      const item: GroupItem = {
        id: tarefa.id,
        cardId,
        titulo: tarefa.titulo,
        ordem: (await maiorOrdemDoCard(cardId)) + 1,
        status: tarefa.status === 'concluida' ? 'concluido' : 'pendente',
        ...(tarefa.concluidaEm && { concluidoEm: tarefa.concluidaEm }),
        dataOriginal: tarefa.dataOriginal,
        criadoEm: tarefa.criadoEm,
        atualizadoEm: agora(),
      }
      const dono = [{ tipo: 'task' as const, id: tarefa.id }]
      await excluirAnexosDe(dono)
      await excluirNotasDe(dono)
      await db.subtasks.where('taskId').equals(tarefa.id).delete()
      await db.tasks.delete(tarefa.id)
      await db.groupItems.add(item)
      if (idsEmOrdem) await gravarNovaPosicao(db.groupItems, idsEmOrdem, item.id)
    },
  )
}

/**
 * Converte o item (pendente ou feito) em tarefa solta no dia do card (mesmo id), na posição
 * de `idsEmOrdemNoDia` (tarefas e cards já com ela) ou no fim do dia.
 */
export async function tirarDoGrupo(itemId: string, idsEmOrdemNoDia?: string[]) {
  await db.transaction('rw', db.tasks, db.groupCards, db.groupItems, async () => {
    const item = await db.groupItems.get(itemId)
    if (!item || (item.status !== 'pendente' && item.status !== 'concluido')) return
    const card = await db.groupCards.get(item.cardId)
    if (!card) return
    const tarefa: Task = {
      id: item.id,
      titulo: item.titulo,
      data: card.data,
      dataOriginal: item.dataOriginal,
      ordem: (await maiorOrdemDoDia(card.data)) + 1,
      status: item.status === 'concluido' ? 'concluida' : 'pendente',
      ...(item.concluidoEm && { concluidaEm: item.concluidoEm }),
      criadoEm: item.criadoEm,
      atualizadoEm: agora(),
    }
    await db.groupItems.delete(item.id)
    await db.tasks.add(tarefa)
    if (idsEmOrdemNoDia) await gravarNovaPosicao(tabelaDoDia, idsEmOrdemNoDia, tarefa.id)
  })
}

/** Passa o item para outro card do MESMO dia (outra série), na posição de `idsEmOrdem`. */
export async function passarItemParaCard(itemId: string, cardId: string, idsEmOrdem?: string[]) {
  await db.transaction('rw', db.groupCards, db.groupItems, async () => {
    const [item, card] = await Promise.all([db.groupItems.get(itemId), db.groupCards.get(cardId)])
    if (!item || !card || item.cardId === cardId) return
    await db.groupItems.update(itemId, {
      cardId,
      ordem: (await maiorOrdemDoCard(cardId)) + 1,
      atualizadoEm: agora(),
    })
    if (idsEmOrdem) await gravarNovaPosicao(db.groupItems, idsEmOrdem, itemId)
  })
}
