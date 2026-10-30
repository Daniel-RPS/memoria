import {
  atualizarCategoria,
  atualizarSubcategoria,
  criarCategoria,
  criarSubcategoria,
  excluirCategoria,
  excluirSubcategoria,
} from '@/db/repositories/category-repository'

/** Ações da tela de categorias; a escrita fica no repositório. */
export function useAcoesCategoria() {
  return {
    criarCategoria,
    atualizarCategoria,
    excluirCategoria,
    criarSubcategoria,
    atualizarSubcategoria,
    excluirSubcategoria,
  }
}
