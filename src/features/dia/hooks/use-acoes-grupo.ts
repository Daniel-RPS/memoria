import {
  arquivarGrupo,
  criarGrupo,
  criarItem,
  definirCategoriaDoGrupo,
  excluirGrupo,
  renomearGrupo,
} from '@/db/repositories/group-repository'

/** Ações sobre cards de grupo usadas pela visão do dia; a escrita fica no repositório. */
export function useAcoesGrupo() {
  return {
    criarGrupo,
    criarItem,
    renomearGrupo,
    definirCategoriaDoGrupo,
    arquivarGrupo,
    excluirGrupo,
  }
}
