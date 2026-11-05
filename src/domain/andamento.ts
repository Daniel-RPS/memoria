import type { DataLocal, GroupCard, GroupItem, GroupSeries, Task } from '@/db/types'

/** Grupo com itens atualmente em andamento. */
export interface GrupoEmAndamento {
  seriesId: string
  nome: string
  quantidade: number
}

/**
 * Resumo dos itens e tarefas soltas que estão em andamento agora.
 * Retorna dados estruturados puros; o componente é responsável pela apresentação.
 */
export interface ResumoDeAndamento {
  /** Grupos que possuem pelo menos 1 item em andamento. */
  grupos: GrupoEmAndamento[]
  /** Quantidade de tarefas soltas em andamento. */
  soltas: number
  /** Total de itens em andamento + tarefas soltas em andamento. */
  total: number
  /**
   * Data para o link "Ver no dia →". Dá preferência a `hoje` se houver itens/tarefas nele,
   * ou ao dia mais antigo com algo em andamento. `null` se não houver nada em andamento.
   */
  diaDestino: DataLocal | null
}

export interface DadosParaResumoDeAndamento {
  tarefas: Pick<Task, 'id' | 'status' | 'emAndamento' | 'data'>[]
  itens: Pick<GroupItem, 'id' | 'cardId' | 'status' | 'emAndamento'>[]
  cards: Pick<GroupCard, 'id' | 'seriesId' | 'data'>[]
  series: Pick<GroupSeries, 'id' | 'titulo'>[]
  hoje?: DataLocal
}

/**
 * Agrupa e contabiliza tudo o que está em andamento (tarefas soltas e itens de grupo pendentes).
 * Registros que não estão em andamento ou que não estão pendentes são ignorados.
 */
export function montarResumoDeAndamento({
  tarefas,
  itens,
  cards,
  series,
  hoje,
}: DadosParaResumoDeAndamento): ResumoDeAndamento {
  const tarefasEmAndamento = tarefas.filter(
    (t) => t.status === 'pendente' && t.emAndamento === true,
  )

  const itensEmAndamento = itens.filter((i) => i.status === 'pendente' && i.emAndamento === true)

  const cardsMap = new Map(cards.map((c) => [c.id, c]))
  const seriesMap = new Map(series.map((s) => [s.id, s]))

  const contagemPorSerie = new Map<string, { nome: string; quantidade: number }>()
  const datasEmAndamento: DataLocal[] = []

  for (const t of tarefasEmAndamento) {
    if (t.data) datasEmAndamento.push(t.data)
  }

  for (const item of itensEmAndamento) {
    const card = cardsMap.get(item.cardId)
    if (card?.data) datasEmAndamento.push(card.data)

    const seriesId = card?.seriesId ?? ''
    const serie = seriesMap.get(seriesId)
    const nome = serie?.titulo?.trim() || 'Sem título'

    const atual = contagemPorSerie.get(seriesId)
    if (atual) {
      atual.quantidade += 1
    } else {
      contagemPorSerie.set(seriesId, { nome, quantidade: 1 })
    }
  }

  const grupos: GrupoEmAndamento[] = Array.from(contagemPorSerie.entries())
    .map(([seriesId, { nome, quantidade }]) => ({
      seriesId,
      nome,
      quantidade,
    }))
    .filter((g) => g.quantidade > 0)

  const soltas = tarefasEmAndamento.length
  const total = itensEmAndamento.length + soltas

  let diaDestino: DataLocal | null = null
  if (datasEmAndamento.length > 0) {
    if (hoje && datasEmAndamento.includes(hoje)) {
      diaDestino = hoje
    } else {
      // Ordena para pegar o dia mais antigo
      const datasOrdenadas = [...datasEmAndamento].sort()
      diaDestino = datasOrdenadas[0] ?? null
    }
  }

  return {
    grupos,
    soltas,
    total,
    diaDestino,
  }
}

/** Alias em inglês conforme sugestão das especificações. */
export const buildInProgressSummary = montarResumoDeAndamento
