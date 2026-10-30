import { useLiveQuery } from 'dexie-react-hooks'
import { contarTarefasDaCategoria } from '@/db/repositories/category-repository'

/** Quantas tarefas usam a categoria; `undefined` enquanto conta ou quando `isAtivo` é falso. */
export function useContagemTarefas(categoryId: string, isAtivo: boolean) {
  return useLiveQuery<number | undefined>(
    () => (isAtivo ? contarTarefasDaCategoria(categoryId) : undefined),
    [categoryId, isAtivo],
  )
}
