import { db } from '@/db/database'
import type { DadosDeNumeros } from '@/domain/numeros'

/**
 * Tudo o que a tela Dados › Números conta, numa leitura só (para `useLiveQuery`): tarefas soltas,
 * itens com os cards e séries (dia e categoria), categorias de grupo e os adiamentos.
 */
export async function carregarDadosDeNumeros(): Promise<DadosDeNumeros> {
  return db.transaction(
    'r',
    [db.tasks, db.groupItems, db.groupCards, db.groupSeries, db.categories, db.adiamentos],
    async () => {
      const [tarefas, itens, cards, series, categorias, adiamentos] = await Promise.all([
        db.tasks.toArray(),
        db.groupItems.toArray(),
        db.groupCards.toArray(),
        db.groupSeries.toArray(),
        db.categories.filter((categoria) => categoria.tipo === 'grupo').toArray(),
        db.adiamentos.toArray(),
      ])
      return { tarefas, itens, cards, series, categorias, adiamentos }
    },
  )
}
