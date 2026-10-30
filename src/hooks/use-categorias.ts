import { useLiveQuery } from 'dexie-react-hooks'
import { listarCategorias } from '@/db/repositories/category-repository'
import type { CategoriaComSubcategorias } from '@/lib/categorias'

const NENHUMA: CategoriaComSubcategorias[] = []

/** Categorias com subcategorias, atualizadas sozinhas. */
export function useCategorias() {
  const categorias = useLiveQuery(listarCategorias, [])
  return { categorias: categorias ?? NENHUMA, isCarregando: categorias === undefined }
}
