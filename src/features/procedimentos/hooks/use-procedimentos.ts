import { useLiveQuery } from 'dexie-react-hooks'
import { listarExecucoes } from '@/db/repositories/execution-repository'
import {
  listarProcedimentos,
  listarVersoes,
  obterProcedimento,
  obterVersao,
} from '@/db/repositories/procedure-repository'

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

/** O procedimento como estava na versão pedida; `null` se a versão não existir. */
export function useVersaoProcedimento(id: string, versao: number) {
  const procedimento = useLiveQuery(
    async () => (await obterVersao(id, versao)) ?? null,
    [id, versao],
  )
  return { procedimento, isCarregando: procedimento === undefined }
}

/** Execuções e versões anteriores do procedimento. */
export function useHistoricoProcedimento(id: string) {
  const historico = useLiveQuery(
    async () => ({ execucoes: await listarExecucoes(id), versoes: await listarVersoes(id) }),
    [id],
  )
  return historico ?? { execucoes: [], versoes: [] }
}
