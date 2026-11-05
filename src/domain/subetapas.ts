import type { Subtask } from '@/db/types'

/**
 * Regras puras das subetapas (as de tarefa solta e as de item de grupo são o mesmo modelo,
 * `Subtask`). A gravação, em transação, fica em `subtask-repository`.
 */

/** Ordem da subetapa nova: depois de todas as do mesmo dono. */
export function proximaOrdemDeSubetapa(irmas: Pick<Subtask, 'ordem'>[]) {
  return Math.max(0, ...irmas.map((subetapa) => subetapa.ordem)) + 1
}

/**
 * Copia as subetapas para um dono novo (item levado a outro dia): ids novos, mesma ordem e
 * mesmo estado, então as concluídas continuam marcadas.
 */
export function copiarSubetapas(
  subetapas: Subtask[],
  novoDonoId: string,
  novoId: () => string,
  momento: string,
): Subtask[] {
  return [...subetapas]
    .sort((a, b) => a.ordem - b.ordem)
    .map((subetapa) => ({
      id: novoId(),
      taskId: novoDonoId,
      titulo: subetapa.titulo,
      concluida: subetapa.concluida,
      ordem: subetapa.ordem,
      criadoEm: momento,
      atualizadoEm: momento,
    }))
}

/** O que mudar no dono (tarefa ou item) depois de marcar ou desmarcar uma subetapa. */
export type EfeitoNoDono = 'concluir' | 'reabrir' | 'nada'

export interface DonoDaSubetapa {
  isPendente: boolean
  isConcluido: boolean
  /** Foi concluído sozinho pela última subetapa (e não pela caixa dele). */
  concluidaPelasSubetapas: boolean
}

/**
 * Marcar a ÚLTIMA subetapa pendente conclui o dono (se ele está pendente); desmarcar uma
 * subetapa de um dono concluído assim o reabre. Dono concluído pela própria caixa não é
 * mexido. `subetapas` é o estado DEPOIS da mudança.
 */
export function efeitoNoDono(
  isMarcada: boolean,
  subetapas: Pick<Subtask, 'concluida'>[],
  dono: DonoDaSubetapa,
): EfeitoNoDono {
  if (isMarcada) {
    const isTudoFeito = subetapas.length > 0 && subetapas.every((subetapa) => subetapa.concluida)
    return isTudoFeito && dono.isPendente ? 'concluir' : 'nada'
  }
  return dono.isConcluido && dono.concluidaPelasSubetapas ? 'reabrir' : 'nada'
}

/** Divide o texto colado em uma subetapa por linha não vazia. */
export function titulosDoTextoColado(texto: string) {
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0)
}
