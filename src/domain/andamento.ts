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

/* ============================================================================
 * "Em andamento" só vale para HOJE (America/Sao_Paulo). Tarefa solta vale pelo próprio `data`;
 * item de grupo, pela data do CARD. Na virada do dia, o que ficou em andamento num dia que
 * deixou de ser hoje é parado, e a sessão do tempo fecha às 23:59:59 do dia em que começou.
 * ========================================================================== */

/** Pode MARCAR como em andamento: pendente, sem marca, e o dia (do card, no item) é hoje. */
export function podeMarcarAndamento(
  registro: Pick<Task | GroupItem, 'status' | 'emAndamento'>,
  dia: DataLocal,
  hoje: DataLocal,
) {
  return registro.status === 'pendente' && registro.emAndamento !== true && dia === hoje
}

/** Na seleção múltipla, "Em andamento" só aparece se TODAS forem de hoje. */
export function todasSaoDeHoje(dias: DataLocal[], hoje: DataLocal) {
  return dias.length > 0 && dias.every((dia) => dia === hoje)
}

/**
 * Fim da sessão parada pela virada do dia: 23:59:59 do dia local em que ela começou, ou `agora`,
 * o que vier primeiro.
 */
export function fimDaSessaoNaVirada(inicioIso: string, agoraIso: string): string {
  const fimDoDia = new Date(inicioIso)
  if (Number.isNaN(fimDoDia.getTime())) return agoraIso
  fimDoDia.setHours(23, 59, 59, 0)
  return fimDoDia.getTime() < new Date(agoraIso).getTime() ? fimDoDia.toISOString() : agoraIso
}

/** Tarefas e itens em andamento cujo dia não é mais hoje: os que a virada do dia para. */
export function alvosForaDeHoje(
  tarefas: Pick<Task, 'id' | 'data' | 'emAndamento'>[],
  itens: Pick<GroupItem, 'id' | 'cardId' | 'emAndamento'>[],
  cards: Pick<GroupCard, 'id' | 'data'>[],
  hoje: DataLocal,
): { tarefas: string[]; itens: string[] } {
  const diaDoCard = new Map(cards.map((card) => [card.id, card.data]))
  return {
    tarefas: tarefas.filter((t) => t.emAndamento === true && t.data !== hoje).map((t) => t.id),
    itens: itens
      .filter((i) => i.emAndamento === true && diaDoCard.get(i.cardId) !== hoje)
      .map((i) => i.id),
  }
}
