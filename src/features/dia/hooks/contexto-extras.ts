import { createContext, useContext } from 'react'
import type { DataLocal } from '@/db/types'

/** Card do dia que pode receber uma tarefa solta ("Colocar no grupo"). */
export interface GrupoParaEscolher {
  id: string
  titulo: string
}

/** O que as linhas da folha precisam saber além da tarefa: anexos e cards do dia. */
export interface ExtrasDaFolha {
  anexosPorTarefa: Map<string, number>
  gruposDoDia: GrupoParaEscolher[]
  /** Dia do card que recebeu cada item transferido (por id do card). */
  dataDoDestino: Map<string, DataLocal>
}

export const ContextoExtras = createContext<ExtrasDaFolha>({
  anexosPorTarefa: new Map(),
  gruposDoDia: [],
  dataDoDestino: new Map(),
})

export function useExtrasDaTarefa(taskId: string) {
  const extras = useContext(ContextoExtras)
  return {
    quantidadeAnexos: extras.anexosPorTarefa.get(taskId) ?? 0,
  }
}

/** Cards do dia, para "Colocar no grupo". */
export function useGruposDoDia() {
  return useContext(ContextoExtras).gruposDoDia
}

/** Dia para onde o item transferido foi (pelo card de destino). */
export function useDataDoDestino(cardId: string | undefined) {
  const { dataDoDestino } = useContext(ContextoExtras)
  return cardId ? dataDoDestino.get(cardId) : undefined
}
