import { avisarComDesfazer } from '@/hooks/use-mover-tarefas'
import {
  criarSubtarefa,
  criarSubtarefas,
  definirConclusaoSubtarefa as definirConclusaoNoBanco,
  excluirSubtarefa,
  renomearSubtarefa,
  reordenarSubtarefa,
} from '@/db/repositories/subtask-repository'

/** Ações sobre subetapas usadas pelas telas; a escrita fica no repositório. */
export function useAcoesSubtarefa() {
  /** Marca ou desmarca; a última subetapa concluindo a tarefa/item ganha o aviso com "Desfazer". */
  async function definirConclusaoSubtarefa(id: string, concluida: boolean) {
    const resultado = await definirConclusaoNoBanco(id, concluida)
    if (resultado.efeito === 'concluiu') {
      avisarComDesfazer('Tarefa concluída', resultado.desfazer)
    }
    return resultado
  }

  return {
    criarSubtarefa,
    criarSubtarefas,
    renomearSubtarefa,
    definirConclusaoSubtarefa,
    excluirSubtarefa,
    reordenarSubtarefa,
  }
}
