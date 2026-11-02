import { useLiveQuery } from 'dexie-react-hooks'
import { listarCoresRecentes } from '@/db/repositories/category-repository'

const NENHUMA: string[] = []

/** Até 6 cores personalizadas usadas por último em categorias, atualizadas sozinhas. */
export function useCoresRecentes() {
  return useLiveQuery(listarCoresRecentes, []) ?? NENHUMA
}
