import { db } from '@/db/database'
import type { DataLocal } from '@/db/types'
import { listarConclusoes } from '@/lib/estatisticas'

/**
 * Conclusões (tarefas soltas e itens de grupo) a partir de `inicio`, para o mapa do Início.
 * O corte é feito depois de converter o momento da conclusão para o dia local.
 */
export async function carregarConclusoes(inicio: DataLocal) {
  const [tarefas, itens] = await Promise.all([
    db.tasks.where('status').equals('concluida').toArray(),
    db.groupItems.where('status').equals('concluido').toArray(),
  ])
  const idsCards = [...new Set(itens.map((item) => item.cardId))]
  const cards = (await db.groupCards.bulkGet(idsCards)).filter((card) => card !== undefined)
  const idsSeries = [...new Set(cards.map((card) => card.seriesId))]
  const series = (await db.groupSeries.bulkGet(idsSeries)).filter((serie) => serie !== undefined)
  return listarConclusoes(tarefas, itens, cards, series).filter(
    (conclusao) => conclusao.data >= inicio,
  )
}
