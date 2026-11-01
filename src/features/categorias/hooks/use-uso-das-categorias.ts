import { useLiveQuery } from 'dexie-react-hooks'
import { contarUsoDasCategorias } from '@/db/repositories/category-repository'
import { SEM_USO, type UsoDaCategoria } from '@/lib/categorias'

/** Quantas tarefas, grupos e procedimentos usam cada categoria, atualizado sozinho. */
export function useUsoDasCategorias() {
  const uso = useLiveQuery(contarUsoDasCategorias, [])
  return {
    isContando: uso === undefined,
    usoDe: (categoryId: string): UsoDaCategoria => uso?.get(categoryId) ?? SEM_USO,
  }
}
