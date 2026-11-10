import { createContext, useContext } from 'react'
import type { Category } from '@/db/types'

/** Categorias disponíveis para as linhas de tarefa (dia e semana), sem repassar por props. */
export const ContextoCategorias = createContext<Category[]>([])

export function useCategoriasDoContexto() {
  return useContext(ContextoCategorias)
}
