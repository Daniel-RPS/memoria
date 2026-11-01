import { definirConclusaoItem } from '@/db/repositories/group-repository'
import { definirConclusao } from '@/db/repositories/task-repository'

/** Marcar e desmarcar pelo Início; a escrita fica nos repositórios. */
export function useAcoesDoInicio() {
  return { definirConclusao, definirConclusaoItem }
}
