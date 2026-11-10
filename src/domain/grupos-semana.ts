import type { DataLocal } from '@/db/types'

/**
 * Regra pura de abertura padrão de um grupo na visão Semana:
 * Só o card da data de hoje abre expandido por padrão; os demais dias abrem recolhidos.
 */
export function defaultGroupExpanded(dataDoCard: DataLocal, hoje: DataLocal): boolean {
  return dataDoCard === hoje
}

/**
 * Chave única de estado de um card na visão Semana: combinação da série com a data do card.
 */
export function chaveCardSemana(serieId: string, data: DataLocal): string {
  return `${serieId}:${data}`
}

/**
 * Determina se o card está aberto na Semana considerando os toggles manuais da visita
 * e a regra padrão.
 */
export function isCardAbertoNaSemana(
  overrides: Record<string, boolean>,
  serieId: string,
  data: DataLocal,
  hoje: DataLocal,
): boolean {
  const chave = chaveCardSemana(serieId, data)
  return resolveGroupExpanded(overrides[chave], data, hoje)
}

/**
 * Alterna o estado de um card na Semana e devolve os novos overrides.
 */
export function alternarCardNaSemana(
  overrides: Record<string, boolean>,
  serieId: string,
  data: DataLocal,
  hoje: DataLocal,
): Record<string, boolean> {
  const chave = chaveCardSemana(serieId, data)
  const atual = isCardAbertoNaSemana(overrides, serieId, data, hoje)
  return { ...overrides, [chave]: !atual }
}

/**
 * Define o estado de todos os cards da Semana (para expandir tudo / recolher tudo).
 */
export function definirTodosCardsNaSemana(
  cards: Array<{ serieId: string; data: DataLocal }>,
  aberto: boolean,
): Record<string, boolean> {
  const novosOverrides: Record<string, boolean> = {}
  for (const card of cards) {
    novosOverrides[chaveCardSemana(card.serieId, card.data)] = aberto
  }
  return novosOverrides
}

/**
 * Decide se um card da Semana abre: vale a escolha salva do usuário; sem escolha, a regra
 * padrão (aberto só se é de hoje). O padrão nunca é gravado.
 */
export function resolveGroupExpanded(
  estadoSalvo: boolean | undefined,
  dataDoCard: DataLocal,
  hoje: DataLocal,
): boolean {
  return estadoSalvo ?? defaultGroupExpanded(dataDoCard, hoje)
}

/** Remove os estados salvos de cards que não existem mais (devolve o mesmo objeto se nada mudou). */
export function podarEstadosDeCards(
  salvos: Record<string, boolean>,
  cardsExistentes: Array<{ serieId: string; data: DataLocal }>,
): Record<string, boolean> {
  const existentes = new Set(
    cardsExistentes.map((card) => chaveCardSemana(card.serieId, card.data)),
  )
  const chaves = Object.keys(salvos)
  if (chaves.every((chave) => existentes.has(chave))) return salvos
  return Object.fromEntries(
    chaves.filter((chave) => existentes.has(chave)).map((chave) => [chave, salvos[chave]]),
  )
}
