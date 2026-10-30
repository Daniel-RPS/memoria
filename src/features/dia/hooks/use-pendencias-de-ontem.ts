import { useLiveQuery } from 'dexie-react-hooks'
import { contarPendenciasDeOntem } from '@/db/repositories/group-repository'
import type { DataLocal } from '@/db/types'

/** Quantas pendências (tarefas soltas e itens de grupo) ficaram em ontem (0 enquanto carrega). */
export function usePendenciasDeOntem(hoje: DataLocal) {
  return useLiveQuery(() => contarPendenciasDeOntem(hoje), [hoje]) ?? 0
}
