import { createContext, useContext } from 'react'
import type { CategoriaComSubcategorias } from '@/lib/categorias'

/** Categorias disponíveis na folha do dia, sem repassar por todas as linhas. */
export const ContextoCategorias = createContext<CategoriaComSubcategorias[]>([])

export function useCategoriasDaFolha() {
  return useContext(ContextoCategorias)
}
