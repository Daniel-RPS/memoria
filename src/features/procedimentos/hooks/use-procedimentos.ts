import { useLiveQuery } from 'dexie-react-hooks'
import { listarProcedimentos, obterProcedimento } from '@/db/repositories/procedure-repository'

/** Todos os procedimentos (lista vazia enquanto carrega). */
export function useProcedimentos() {
  const procedimentos = useLiveQuery(listarProcedimentos, [])
  return { procedimentos: procedimentos ?? [], isCarregando: procedimentos === undefined }
}

/** Um procedimento; `procedimento` é `null` se não existir. */
export function useProcedimento(id: string) {
  const procedimento = useLiveQuery(async () => (await obterProcedimento(id)) ?? null, [id])
  return { procedimento, isCarregando: procedimento === undefined }
}
