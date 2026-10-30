import {
  arquivarTarefa,
  criarTarefa,
  definirConclusao,
  excluirTarefa,
  renomearTarefa,
  reordenarTarefa,
} from '@/db/repositories/task-repository'

/** Ações sobre tarefas usadas pela visão do dia; a escrita fica no repositório. */
export function useAcoesTarefa() {
  return {
    criarTarefa,
    renomearTarefa,
    definirConclusao,
    arquivarTarefa,
    excluirTarefa,
    reordenarTarefa,
  }
}
