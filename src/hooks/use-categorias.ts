import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listarCategorias } from '@/db/repositories/category-repository'
import type { TipoCategoria } from '@/db/types'
import { categoriasDoTipo, type CategoriaComSubcategorias } from '@/lib/categorias'

const NENHUMA: CategoriaComSubcategorias[] = []

/**
 * Categorias com subcategorias, atualizadas sozinhas. Com `tipo`, só as daquele tipo (para
 * escolher); sem, todas (para achar a cor de qualquer item pelo id).
 */
export function useCategorias(tipo?: TipoCategoria) {
  const categorias = useLiveQuery(listarCategorias, [])
  const doTipo = useMemo(
    () => (categorias && tipo ? categoriasDoTipo(categorias, tipo) : categorias),
    [categorias, tipo],
  )
  return { categorias: doTipo ?? NENHUMA, isCarregando: categorias === undefined }
}
