import { createContext, useContext } from 'react'

/** Card do dia que pode receber uma tarefa solta ("Colocar no grupo"). */
export interface GrupoParaEscolher {
  id: string
  titulo: string
}

/** O que as linhas da folha precisam saber além da tarefa: anexos, anotação e cards do dia. */
export interface ExtrasDaFolha {
  anexosPorTarefa: Map<string, number>
  tarefasComNota: Set<string>
  gruposDoDia: GrupoParaEscolher[]
}

export const ContextoExtras = createContext<ExtrasDaFolha>({
  anexosPorTarefa: new Map(),
  tarefasComNota: new Set(),
  gruposDoDia: [],
})

export function useExtrasDaTarefa(taskId: string) {
  const extras = useContext(ContextoExtras)
  return {
    quantidadeAnexos: extras.anexosPorTarefa.get(taskId) ?? 0,
    isComNota: extras.tarefasComNota.has(taskId),
  }
}

/** Cards não concluídos do dia, para "Colocar no grupo". */
export function useGruposDoDia() {
  return useContext(ContextoExtras).gruposDoDia
}
