import { db } from '@/db/database'
import type { DataLocal, TimeSession } from '@/db/types'
import {
  tarefasNosDias,
  type ContagemPorClasse,
  type DadosDeNumeros,
  type TarefaNoDia,
} from '@/domain/numeros'
import { somarTempoDoAlvo } from '@/domain/tempo'
import { resolverDiasDoPeriodo, type PeriodoDeDados } from '@/domain/periodo'

/** Dados do relatório da tela Visão geral. */
export interface RelatorioDeVisaoGeral {
  /** Quantidade de dias no período selecionado. */
  diasNoPeriodo: number
  /** Total de tarefas no período (soma das três classes). */
  totalTarefas: number
  /** Contagem de tarefas concluídas, não concluídas e em aberto. */
  contagem: ContagemPorClasse
  /** Percentual de tarefas concluídas sobre o total (arredondado para inteiro). */
  percentualConcluidas: number
  /** Percentual de tarefas não concluídas sobre o total (arredondado para inteiro). */
  percentualNaoConcluidas: number
  /** Percentual de tarefas em aberto sobre o total (arredondado para inteiro). */
  percentualEmAberto: number
  /**
   * Média de tarefas por dia (total ÷ diasNoPeriodo), formatada com 1 casa e vírgula ("2,4"),
   * ou "—" se período sem tarefas.
   */
  mediaTarefasPorDiaTexto: string
  /**
   * Média do tempo gasto nas tarefas CONCLUÍDAS do período que têm tempo medido pelo timer,
   * em ms, ou undefined se nenhuma com tempo medido.
   */
  tempoMedioMs?: number
  /** Quantidade de concluídas com tempo medido. */
  concluidasComTempo: number
  /** Total de tarefas concluídas no período. */
  totalConcluidas: number
  /** Dias com tarefas registradas no banco (para as bolinhas do calendário). */
  diasComTarefas: Set<DataLocal>
}

/**
 * Monta os dados da Visão Geral a partir dos dados do banco e do período.
 */
export function montarRelatorioVisaoGeral(
  dadosNumeros: DadosDeNumeros,
  sessoes: TimeSession[],
  periodo: PeriodoDeDados,
  hoje: DataLocal,
): RelatorioDeVisaoGeral {
  const diasDoPeriodo = resolverDiasDoPeriodo(periodo, hoje)
  const setDias = new Set(diasDoPeriodo)
  const diasNoPeriodo = setDias.size

  // Percorre as tarefas uma vez só
  const todasAsTarefas = tarefasNosDias(dadosNumeros, hoje)

  // Filtra as tarefas que caem nos dias do período
  const doPeriodo = todasAsTarefas.filter((t) => setDias.has(t.data))

  let concluidas = 0
  let naoConcluidas = 0
  let emAberto = 0

  const tarefasConcluidas: TarefaNoDia[] = []

  for (const tarefa of doPeriodo) {
    if (tarefa.classe === 'concluida') {
      concluidas += 1
      tarefasConcluidas.push(tarefa)
    } else if (tarefa.classe === 'naoConcluida') {
      naoConcluidas += 1
    } else {
      emAberto += 1
    }
  }

  const totalTarefas = concluidas + naoConcluidas + emAberto

  const percentualConcluidas = totalTarefas > 0 ? Math.round((concluidas / totalTarefas) * 100) : 0
  const percentualNaoConcluidas =
    totalTarefas > 0 ? Math.round((naoConcluidas / totalTarefas) * 100) : 0
  const percentualEmAberto = totalTarefas > 0 ? Math.round((emAberto / totalTarefas) * 100) : 0

  let mediaTarefasPorDiaTexto = '—'
  if (totalTarefas > 0 && diasNoPeriodo > 0) {
    const media = totalTarefas / diasNoPeriodo
    mediaTarefasPorDiaTexto = media.toFixed(1).replace('.', ',')
  }

  let somaTempoMs = 0
  let concluidasComTempo = 0
  const totalConcluidas = concluidas

  const tempoCache = new Map<string, number>()

  for (const tarefa of tarefasConcluidas) {
    let tempoMs = tempoCache.get(tarefa.cadeia)
    if (tempoMs === undefined) {
      tempoMs = somarTempoDoAlvo(
        sessoes,
        { tipo: 'item', id: tarefa.cadeia, cadeiaId: tarefa.cadeia },
        dadosNumeros.itens,
      )
      tempoCache.set(tarefa.cadeia, tempoMs)
    }

    if (tempoMs > 0) {
      somaTempoMs += tempoMs
      concluidasComTempo += 1
    }
  }

  const tempoMedioMs =
    concluidasComTempo > 0 ? Math.round(somaTempoMs / concluidasComTempo) : undefined

  return {
    diasNoPeriodo,
    totalTarefas,
    contagem: { concluidas, naoConcluidas, emAberto },
    percentualConcluidas,
    percentualNaoConcluidas,
    percentualEmAberto,
    mediaTarefasPorDiaTexto,
    tempoMedioMs,
    concluidasComTempo,
    totalConcluidas,
    diasComTarefas: new Set(todasAsTarefas.map((t) => t.data)),
  }
}

/** Carrega tudo o que a Visão geral precisa (números + sessões) numa transação só. */
export async function carregarDadosVisaoGeral(): Promise<{
  dadosNumeros: DadosDeNumeros
  sessoes: TimeSession[]
}> {
  return db.transaction(
    'r',
    [
      db.tasks,
      db.groupItems,
      db.groupCards,
      db.groupSeries,
      db.categories,
      db.adiamentos,
      db.sessions,
    ],
    async () => {
      const [tarefas, itens, cards, series, categorias, adiamentos, sessoes] = await Promise.all([
        db.tasks.toArray(),
        db.groupItems.toArray(),
        db.groupCards.toArray(),
        db.groupSeries.toArray(),
        db.categories.filter((categoria) => categoria.tipo === 'grupo').toArray(),
        db.adiamentos.toArray(),
        db.sessions.toArray(),
      ])
      return {
        dadosNumeros: { tarefas, itens, cards, series, categorias, adiamentos },
        sessoes,
      }
    },
  )
}
