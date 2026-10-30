import { colocarNoGrupo } from '@/db/repositories/group-repository'
import {
  arquivarTarefa,
  criarTarefa,
  definirCategoria,
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
    definirCategoria,
    arquivarTarefa,
    excluirTarefa,
    reordenarTarefa,
    colocarNoGrupo,
  }
}
