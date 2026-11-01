import {
  atualizarCategoria,
  atualizarSubcategoria,
  criarCategoria,
  criarSubcategoria,
  excluirCategoria,
  excluirSubcategoria,
  reordenarCategoria,
  reordenarSubcategoria,
} from '@/db/repositories/category-repository'

/** Ações sobre categorias e subcategorias (aba Categorias e seletor); a escrita fica no repositório. */
export function useAcoesCategoria() {
  return {
    criarCategoria,
    atualizarCategoria,
    reordenarCategoria,
    excluirCategoria,
    criarSubcategoria,
    atualizarSubcategoria,
    reordenarSubcategoria,
    excluirSubcategoria,
  }
}
