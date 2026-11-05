import { db } from '@/db/database'
import type {
  DataLocal,
  GroupCard,
  GroupItem,
  GroupSeries,
  Subtask,
  Task,
  TimeSession,
} from '@/db/types'
import { excluirAnexosDe } from '@/db/repositories/attachment-repository'
import { soltarNotasSemAlvo, trocarVinculoDasNotas } from '@/db/repositories/note-repository'
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
import {
  atualizarCategoriaDasSessoesDoGrupo,
  atualizarGrupoDasSessoesDoItem,
  converterSessoesParaItem,
  converterSessoesParaTarefa,
  excluirOuFecharSessoesDosItens,
  fecharSessoesAbertasDe,
  restaurarSessoes,
} from '@/domain/tempo'
import { prioridadeDe, SEM_PRIORIDADE } from '@/domain/prioridade'
import { marcaDe, SEM_ANDAMENTO } from '@/lib/andamento'
import { somarDias } from '@/lib/datas'
import { ErroDeValidacao } from '@/lib/erros'
import { mesmoTituloDeSerie } from '@/lib/grupos'
import { destinoDoAdiamento } from '@/lib/mover'
import {
  inverterMudancas,
  planejarLevarItens,
  type EstadoDosGrupos,
  type MudancasDosGrupos,
} from '@/lib/mover-grupos'

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

/**
 * Cards visíveis de dias que já passaram que ainda têm itens pendentes, com séries e todos os
 * itens do card (os feitos entram no progresso "1/3").
 */
export async function listarGruposAtrasados(hoje: DataLocal) {
  const pendentes = await db.groupItems.where('status').equals('pendente').toArray()
  const idsCards = [...new Set(pendentes.map((item) => item.cardId))]
  const cards = (await db.groupCards.bulkGet(idsCards)).filter(
    (card): card is GroupCard => card !== undefined && !card.arquivado && card.data < hoje,
  )
  const idsSeries = [...new Set(cards.map((card) => card.seriesId))]
  const [series, itens] = await Promise.all([
    db.groupSeries.bulkGet(idsSeries),
    db.groupItems
      .where('cardId')
      .anyOf(cards.map((card) => card.id))
      .toArray(),
  ])
  return {
    cards,
    series: series.filter((serie): serie is GroupSeries => serie !== undefined),
    itens,
  }
}

/** Tabelas que excluir item ou card toca (as notas sem alvo viram avulsas). */
const TABELAS_DE_EXCLUSAO = [
  db.tasks,
  db.subtasks,
  db.groupSeries,
  db.groupCards,
  db.groupItems,
  db.notes,
  db.sessions,
]

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
      // Reaberto à mão: passa a ser um card do usuário (não some sozinho).
      const reaberto = {
        ...existente,
        arquivado: false,
        arquivadoEm: undefined,
        criadoPorTransferencia: false,
        ordem,
        atualizadoEm: momento,
      }
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
    const id = crypto.randomUUID()
    const item: GroupItem = {
      id,
      cadeiaId: id,
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

/** Como o card do dia estava antes de receber itens: desfazer depende disso. */
export type SituacaoDoCard = 'criado' | 'reaberto' | 'existente'

export interface ItensAdicionados {
  cardId: string
  seriesId: string
  data: DataLocal
  idsItens: string[]
  card: SituacaoDoCard
}

/**
 * Põe itens no card da série no dia: no fim do card que já existe; se ele estava arquivado,
 * reabre; se não há card, cria um no fim do dia (card do usuário, não some sozinho). Itens
 * nascem pendentes com `dataOriginal` = dia. Usada pela captura e pelo bloco Hoje do Início.
 */
export async function adicionarItensNaSerie(
  seriesId: string,
  data: DataLocal,
  titulos: string[],
): Promise<ItensAdicionados> {
  const preenchidos = titulos.map((titulo) => titulo.trim()).filter((titulo) => titulo !== '')
  if (preenchidos.length === 0) throw new ErroDeValidacao('Escreva um item.')
  return db.transaction(
    'rw',
    [db.tasks, db.groupSeries, db.groupCards, db.groupItems],
    async () => {
      if (!(await db.groupSeries.get(seriesId))) throw new Error('Grupo não encontrado.')
      const momento = agora()
      const existente = await cardDaSerieNoDia(seriesId, data)
      let card: GroupCard
      let situacao: SituacaoDoCard
      if (existente && !existente.arquivado) {
        card = existente
        situacao = 'existente'
      } else if (existente) {
        card = {
          ...existente,
          arquivado: false,
          arquivadoEm: undefined,
          criadoPorTransferencia: false,
          ordem: (await maiorOrdemDoDia(data)) + 1,
          atualizadoEm: momento,
        }
        await db.groupCards.put(card)
        situacao = 'reaberto'
      } else {
        card = novoCard(seriesId, data, (await maiorOrdemDoDia(data)) + 1)
        await db.groupCards.add(card)
        situacao = 'criado'
      }
      const idsItens: string[] = []
      for (const titulo of preenchidos) idsItens.push((await criarItem(card.id, titulo)).id)
      return { cardId: card.id, seriesId, data, idsItens, card: situacao }
    },
  )
}

/** Desfaz `adicionarItensNaSerie`: apaga os itens; card criado some, reaberto volta a arquivado. */
export async function desfazerItensAdicionados(resultado: ItensAdicionados) {
  await db.transaction('rw', TABELAS_DE_EXCLUSAO, async () => {
    await db.groupItems.bulkDelete(resultado.idsItens)
    await soltarNotasSemAlvo(resultado.idsItens.map((id) => ({ tipo: 'item', id })))
    if (resultado.card === 'criado') await excluirGrupo(resultado.cardId)
    else if (resultado.card === 'reaberto') await arquivarGrupo(resultado.cardId)
  })
}

/** Séries, cards e itens para escolher um grupo (ordem e busca em `lib/grupos`). */
/** Ids de todas as séries (para esquecer o estado lembrado das que deixaram de existir). */
export async function listarIdsDasSeries() {
  return (await db.groupSeries.toCollection().primaryKeys()) as string[]
}

export async function carregarSeriesParaEscolher() {
  const [series, cards, itens] = await Promise.all([
    db.groupSeries.toArray(),
    db.groupCards.toArray(),
    db.groupItems.toArray(),
  ])
  return { series, cards, itens }
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
  const momento = agora()
  await db.transaction('rw', [db.groupSeries, db.sessions], async () => {
    await db.groupSeries.update(seriesId, {
      categoryId: categoria.categoryId,
      subcategoryId: categoria.categoryId ? categoria.subcategoryId : undefined,
      atualizadoEm: momento,
    })
    await atualizarCategoriaDasSessoesDoGrupo(seriesId, categoria.categoryId, momento)
  })
}

export async function renomearItem(id: string, titulo: string) {
  await db.groupItems.update(id, { titulo: titulo.trim(), atualizadoEm: agora() })
}

/** Marca ou desmarca. Item transferido não muda (e a cópia nunca é afetada). */
export async function definirConclusaoItem(id: string, concluido: boolean) {
  await db.transaction('rw', [db.groupItems, db.sessions], async () => {
    const item = await db.groupItems.get(id)
    if (!item || item.status === 'transferido' || item.status === 'arquivado') return
    const momento = agora()
    await db.groupItems.update(
      id,
      concluido
        ? {
            status: 'concluido',
            concluidoEm: momento,
            concluidaPelasSubetapas: undefined,
            atualizadoEm: momento,
            ...SEM_ANDAMENTO,
            ...SEM_PRIORIDADE,
          }
        : {
            status: 'pendente',
            concluidoEm: undefined,
            concluidaPelasSubetapas: undefined,
            atualizadoEm: momento,
          },
    )
    if (concluido) {
      await fecharSessoesAbertasDe({ itens: [id], cadeias: [item.cadeiaId] }, momento)
    }
  })
}

/** Grava a nova posição de `idMovido` entre os itens do card (`idsEmOrdem` já reordenado). */
export async function reordenarItem(idsEmOrdem: string[], idMovido: string) {
  await db.transaction('rw', db.groupItems, () =>
    gravarNovaPosicao(db.groupItems, idsEmOrdem, idMovido),
  )
}

export async function arquivarItem(id: string) {
  const momento = agora()
  await db.transaction('rw', [db.groupItems, db.sessions], async () => {
    const item = await db.groupItems.get(id)
    await db.groupItems.update(id, {
      status: 'arquivado',
      arquivadoEm: momento,
      atualizadoEm: momento,
      ...SEM_ANDAMENTO,
    })
    await fecharSessoesAbertasDe(
      { itens: [id], ...(item ? { cadeias: [item.cadeiaId] } : {}) },
      momento,
    )
  })
}

/** Exclui o item. As notas da cadeia só viram avulsas se não sobrar nenhum item dela. */
export async function excluirItem(id: string) {
  await db.transaction('rw', TABELAS_DE_EXCLUSAO, async () => {
    const item = await db.groupItems.get(id)
    if (!item) return
    await db.groupItems.delete(id)
    await db.subtasks.where('taskId').equals(id).delete()
    await excluirOuFecharSessoesDosItens([item], agora())
    await soltarNotasSemAlvo([{ tipo: 'item', id: item.cadeiaId }])
  })
}

/**
 * Arquiva o card inteiro, com tudo o que há dentro: ele sai do calendário e aparece em
 * Arquivados. Os itens ficam como estão (desarquivar devolve o card igual), menos a marca de
 * "em andamento", que sai.
 */
export async function arquivarGrupo(cardId: string) {
  const momento = agora()
  await db.transaction('rw', [db.groupCards, db.groupItems, db.sessions], async () => {
    await db.groupCards.update(cardId, {
      arquivado: true,
      arquivadoEm: momento,
      atualizadoEm: momento,
    })
    const emAndamento = await db.groupItems
      .where('cardId')
      .equals(cardId)
      .filter((item) => item.emAndamento === true)
      .toArray()
    if (emAndamento.length > 0) {
      await db.groupItems
        .where('cardId')
        .equals(cardId)
        .filter((item) => item.emAndamento === true)
        .modify({ ...SEM_ANDAMENTO, atualizadoEm: momento })
      await fecharSessoesAbertasDe(
        {
          itens: emAndamento.map((i) => i.id),
          cadeias: emAndamento.map((i) => i.cadeiaId),
        },
        momento,
      )
    }
  })
}

/**
 * Exclusão definitiva do card e dos itens dele. A série some quando fica sem nenhum card.
 * Notas do grupo ou de itens que deixaram de existir viram avulsas (nunca são apagadas).
 */
export async function excluirGrupo(cardId: string) {
  await db.transaction('rw', TABELAS_DE_EXCLUSAO, async () => {
    const card = await db.groupCards.get(cardId)
    if (!card) return
    const itens = await db.groupItems.where('cardId').equals(cardId).toArray()
    await db.groupItems.where('cardId').equals(cardId).delete()
    await db.subtasks
      .where('taskId')
      .anyOf(itens.map((item) => item.id))
      .delete()
    await db.groupCards.delete(cardId)
    const restantes = await db.groupCards.where('seriesId').equals(card.seriesId).count()
    if (restantes === 0) await db.groupSeries.delete(card.seriesId)
    await excluirOuFecharSessoesDosItens(itens, agora())
    await soltarNotasSemAlvo([
      { tipo: 'grupo', id: card.seriesId },
      ...itens.map((item) => ({ tipo: 'item' as const, id: item.cadeiaId })),
    ])
  })
}

/** Resultado de mover tarefas soltas e levar itens de grupo numa ação só. */
export interface ResultadoAcao {
  tarefasMovidas: number
  /** Itens que ficaram pendentes no destino (copiados ou de volta ao card de antes). */
  itensLevados: number
  /** Dia e ordem das tarefas antes de mover. */
  anteriores: PosicaoAnterior[]
  /** Mudanças que restauram os grupos, na ordem em que devem ser aplicadas. */
  desfazer: MudancasDosGrupos[]
  /** Sessões abertas que foram fechadas ao transferir os itens. */
  sessoesFechadas?: TimeSession[]
}

function acaoVazia(): ResultadoAcao {
  return { tarefasMovidas: 0, itensLevados: 0, anteriores: [], desfazer: [] }
}

const TABELAS_DA_ACAO = [
  db.tasks,
  db.subtasks,
  db.groupSeries,
  db.groupCards,
  db.groupItems,
  db.sessions,
]

/**
 * Lê os registros que levar `ids` para `destino` pode tocar (ver `EstadoDosGrupos`): todos os
 * cards das séries envolvidas e do destino, os itens deles e as cadeias `origemItemId`.
 */
async function carregarEstado(ids: string[], destino: DataLocal): Promise<EstadoDosGrupos> {
  const cards = new Map<string, GroupCard>()
  const itens = new Map<string, GroupItem>()
  const seriesLidas = new Set<string>()
  const guardarItens = (lista: (GroupItem | undefined)[]) => {
    for (const item of lista) if (item) itens.set(item.id, item)
  }
  guardarItens(await db.groupItems.bulkGet(ids))
  for (const card of await db.groupCards.where('data').equals(destino).toArray()) {
    cards.set(card.id, card)
  }
  // Vai alargando até fechar: séries dos cards, itens dos cards e elos das cadeias.
  for (;;) {
    const cardsFaltando = [...itens.values()]
      .map((item) => item.cardId)
      .filter((id) => !cards.has(id))
    for (const card of await db.groupCards.bulkGet([...new Set(cardsFaltando)])) {
      if (card) cards.set(card.id, card)
    }
    const seriesNovas = [...new Set([...cards.values()].map((card) => card.seriesId))].filter(
      (id) => !seriesLidas.has(id),
    )
    for (const id of seriesNovas) seriesLidas.add(id)
    for (const card of await db.groupCards.where('seriesId').anyOf(seriesNovas).toArray()) {
      cards.set(card.id, card)
    }
    const antes = itens.size
    guardarItens(
      await db.groupItems
        .where('cardId')
        .anyOf([...cards.keys()])
        .toArray(),
    )
    const pais = [...itens.values()].flatMap((item) => item.origemItemId ?? [])
    guardarItens(await db.groupItems.bulkGet(pais.filter((id) => !itens.has(id))))
    guardarItens(
      await db.groupItems
        .where('origemItemId')
        .anyOf([...itens.keys()])
        .toArray(),
    )
    const isFechado =
      itens.size === antes && [...itens.values()].every((item) => cards.has(item.cardId))
    if (isFechado && seriesNovas.length === 0) break
  }
  const series = await db.groupSeries.bulkGet([...seriesLidas])
  const subtarefas: Subtask[] = await db.subtasks
    .where('taskId')
    .anyOf([...itens.keys()])
    .toArray()
  return {
    series: series.filter((serie): serie is GroupSeries => serie !== undefined),
    cards: [...cards.values()],
    itens: [...itens.values()],
    subtarefas,
  }
}

async function gravarMudancas({ gravar, apagar }: MudancasDosGrupos) {
  await db.subtasks.bulkDelete(apagar.subtarefas)
  await db.groupItems.bulkDelete(apagar.itens)
  await db.groupCards.bulkDelete(apagar.cards)
  await db.groupSeries.bulkDelete(apagar.series)
  await db.groupSeries.bulkPut(gravar.series)
  await db.groupCards.bulkPut(gravar.cards)
  await db.groupItems.bulkPut(gravar.itens)
  await db.subtasks.bulkPut(gravar.subtarefas)
}

/**
 * Leva itens pendentes para `destino` numa transação (regras em `planejarLevarItens`): copia
 * para o card da MESMA série no destino ou, se o item veio de lá, desfaz a transferência.
 */
export async function copiarItens(ids: string[], destino: DataLocal): Promise<ResultadoAcao> {
  return db.transaction('rw', TABELAS_DA_ACAO, async () => {
    const estado = await carregarEstado(ids, destino)
    const momento = agora()
    const plano = planejarLevarItens(estado, ids, destino, {
      momento,
      novoId: () => crypto.randomUUID(),
      maiorOrdemDoDestino: await maiorOrdemDoDia(destino),
    })
    await gravarMudancas(plano.mudancas)
    const emAndamentoAntes = estado.itens.filter((i) => i.emAndamento === true)
    const desligados = emAndamentoAntes.filter((antes) => {
      const gravado = plano.mudancas.gravar.itens.find((g) => g.id === antes.id)
      const apagado = plano.mudancas.apagar.itens.includes(antes.id)
      return apagado || (gravado !== undefined && !gravado.emAndamento)
    })
    const sessoesFechadas =
      desligados.length > 0
        ? await fecharSessoesAbertasDe(
            {
              itens: desligados.map((i) => i.id),
              cadeias: desligados.map((i) => i.cadeiaId),
            },
            momento,
          )
        : undefined
    return {
      ...acaoVazia(),
      itensLevados: plano.itensLevados,
      desfazer: [inverterMudancas(estado, plano.mudancas)],
      ...(sessoesFechadas && sessoesFechadas.length > 0 ? { sessoesFechadas } : {}),
    }
  })
}

async function pendentesDosCards(cardIds: string[]) {
  return db.groupItems
    .where('cardId')
    .anyOf(cardIds)
    .filter((item) => item.status === 'pendente')
    .sortBy('ordem')
}

/** Leva os pendentes dos cards para `destino`; o card original fica como registro. */
export async function copiarGrupos(cardIds: string[], destino: DataLocal) {
  return db.transaction('rw', TABELAS_DA_ACAO, async () =>
    copiarItens(
      (await pendentesDosCards(cardIds)).map((item) => item.id),
      destino,
    ),
  )
}

/** Leva itens (avulsos ou de cards inteiros) um dia adiante (ver `destinoDoAdiamento`). */
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
  const total = acaoVazia()
  const sessoesFechadas: TimeSession[] = []
  for (const [destino, ids] of porDestino) {
    const parcial = await copiarItens([...ids], destino)
    total.itensLevados += parcial.itensLevados
    // Desfazer na ordem contrária à que foi feito.
    total.desfazer.unshift(...parcial.desfazer)
    if (parcial.sessoesFechadas) sessoesFechadas.push(...parcial.sessoesFechadas)
  }
  if (sessoesFechadas.length > 0) total.sessoesFechadas = sessoesFechadas
  return total
}

/** O que foi escolhido para mover: tarefas soltas, cards inteiros e itens avulsos. */
export interface Selecionados {
  tarefas?: string[]
  grupos?: string[]
  itens?: string[]
}

/** Move as tarefas soltas e leva os itens pendentes (dos cards e avulsos) para `destino`. */
export async function moverSelecao(
  { tarefas = [], grupos = [], itens = [] }: Selecionados,
  destino: DataLocal,
): Promise<ResultadoAcao> {
  return db.transaction('rw', TABELAS_DA_ACAO, async () => {
    const movidas = await moverTarefas(tarefas, destino)
    const idsItens = [...(await pendentesDosCards(grupos)).map((item) => item.id), ...itens]
    const levados = await copiarItens([...new Set(idsItens)], destino)
    return { ...levados, tarefasMovidas: movidas.quantidade, anteriores: movidas.anteriores }
  })
}

/** Adia um dia: tarefas soltas são movidas; itens pendentes dos cards são levados. */
export async function adiarSelecao(
  { tarefas = [], grupos = [], itens = [] }: Selecionados,
  hoje: DataLocal,
): Promise<ResultadoAcao> {
  return db.transaction('rw', TABELAS_DA_ACAO, async () => {
    const movidas = await adiarTarefas(tarefas, hoje)
    const levados = await adiarItensECards(itens, grupos, hoje)
    return { ...levados, tarefasMovidas: movidas.quantidade, anteriores: movidas.anteriores }
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

/** Traz as tarefas soltas de ontem (move) e leva os pendentes dos cards de ontem para hoje. */
export async function trazerPendenciasDeOntem(hoje: DataLocal): Promise<ResultadoAcao> {
  return db.transaction('rw', TABELAS_DA_ACAO, async () => {
    const tarefas = (await listarPendenciasDeOntem(hoje)).map((tarefa) => tarefa.id)
    const itens = (await itensPendentesDeOntem(hoje)).map((item) => item.id)
    return moverSelecao({ tarefas, itens }, hoje)
  })
}

/**
 * Desfaz mover/adiar/trazer numa transação: as tarefas voltam ao dia e à ordem de antes e os
 * cards, itens e séries tocados voltam exatamente como estavam (os criados somem).
 */
export async function desfazerAcao(resultado: ResultadoAcao) {
  await db.transaction('rw', TABELAS_DA_ACAO, async () => {
    await restaurarPosicoes(resultado.anteriores)
    for (const mudancas of resultado.desfazer) await gravarMudancas(mudancas)
    await restaurarSessoes({ fechadas: resultado.sessoesFechadas })
  })
}

/**
 * Converte a tarefa solta em item do card (mesmo id, começa uma cadeia nova), na posição de
 * `idsEmOrdem` (itens do card já com ela) ou no fim. As notas e as subetapas passam para o item
 * (o id é o mesmo); os anexos da tarefa não passam.
 */
export async function colocarNoGrupo(tarefaId: string, cardId: string, idsEmOrdem?: string[]) {
  await db.transaction(
    'rw',
    [
      db.tasks,
      db.subtasks,
      db.notes,
      db.attachments,
      db.groupSeries,
      db.groupCards,
      db.groupItems,
      db.sessions,
    ],
    async () => {
      const [tarefa, card] = await Promise.all([db.tasks.get(tarefaId), db.groupCards.get(cardId)])
      if (!tarefa || !card || tarefa.status === 'arquivada') return
      const momento = agora()
      const serie = await db.groupSeries.get(card.seriesId)
      const item: GroupItem = {
        id: tarefa.id,
        cadeiaId: tarefa.id,
        cardId,
        titulo: tarefa.titulo,
        ordem: (await maiorOrdemDoCard(cardId)) + 1,
        status: tarefa.status === 'concluida' ? 'concluido' : 'pendente',
        ...(tarefa.concluidaEm && { concluidoEm: tarefa.concluidaEm }),
        ...marcaDe(tarefa),
        ...(tarefa.concluidaPelasSubetapas && { concluidaPelasSubetapas: true }),
        ...prioridadeDe(tarefa),
        dataOriginal: tarefa.dataOriginal,
        criadoEm: tarefa.criadoEm,
        atualizadoEm: momento,
      }
      await excluirAnexosDe([{ tipo: 'task' as const, id: tarefa.id }])
      await trocarVinculoDasNotas(
        { tipo: 'tarefa', id: tarefa.id },
        { tipo: 'item', id: tarefa.id },
      )
      await converterSessoesParaItem(tarefa.id, card, serie, momento)
      await db.tasks.delete(tarefa.id)
      await db.groupItems.add(item)
      if (idsEmOrdem) await gravarNovaPosicao(db.groupItems, idsEmOrdem, item.id)
    },
  )
}

/**
 * Converte o item (pendente ou feito) em tarefa solta no dia do card (mesmo id), na posição
 * de `idsEmOrdemNoDia` (tarefas e cards já com ela) ou no fim do dia. As notas da cadeia vão
 * com ele (os registros "transferido" de outros dias deixam de mostrá-las).
 */
export async function tirarDoGrupo(itemId: string, idsEmOrdemNoDia?: string[]) {
  await db.transaction(
    'rw',
    [db.tasks, db.groupCards, db.groupItems, db.notes, db.sessions],
    async () => {
      const item = await db.groupItems.get(itemId)
      if (!item || (item.status !== 'pendente' && item.status !== 'concluido')) return
      const card = await db.groupCards.get(item.cardId)
      if (!card) return
      const momento = agora()
      const tarefa: Task = {
        id: item.id,
        titulo: item.titulo,
        data: card.data,
        dataOriginal: item.dataOriginal,
        ordem: (await maiorOrdemDoDia(card.data)) + 1,
        status: item.status === 'concluido' ? 'concluida' : 'pendente',
        ...(item.concluidoEm && { concluidaEm: item.concluidoEm }),
        ...marcaDe(item),
        ...(item.concluidaPelasSubetapas && { concluidaPelasSubetapas: true }),
        ...prioridadeDe(item),
        criadoEm: item.criadoEm,
        atualizadoEm: momento,
      }
      await db.groupItems.delete(item.id)
      await db.tasks.add(tarefa)
      await converterSessoesParaTarefa(item, momento)
      await trocarVinculoDasNotas(
        { tipo: 'item', id: item.cadeiaId },
        { tipo: 'tarefa', id: tarefa.id },
      )
      if (idsEmOrdemNoDia) await gravarNovaPosicao(tabelaDoDia, idsEmOrdemNoDia, tarefa.id)
    },
  )
}

/** Passa o item para outro card do MESMO dia (outra série), na posição de `idsEmOrdem`. */
export async function passarItemParaCard(itemId: string, cardId: string, idsEmOrdem?: string[]) {
  await db.transaction(
    'rw',
    [db.groupSeries, db.groupCards, db.groupItems, db.sessions],
    async () => {
      const [item, card] = await Promise.all([db.groupItems.get(itemId), db.groupCards.get(cardId)])
      if (!item || !card || item.cardId === cardId) return
      const momento = agora()
      const serie = await db.groupSeries.get(card.seriesId)
      await db.groupItems.update(itemId, {
        cardId,
        ordem: (await maiorOrdemDoCard(cardId)) + 1,
        atualizadoEm: momento,
      })
      await atualizarGrupoDasSessoesDoItem(item, card, serie, momento)
      if (idsEmOrdem) await gravarNovaPosicao(db.groupItems, idsEmOrdem, itemId)
    },
  )
}
