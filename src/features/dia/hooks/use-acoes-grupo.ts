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
  tirarDoGrupo,
} from '@/db/repositories/group-repository'

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
