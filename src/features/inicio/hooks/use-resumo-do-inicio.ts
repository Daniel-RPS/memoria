import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { listarGruposAtrasados } from '@/db/repositories/group-repository'
import { listarTarefasAtrasadas } from '@/db/repositories/task-repository'
import type { DataLocal, GroupCard, GroupSeries } from '@/db/types'
import { montarResumoDeAndamento, type ResumoDeAndamento } from '@/domain/andamento'
import { useGruposDoPeriodo } from '@/hooks/use-grupos-do-periodo'
import { useTarefasDoPeriodo } from '@/hooks/use-tarefas-do-periodo'
import { somarDias } from '@/lib/datas'
import { montarGrupos } from '@/lib/grupos'
import {
  contarProximosDias,
  resumirAtrasadas,
  resumirDia,
  montarResumoDoDia,
  type ResumoDoDia,
} from '@/lib/inicio'

const DIAS_A_FRENTE = 7

const RESUMO_VAZIO: ResumoDoDia = { grupos: [], soltas: [], pendentes: 0 }

/** Hoje em números (situação, progresso, grupos e tarefas soltas), atualizado sozinho. */
export function useHojeNoInicio(hoje: DataLocal) {
  const { tarefas } = useTarefasDoPeriodo(hoje, hoje)
  const { grupos } = useGruposDoPeriodo(hoje, hoje)
  return useMemo(
    () => resumirDia(montarResumoDoDia(tarefas, grupos, hoje)),
    [tarefas, grupos, hoje],
  )
}

/**
 * Pendentes de dias que já passaram: os números e os ids para "Trazer todas para hoje".
 */
export function useAtrasadas(hoje: DataLocal) {
  const resultado = useLiveQuery(async () => {
    const [tarefas, grupos] = await Promise.all([
      listarTarefasAtrasadas(hoje),
      listarGruposAtrasados(hoje),
    ])
    return { tarefas, grupos }
  }, [hoje])
  return useMemo(() => {
    const resumo = resultado
      ? montarResumoDoDia(
          resultado.tarefas,
          montarGrupos(resultado.grupos.cards, resultado.grupos.series, resultado.grupos.itens),
          hoje,
        )
      : RESUMO_VAZIO
    return {
      numeros: resumirAtrasadas(resumo),
      idsDasTarefas: resumo.soltas
        .filter(({ tarefa }) => tarefa.status === 'pendente')
        .map(({ tarefa }) => tarefa.id),
      idsDosCards: resumo.grupos
        .filter(({ total, feitos }) => total > feitos)
        .map(({ grupo }) => grupo.card.id),
    }
  }, [resultado, hoje])
}

/** Quantos pendentes há em cada um dos próximos 7 dias. */
export function useProximosDias(hoje: DataLocal) {
  const inicio = somarDias(hoje, 1)
  const fim = somarDias(hoje, DIAS_A_FRENTE)
  const { tarefas } = useTarefasDoPeriodo(inicio, fim)
  const { grupos } = useGruposDoPeriodo(inicio, fim)
  return useMemo(
    () => contarProximosDias(tarefas, grupos, hoje, DIAS_A_FRENTE),
    [tarefas, grupos, hoje],
  )
}

/**
 * Itens e tarefas soltas atualmente em andamento.
 * Atualiza instantaneamente com qualquer alteração nas tabelas relevantes.
 */
export function useEmAndamentoNoInicio(hoje: DataLocal): ResumoDeAndamento | null {
  const resumo = useLiveQuery(async () => {
    const tarefas = await db.tasks
      .filter((t) => t.status === 'pendente' && t.emAndamento === true)
      .toArray()

    const itens = await db.groupItems
      .filter((i) => i.status === 'pendente' && i.emAndamento === true)
      .toArray()

    if (tarefas.length === 0 && itens.length === 0) {
      return null
    }

    const cardIds = Array.from(new Set(itens.map((i) => i.cardId)))
    const cards = (await db.groupCards.bulkGet(cardIds)).filter(
      (c): c is GroupCard => c !== undefined,
    )

    const seriesIds = Array.from(new Set(cards.map((c) => c.seriesId)))
    const series = (await db.groupSeries.bulkGet(seriesIds)).filter(
      (s): s is GroupSeries => s !== undefined,
    )

    return montarResumoDeAndamento({
      tarefas,
      itens,
      cards,
      series,
      hoje,
    })
  }, [hoje])

  return resumo ?? null
}
