import {
  criarSubtarefa,
  definirConclusaoSubtarefa,
  excluirSubtarefa,
  renomearSubtarefa,
  reordenarSubtarefa,
} from '@/db/repositories/subtask-repository'

/** Ações sobre subtarefas usadas pela visão do dia; a escrita fica no repositório. */
export function useAcoesSubtarefa() {
  return {
    criarSubtarefa,
    renomearSubtarefa,
    definirConclusaoSubtarefa,
    excluirSubtarefa,
    reordenarSubtarefa,
  }
}
