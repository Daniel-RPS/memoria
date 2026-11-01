import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { carregarConclusoes } from '@/db/repositories/estatisticas-repository'
import type { DataLocal } from '@/db/types'
import {
  calcularSequencias,
  contarPorDia,
  diaMaisProdutivo,
  faixasDeIntensidade,
  montarSemanasDoMapa,
  periodoDoMapa,
  rotulosDosMeses,
  totalNoPeriodo,
} from '@/lib/estatisticas'

/** Tudo o que o mapa de conclusões desenha, já calculado; `categoryId` filtra uma categoria. */
export function useMapaDeConclusoes(hoje: DataLocal, categoryId?: string) {
  const semanas = useMemo(() => montarSemanasDoMapa(hoje), [hoje])
  const { inicio, fim } = periodoDoMapa(semanas)
  const conclusoes = useLiveQuery(() => carregarConclusoes(inicio), [inicio])

  return useMemo(() => {
    const contagem = contarPorDia(conclusoes ?? [], categoryId)
    const valores = [...contagem]
      .filter(([data]) => data >= inicio && data <= fim)
      .map(([, quantidade]) => quantidade)
    return {
      semanas,
      meses: rotulosDosMeses(semanas),
      contagem,
      faixas: faixasDeIntensidade(valores),
      total: totalNoPeriodo(contagem, inicio, fim),
      sequencias: calcularSequencias(contagem, inicio, hoje),
      maisProdutivo: diaMaisProdutivo(contagem, inicio, fim),
      isCarregando: conclusoes === undefined,
    }
  }, [conclusoes, categoryId, semanas, inicio, fim, hoje])
}
