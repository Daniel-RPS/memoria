import type { DataLocal, GroupCard, GroupItem, GroupSeries } from '@/db/types'

/**
 * Regras de levar itens de grupo para outro dia, sem banco: recebem o estado dos registros
 * envolvidos e devolvem as mudanças. O repositório só lê o estado, grava as mudanças numa
 * transação e guarda o inverso para o "Desfazer".
 */

/**
 * Registros que a movimentação pode ler ou mudar: TODOS os cards das séries envolvidas (para
 * saber se uma série esvaziou), os itens deles e os das cadeias `origemItemId` dos levados.
 */
export interface EstadoDosGrupos {
  series: GroupSeries[]
  cards: GroupCard[]
  itens: GroupItem[]
}

/** O que gravar (`put`) e o que apagar, por tabela. */
export interface MudancasDosGrupos {
  gravar: { cards: GroupCard[]; itens: GroupItem[]; series: GroupSeries[] }
  apagar: { cards: string[]; itens: string[]; series: string[] }
}

export interface PlanoDeLevar {
  mudancas: MudancasDosGrupos
  /** Itens que passaram a estar pendentes no destino (cópias novas + reativados). */
  itensLevados: number
}

export interface ContextoDeLevar {
  /** Momento gravado em `criadoEm`/`atualizadoEm`. */
  momento: string
  /** Gera os ids dos registros novos (no app, `crypto.randomUUID`). */
  novoId: () => string
  /** Maior `ordem` entre tarefas soltas e cards do destino (card novo entra no fim). */
  maiorOrdemDoDestino: number
}

/** Só item pendente ou feito conta como item "de verdade" no card. */
function isItemReal(item: GroupItem) {
  return item.status === 'pendente' || item.status === 'concluido'
}

/** Mudanças vazias. */
export function semMudancas(): MudancasDosGrupos {
  return {
    gravar: { cards: [], itens: [], series: [] },
    apagar: { cards: [], itens: [], series: [] },
  }
}

/**
 * Leva os itens pendentes de `ids` para `destino`, numa operação só:
 * - Se o item tem um ancestral (cadeia `origemItemId`) transferido num card do destino, é a
 *   volta de uma transferência: o ancestral volta a pendente e a cópia (com as paradas
 *   intermediárias da cadeia) é apagada. Nada novo é criado.
 * - Senão, é copiado para o card da MESMA série no destino (mescla se existir, cria se não),
 *   na ordem de origem; o original fica como `transferido`.
 * Card criado por transferência que perde itens e fica sem nenhum pendente ou feito é apagado
 * (e a série, se ficar sem card). Card criado à mão nunca é apagado aqui.
 */
export function planejarLevarItens(
  estado: EstadoDosGrupos,
  ids: string[],
  destino: DataLocal,
  contexto: ContextoDeLevar,
): PlanoDeLevar {
  const { momento, novoId } = contexto
  const cards = new Map(estado.cards.map((card) => [card.id, { ...card }]))
  const itens = new Map(estado.itens.map((item) => [item.id, { ...item }]))
  const cardsMudados = new Set<string>()
  const itensMudados = new Set<string>()
  const itensApagados = new Set<string>()
  /** Cards que perderam itens apagados: candidatos a card fantasma. */
  const cardsQuePerderam = new Set<string>()
  let maiorOrdemDoDia = contexto.maiorOrdemDoDestino
  let itensLevados = 0

  const cardDe = (item: GroupItem) => cards.get(item.cardId)
  const mudarItem = (item: GroupItem, campos: Partial<GroupItem>) => {
    Object.assign(item, campos, { atualizadoEm: momento })
    itensMudados.add(item.id)
  }

  /**
   * Tira um item transferido da cadeia sem quebrá-la: o pai passa a apontar para o card do
   * filho e o filho passa a vir do pai.
   */
  function apagarDaCadeia(item: GroupItem) {
    const pai = item.origemItemId ? itens.get(item.origemItemId) : undefined
    const filho = [...itens.values()].find((outro) => outro.origemItemId === item.id)
    if (filho) mudarItem(filho, { origemItemId: pai?.id })
    if (pai?.status === 'transferido' && filho) {
      mudarItem(pai, { transferidoParaCardId: filho.cardId })
    }
    apagarItem(item)
  }

  function apagarItem(item: GroupItem) {
    itens.delete(item.id)
    itensApagados.add(item.id)
    itensMudados.delete(item.id)
    cardsQuePerderam.add(item.cardId)
  }

  /** Ancestral transferido num card do destino e as paradas entre ele e o item. */
  function ancestralNoDestino(item: GroupItem) {
    const paradas: GroupItem[] = []
    const vistos = new Set([item.id])
    let atual = item
    while (atual.origemItemId && !vistos.has(atual.origemItemId)) {
      const pai = itens.get(atual.origemItemId)
      if (!pai) return undefined
      vistos.add(pai.id)
      if (pai.status === 'transferido' && cardDe(pai)?.data === destino) {
        return { ancestral: pai, paradas }
      }
      if (pai.status !== 'transferido') return undefined
      paradas.push(pai)
      atual = pai
    }
    return undefined
  }

  /** Card da série no destino: o que existe (reaberto se arquivado) ou um novo. */
  function cardDeDestino(seriesId: string) {
    const existente = [...cards.values()].find(
      (card) => card.seriesId === seriesId && card.data === destino,
    )
    if (existente) {
      if (existente.arquivado) {
        Object.assign(existente, { arquivado: false, atualizadoEm: momento })
        cardsMudados.add(existente.id)
      }
      return existente
    }
    maiorOrdemDoDia += 1
    const card: GroupCard = {
      id: novoId(),
      seriesId,
      data: destino,
      ordem: maiorOrdemDoDia,
      arquivado: false,
      criadoPorTransferencia: true,
      criadoEm: momento,
      atualizadoEm: momento,
    }
    cards.set(card.id, card)
    cardsMudados.add(card.id)
    return card
  }

  const maiorOrdemDoCard = (cardId: string) =>
    Math.max(0, ...[...itens.values()].filter((i) => i.cardId === cardId).map((i) => i.ordem))

  const aLevar = [...new Set(ids)]
    .map((id) => itens.get(id))
    .filter((item): item is GroupItem => {
      const card = item && cardDe(item)
      return item?.status === 'pendente' && card !== undefined && card.data !== destino
    })
    .sort((a, b) => {
      const dataA = cardDe(a)!.data
      const dataB = cardDe(b)!.data
      return dataA === dataB ? a.ordem - b.ordem : dataA.localeCompare(dataB)
    })

  for (const item of aLevar) {
    const volta = ancestralNoDestino(item)
    if (volta) {
      const { ancestral } = volta
      mudarItem(ancestral, { status: 'pendente', transferidoParaCardId: undefined })
      const cardDoAncestral = cardDe(ancestral)!
      if (cardDoAncestral.arquivado) {
        Object.assign(cardDoAncestral, { arquivado: false, atualizadoEm: momento })
        cardsMudados.add(cardDoAncestral.id)
      }
      // A cópia e as paradas entre ela e o ancestral somem juntas: a cadeia toda era só ida.
      apagarItem(item)
      for (const parada of volta.paradas) apagarItem(parada)
      itensLevados += 1
      continue
    }
    const alvo = cardDeDestino(cardDe(item)!.seriesId)
    const copia: GroupItem = {
      id: novoId(),
      cardId: alvo.id,
      titulo: item.titulo,
      ordem: maiorOrdemDoCard(alvo.id) + 1,
      status: 'pendente',
      origemItemId: item.id,
      dataOriginal: item.dataOriginal,
      criadoEm: momento,
      atualizadoEm: momento,
    }
    itens.set(copia.id, copia)
    itensMudados.add(copia.id)
    mudarItem(item, { status: 'transferido', transferidoParaCardId: alvo.id })
    itensLevados += 1
  }

  // Card fantasma: criado por transferência, perdeu itens e não tem mais nenhum real.
  const cardsApagados = new Set<string>()
  for (const cardId of cardsQuePerderam) {
    const card = cards.get(cardId)
    if (!card?.criadoPorTransferencia) continue
    const restantes = [...itens.values()].filter((item) => item.cardId === cardId)
    if (restantes.some(isItemReal)) continue
    for (const item of restantes) {
      if (item.status === 'transferido') apagarDaCadeia(item)
      else apagarItem(item)
    }
    cards.delete(cardId)
    cardsMudados.delete(cardId)
    cardsApagados.add(cardId)
  }
  // Etiqueta "transferido para" não pode apontar para card que sumiu.
  for (const item of itens.values()) {
    if (item.transferidoParaCardId && cardsApagados.has(item.transferidoParaCardId)) {
      mudarItem(item, { transferidoParaCardId: undefined })
    }
  }

  // O estado traz todos os cards de cada série envolvida, então dá para saber se ela esvaziou.
  const seriesApagadas = [
    ...new Set(estado.cards.filter((c) => cardsApagados.has(c.id)).map((c) => c.seriesId)),
  ].filter((seriesId) => ![...cards.values()].some((card) => card.seriesId === seriesId))

  return {
    itensLevados,
    mudancas: {
      gravar: {
        cards: [...cardsMudados].map((id) => cards.get(id)!),
        itens: [...itensMudados].filter((id) => itens.has(id)).map((id) => itens.get(id)!),
        series: [],
      },
      apagar: {
        cards: [...cardsApagados].filter((id) => estado.cards.some((card) => card.id === id)),
        itens: [...itensApagados].filter((id) => estado.itens.some((item) => item.id === id)),
        series: seriesApagadas,
      },
    },
  }
}

/**
 * Mudanças que voltam ao `estado` de antes: o que foi gravado volta à versão anterior (ou é
 * apagado, se era novo) e o que foi apagado é regravado.
 */
export function inverterMudancas(
  estado: EstadoDosGrupos,
  mudancas: MudancasDosGrupos,
): MudancasDosGrupos {
  const inverso = semMudancas()
  const reverter = <T extends { id: string }>(
    antes: T[],
    gravados: T[],
    apagados: string[],
    gravar: T[],
    apagar: string[],
  ) => {
    const porId = new Map(antes.map((registro) => [registro.id, registro]))
    for (const registro of gravados) {
      const anterior = porId.get(registro.id)
      if (anterior) gravar.push(anterior)
      else apagar.push(registro.id)
    }
    for (const id of apagados) {
      const anterior = porId.get(id)
      if (anterior) gravar.push(anterior)
    }
  }
  reverter(
    estado.cards,
    mudancas.gravar.cards,
    mudancas.apagar.cards,
    inverso.gravar.cards,
    inverso.apagar.cards,
  )
  reverter(
    estado.itens,
    mudancas.gravar.itens,
    mudancas.apagar.itens,
    inverso.gravar.itens,
    inverso.apagar.itens,
  )
  reverter(
    estado.series,
    mudancas.gravar.series,
    mudancas.apagar.series,
    inverso.gravar.series,
    inverso.apagar.series,
  )
  return inverso
}

/** O estado depois das mudanças (para encadear movimentações sem banco). */
export function aplicarMudancas(
  estado: EstadoDosGrupos,
  mudancas: MudancasDosGrupos,
): EstadoDosGrupos {
  const aplicar = <T extends { id: string }>(antes: T[], gravar: T[], apagar: string[]) => {
    const porId = new Map(antes.map((registro) => [registro.id, registro]))
    for (const id of apagar) porId.delete(id)
    for (const registro of gravar) porId.set(registro.id, registro)
    return [...porId.values()]
  }
  return {
    series: aplicar(estado.series, mudancas.gravar.series, mudancas.apagar.series),
    cards: aplicar(estado.cards, mudancas.gravar.cards, mudancas.apagar.cards),
    itens: aplicar(estado.itens, mudancas.gravar.itens, mudancas.apagar.itens),
  }
}
