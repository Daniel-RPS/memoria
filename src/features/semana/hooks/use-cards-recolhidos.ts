import { createContext, useContext } from 'react'

/** Escopo do `useSecoesRecolhidas` na Semana: ids dos cards (um por grupo e dia). */
export const ESCOPO_CARDS_DA_SEMANA = 'semana:cards'

interface CardsRecolhidos {
  isAberta: (id: string) => boolean
  handleAlternar: (id: string) => void
}

/** Quais cards da Semana estão recolhidos (dado pela `SemanaPage`, lido por cada card). */
export const ContextoCardsRecolhidos = createContext<CardsRecolhidos | null>(null)

/** Estado de um card: sem a Semana em volta (ex.: em teste isolado), sempre aberto. */
export function useCardRecolhido(cardId: string) {
  const contexto = useContext(ContextoCardsRecolhidos)
  return {
    isAberto: contexto?.isAberta(cardId) ?? true,
    handleAlternar: () => contexto?.handleAlternar(cardId),
    isRecolhivel: contexto !== null,
  }
}
