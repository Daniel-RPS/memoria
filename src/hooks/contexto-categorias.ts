import { createContext, useContext } from 'react'
import type { CategoriaComSubcategorias } from '@/lib/categorias'

/** Categorias disponíveis para as linhas de tarefa (dia e semana), sem repassar por props. */
export const ContextoCategorias = createContext<CategoriaComSubcategorias[]>([])

export function useCategoriasDoContexto() {
  return useContext(ContextoCategorias)
}
