import { adicionarItensNaSerie, definirConclusaoItem } from '@/db/repositories/group-repository'
import { definirConclusao } from '@/db/repositories/task-repository'
import type { DataLocal } from '@/db/types'

/** Marcar, desmarcar e pôr item num grupo pelo Início; a escrita fica nos repositórios. */
export function useAcoesDoInicio() {
  function adicionarItem(seriesId: string, data: DataLocal, titulo: string) {
    return adicionarItensNaSerie(seriesId, data, [titulo])
  }
  return { definirConclusao, definirConclusaoItem, adicionarItem }
}
