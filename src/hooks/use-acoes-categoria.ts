import {
  atualizarCategoria,
  atualizarSubcategoria,
  criarCategoria,
  criarSubcategoria,
  excluirCategoria,
  excluirSubcategoria,
  moverCategoriaDeTipo,
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
    moverCategoriaDeTipo,
    criarSubcategoria,
    atualizarSubcategoria,
    reordenarSubcategoria,
    excluirSubcategoria,
  }
}
