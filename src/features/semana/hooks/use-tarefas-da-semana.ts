import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listarGruposEntre } from '@/db/repositories/group-repository'
import { listarSubtarefas } from '@/db/repositories/subtask-repository'
import { listarTarefasEntre } from '@/db/repositories/task-repository'
import type { DataLocal } from '@/db/types'
import { intercalarNoDia, montarGrupos, type EntradaDoDia } from '@/lib/grupos'
import { diasDaSemana } from '@/lib/semana'
import { agruparSubtarefas, separarDoDia } from '@/lib/tarefas'

export interface DiaDaSemana {
  data: DataLocal
  /** Tarefas soltas pendentes e cards (encerrados também), na ordem do dia. */
  entradas: EntradaDoDia[]
  /** Tarefas soltas concluídas no dia. */
  quantidadeConcluidas: number
}

/** Os 7 dias da semana com tarefas soltas, cards e subtarefas, atualizados sozinhos. */
export function useTarefasDaSemana(inicio: DataLocal) {
  const dias = useMemo(() => diasDaSemana(inicio), [inicio])
  const resultado = useLiveQuery(async () => {
    const primeiro = dias[0]
    const ultimo = dias[dias.length - 1]
    const [tarefas, grupos] = await Promise.all([
      listarTarefasEntre(primeiro, ultimo),
      listarGruposEntre(primeiro, ultimo),
    ])
    const subtarefas = await listarSubtarefas(tarefas.map((tarefa) => tarefa.id))
    return { tarefas, grupos, subtarefas }
  }, [dias])

  return useMemo(() => {
    const tarefas = resultado?.tarefas ?? []
    const grupos = resultado
      ? montarGrupos(resultado.grupos.cards, resultado.grupos.series, resultado.grupos.itens)
      : []
    const semana: DiaDaSemana[] = dias.map((data) => {
      const soltas = separarDoDia(tarefas.filter((tarefa) => tarefa.data === data))
      return {
        data,
        entradas: intercalarNoDia(
          soltas.pendentes,
          grupos.filter((grupo) => grupo.card.data === data),
        ),
        quantidadeConcluidas: soltas.concluidas.length,
      }
    })
    return {
      semana,
      subtarefasPorTarefa: agruparSubtarefas(resultado?.subtarefas ?? []),
      isCarregando: resultado === undefined,
    }
  }, [dias, resultado])
}
