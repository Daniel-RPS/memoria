import { useLiveQuery } from 'dexie-react-hooks'
import { listarPendenciasDeOntem } from '@/db/repositories/task-repository'
import type { DataLocal } from '@/db/types'

/** Quantas pendentes ficaram em ontem (0 enquanto carrega). */
export function usePendenciasDeOntem(hoje: DataLocal) {
  return useLiveQuery(async () => (await listarPendenciasDeOntem(hoje)).length, [hoje]) ?? 0
}
