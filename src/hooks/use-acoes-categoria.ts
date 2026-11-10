import {
  atualizarCategoria,
  criarCategoria,
  criarDeCategoriaDeProcedimento,
  definirIconeDaCategoria,
  excluirCategoria,
  moverCategoriaDeTipo,
  reordenarCategoria,
} from '@/db/repositories/category-repository'

/** Ações sobre categorias (aba Categorias e seletor); a escrita fica no repositório. */
export function useAcoesCategoria() {
  return {
    criarCategoria,
    criarDeCategoriaDeProcedimento,
    atualizarCategoria,
    definirIconeDaCategoria,
    reordenarCategoria,
    excluirCategoria,
    moverCategoriaDeTipo,
  }
}
