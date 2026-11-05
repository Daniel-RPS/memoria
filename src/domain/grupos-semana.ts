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
  return overrides[chave] ?? defaultGroupExpanded(data, hoje)
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
