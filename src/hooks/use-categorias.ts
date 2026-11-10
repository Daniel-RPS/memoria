import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listarCategorias } from '@/db/repositories/category-repository'
import type { Category, TipoCategoria } from '@/db/types'
import { categoriasDoTipo } from '@/lib/categorias'

const NENHUMA: Category[] = []

/**
 * Categorias na ordem do usuário, atualizadas sozinhas. Com `tipo`, só as daquele tipo (para
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
