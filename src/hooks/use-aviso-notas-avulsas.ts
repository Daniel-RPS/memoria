import { useLiveQuery } from 'dexie-react-hooks'
import { contarNotasQueFicamAvulsas, type AlvoDeExclusao } from '@/db/repositories/note-repository'
import { avisoNotasAvulsas } from '@/lib/notas'

/**
 * Frase da confirmação de excluir quando notas vão ficar avulsas ("Esta tarefa tem 2 notas…");
 * vazia se nenhuma. Só consulta com o diálogo aberto.
 */
export function useAvisoNotasAvulsas(alvo: AlvoDeExclusao, isAberto: boolean) {
  const quantas = useLiveQuery(
    async () => (isAberto ? contarNotasQueFicamAvulsas(alvo) : 0),
    [alvo.tipo, alvo.id, isAberto],
  )
  const de = alvo.tipo === 'card' ? 'grupo' : alvo.tipo
  return avisoNotasAvulsas(quantas ?? 0, de)
}
