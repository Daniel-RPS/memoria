import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listarGruposAtrasados } from '@/db/repositories/group-repository'
import { listarTarefasAtrasadas } from '@/db/repositories/task-repository'
import type { DataLocal } from '@/db/types'
import { useGruposDoPeriodo } from '@/hooks/use-grupos-do-periodo'
import { useTarefasDoPeriodo } from '@/hooks/use-tarefas-do-periodo'
import { somarDias } from '@/lib/datas'
import { montarGrupos } from '@/lib/grupos'
import { contarProximosDias, montarResumoDoDia, type ResumoDoDia } from '@/lib/inicio'

const DIAS_A_FRENTE = 7

const RESUMO_VAZIO: ResumoDoDia = { grupos: [], soltas: [], pendentes: 0 }

/** Hoje (cards e tarefas soltas, cada um na ordem do dia), atualizado sozinho. */
export function useHojeNoInicio(hoje: DataLocal) {
  const { tarefas } = useTarefasDoPeriodo(hoje, hoje)
  const { grupos } = useGruposDoPeriodo(hoje, hoje)
  return useMemo(() => montarResumoDoDia(tarefas, grupos, hoje), [tarefas, grupos, hoje])
}

/** Pendentes de dias que já passaram, do dia mais antigo ao mais recente. */
export function useAtrasadas(hoje: DataLocal) {
  const resultado = useLiveQuery(async () => {
    const [tarefas, grupos] = await Promise.all([
      listarTarefasAtrasadas(hoje),
      listarGruposAtrasados(hoje),
    ])
    return { tarefas, grupos }
  }, [hoje])
  return useMemo(() => {
    if (!resultado) return RESUMO_VAZIO
    const { cards, series, itens } = resultado.grupos
    return montarResumoDoDia(resultado.tarefas, montarGrupos(cards, series, itens), hoje)
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
