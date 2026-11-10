import { createContext, useContext, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { z } from 'zod'
import { gravarPreferencia, lerPreferencia } from '@/app/preferencia-local'
import { listarSeriesEDatasDosCards } from '@/db/repositories/group-repository'
import type { DataLocal } from '@/db/types'
import {
  chaveCardSemana,
  definirTodosCardsNaSemana,
  podarEstadosDeCards,
  resolveGroupExpanded,
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

/** Escolhas do usuário (abrir/recolher) por card da Semana, `${serieId}:${data}` → aberto. */
const CHAVE_CARDS_DA_SEMANA = 'memoria:semana:cards-abertos'
const esquemaEstados = z.record(z.string(), z.boolean())

function lerEstadosSalvos(): Record<string, boolean> {
  const texto = lerPreferencia(CHAVE_CARDS_DA_SEMANA)
  if (!texto) return {}
  try {
    const resultado = esquemaEstados.safeParse(JSON.parse(texto))
    return resultado.success ? resultado.data : {}
  } catch {
    return {}
  }
}

/**
 * Estado aberto/recolhido dos cards na Semana, por card (série + data):
 * a escolha do usuário fica salva no navegador e vale entre visitas, semanas e dias;
 * sem escolha, vale o padrão (aberto só hoje). A abertura automática ao soltar um item
 * num card recolhido vale só nesta visita e não é gravada.
 */
export function useGruposSemana(cards: CardIdentificado[], hoje: DataLocal): GruposSemanaContexto {
  const [salvos, setSalvos] = useState<Record<string, boolean>>(lerEstadosSalvos)
  const [automaticos, setAutomaticos] = useState<Record<string, boolean>>({})
  const cardsExistentes = useLiveQuery(() => listarSeriesEDatasDosCards(), [])

  // Grava só as escolhas de cards que ainda existem (os apagados são esquecidos).
  useEffect(() => {
    const vivos = cardsExistentes ? podarEstadosDeCards(salvos, cardsExistentes) : salvos
    gravarPreferencia(CHAVE_CARDS_DA_SEMANA, JSON.stringify(vivos))
  }, [salvos, cardsExistentes])

  const isAberto = (serieId: string, data: DataLocal) => {
    const chave = chaveCardSemana(serieId, data)
    return automaticos[chave] ?? resolveGroupExpanded(salvos[chave], data, hoje)
  }

  /** Grava a escolha do usuário e descarta a abertura automática desses cards. */
  function gravarEscolha(novos: Record<string, boolean>) {
    setSalvos((atuais) => ({ ...atuais, ...novos }))
    setAutomaticos((atuais) => {
      const restantes = { ...atuais }
      for (const chave of Object.keys(novos)) delete restantes[chave]
      return restantes
    })
  }

  const handleAlternar = (serieId: string, data: DataLocal) => {
    gravarEscolha({ [chaveCardSemana(serieId, data)]: !isAberto(serieId, data) })
  }

  const handleAbrir = (serieId: string, data: DataLocal) => {
    setAutomaticos((atuais) => ({ ...atuais, [chaveCardSemana(serieId, data)]: true }))
  }

  const handleExpandirTudo = () => gravarEscolha(definirTodosCardsNaSemana(cards, true))
  const handleRecolherTudo = () => gravarEscolha(definirTodosCardsNaSemana(cards, false))

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
