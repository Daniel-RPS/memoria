import {
  arquivarGrupo,
  arquivarItem,
  criarGrupo,
  criarItem,
  definirCategoriaDoGrupo,
  definirConclusaoItem,
  excluirGrupo,
  excluirItem,
  passarItemParaCard,
  renomearGrupo,
  renomearItem,
  reordenarItem,
} from '@/db/repositories/group-repository'
import { tirarDoGrupoComDesfazer } from '@/db/repositories/lote-repository'
import { avisarConversao } from '@/features/dia/hooks/use-movimento-em-lote'

/** Item vira tarefa solta; avisa (com Desfazer) se ela ficou sem a categoria do grupo. */
async function tirarDoGrupo(itemId: string, idsEmOrdemNoDia?: string[]) {
  avisarConversao(await tirarDoGrupoComDesfazer(itemId, idsEmOrdemNoDia))
}

/** Ações sobre cards de grupo e itens usadas pela visão do dia; a escrita fica no repositório. */
export function useAcoesGrupo() {
  return {
    criarGrupo,
    criarItem,
    renomearGrupo,
    definirCategoriaDoGrupo,
    arquivarGrupo,
    excluirGrupo,
    renomearItem,
    definirConclusaoItem,
    reordenarItem,
    arquivarItem,
    excluirItem,
    tirarDoGrupo,
    passarItemParaCard,
  }
}
