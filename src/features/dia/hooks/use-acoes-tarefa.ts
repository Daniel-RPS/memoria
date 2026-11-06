import { colocarNoGrupoComDesfazer } from '@/db/repositories/lote-repository'
import {
  arquivarTarefa,
  criarTarefa,
  definirCategoria,
  definirConclusao,
  excluirTarefa,
  renomearTarefa,
  reordenarTarefa,
} from '@/db/repositories/task-repository'
import { avisarConversao } from '@/features/dia/hooks/use-movimento-em-lote'

/** Tarefa solta vira item; avisa (com Desfazer) se ela perdeu a categoria. */
async function colocarNoGrupo(tarefaId: string, cardId: string, idsEmOrdem?: string[]) {
  avisarConversao(await colocarNoGrupoComDesfazer(tarefaId, cardId, idsEmOrdem))
}

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
