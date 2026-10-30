import { createContext, useContext } from 'react'

/** O que as linhas da folha precisam saber além da tarefa: anexos e anotação. */
export interface ExtrasDaFolha {
  anexosPorTarefa: Map<string, number>
  tarefasComNota: Set<string>
}

export const ContextoExtras = createContext<ExtrasDaFolha>({
  anexosPorTarefa: new Map(),
  tarefasComNota: new Set(),
})

export function useExtrasDaTarefa(taskId: string) {
  const extras = useContext(ContextoExtras)
  return {
    quantidadeAnexos: extras.anexosPorTarefa.get(taskId) ?? 0,
    isComNota: extras.tarefasComNota.has(taskId),
  }
}
