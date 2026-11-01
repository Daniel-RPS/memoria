import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { contarAnexos } from '@/db/repositories/attachment-repository'
import { listarGruposEntre } from '@/db/repositories/group-repository'
import { donosComNota } from '@/db/repositories/note-repository'
import { listarSubtarefas } from '@/db/repositories/subtask-repository'
import { listarTarefasDoDia } from '@/db/repositories/task-repository'
import type { DataLocal } from '@/db/types'
import { intercalarNoDia, montarGrupos } from '@/lib/grupos'
import { agruparSubtarefas, separarDoDia } from '@/lib/tarefas'
import type { ExtrasDaFolha } from '@/features/dia/hooks/contexto-extras'

const SEM_EXTRAS: ExtrasDaFolha = {
  anexosPorTarefa: new Map(),
  tarefasComNota: new Set(),
  gruposDoDia: [],
  dataDoDestino: new Map(),
}

/**
 * Tarefas soltas e cards de grupo do dia, subtarefas, anexos e
 * anotações, atualizados sozinhos. Cards ficam no lugar mesmo encerrados (são o registro).
 */
export function useTarefasDoDia(data: DataLocal) {
  const resultado = useLiveQuery(async () => {
    const [tarefas, grupos] = await Promise.all([
      listarTarefasDoDia(data),
      listarGruposEntre(data, data),
    ])
    const ids = tarefas.map((tarefa) => tarefa.id)
    const [subtarefas, anexosPorTarefa, tarefasComNota] = await Promise.all([
      listarSubtarefas(ids),
      contarAnexos('task', ids),
      donosComNota('task', ids),
    ])
    return { tarefas, grupos, subtarefas, anexosPorTarefa, tarefasComNota }
  }, [data])

  return useMemo(() => {
    const grupos = resultado
      ? montarGrupos(resultado.grupos.cards, resultado.grupos.series, resultado.grupos.itens)
      : []
    const { pendentes, concluidas } = separarDoDia(resultado?.tarefas ?? [])
    return {
      /** Tarefas soltas pendentes e cards, na ordem do dia. */
      entradas: intercalarNoDia(pendentes, grupos),
      concluidas,
      subtarefasPorTarefa: agruparSubtarefas(resultado?.subtarefas ?? []),
      extras: resultado
        ? {
            anexosPorTarefa: resultado.anexosPorTarefa,
            tarefasComNota: resultado.tarefasComNota,
            gruposDoDia: grupos.map((grupo) => ({
              id: grupo.card.id,
              titulo: grupo.serie.titulo,
            })),
            dataDoDestino: resultado.grupos.dataDoDestino,
          }
        : SEM_EXTRAS,
      isCarregando: resultado === undefined,
    }
  }, [resultado])
}
