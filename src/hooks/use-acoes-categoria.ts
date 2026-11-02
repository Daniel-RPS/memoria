import {
  atualizarCategoria,
  atualizarSubcategoria,
  criarCategoria,
  criarSubcategoria,
  definirIconeDaCategoria,
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
    definirIconeDaCategoria,
    reordenarCategoria,
    excluirCategoria,
    moverCategoriaDeTipo,
    criarSubcategoria,
    atualizarSubcategoria,
    reordenarSubcategoria,
    excluirSubcategoria,
  }
}
