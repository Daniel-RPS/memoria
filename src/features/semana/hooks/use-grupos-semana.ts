import { createContext, useContext, useState } from 'react'
import type { DataLocal } from '@/db/types'
import {
  alternarCardNaSemana,
  chaveCardSemana,
  definirTodosCardsNaSemana,
  isCardAbertoNaSemana,
} from '@/domain/grupos-semana'

export interface CardIdentificado {
  serieId: string
  data: DataLocal
}

export interface GruposSemanaContexto {
  isAberto: (serieId: string, data: DataLocal) => boolean
  handleAlternar: (serieId: string, data: DataLocal) => void
  handleAbrir: (serieId: string, data: DataLocal) => void
  isTudoAberto: boolean
  isTudoRecolhido: boolean
  handleExpandirTudo: () => void
  handleRecolherTudo: () => void
}

export const ContextoGruposSemana = createContext<GruposSemanaContexto | null>(null)

/**
 * Estado aberto/recolhido dos cards na Semana:
 * Mantido em memória durante a visita, com base por card (`${serieId}:${data}`).
 * Padrão: grupos de hoje abertos, grupos dos demais dias recolhidos.
 */
export function useGruposSemana(cards: CardIdentificado[], hoje: DataLocal): GruposSemanaContexto {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})

  const isAberto = (serieId: string, data: DataLocal) =>
    isCardAbertoNaSemana(overrides, serieId, data, hoje)

  const handleAlternar = (serieId: string, data: DataLocal) => {
    setOverrides((atuais) => alternarCardNaSemana(atuais, serieId, data, hoje))
  }

  const handleAbrir = (serieId: string, data: DataLocal) => {
    setOverrides((atuais) => ({ ...atuais, [chaveCardSemana(serieId, data)]: true }))
  }

  const handleExpandirTudo = () => {
    setOverrides(definirTodosCardsNaSemana(cards, true))
  }

  const handleRecolherTudo = () => {
    setOverrides(definirTodosCardsNaSemana(cards, false))
  }

  const totalCards = cards.length
  const totalAbertos = cards.filter((card) => isAberto(card.serieId, card.data)).length

  return {
    isAberto,
    handleAlternar,
    handleAbrir,
    isTudoAberto: totalCards > 0 && totalAbertos === totalCards,
    isTudoRecolhido: totalAbertos === 0,
    handleExpandirTudo,
    handleRecolherTudo,
  }
}

/** Estado de um card de grupo na Semana. */
export function useGrupoNaSemana(serieId: string, data: DataLocal) {
  const contexto = useContext(ContextoGruposSemana)
  return {
    isAberto: contexto ? contexto.isAberto(serieId, data) : true,
    handleAlternar: () => contexto?.handleAlternar(serieId, data),
    isRecolhivel: contexto !== null,
  }
}
