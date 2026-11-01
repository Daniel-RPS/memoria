import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { carregarSeriesParaEscolher } from '@/db/repositories/group-repository'
import type { DataLocal } from '@/db/types'
import { ordenarParaEscolher, type SerieParaEscolher } from '@/lib/grupos'

const NENHUMA: SerieParaEscolher[] = []

/** Grupos (séries) para "Em grupo…", usados recentemente primeiro, com o card no `data`. */
export function useSeriesParaEscolher(data: DataLocal) {
  const carregado = useLiveQuery(carregarSeriesParaEscolher, [])
  return useMemo(
    () =>
      carregado
        ? ordenarParaEscolher(carregado.series, carregado.cards, carregado.itens, data)
        : NENHUMA,
    [carregado, data],
  )
}
