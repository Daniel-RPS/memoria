import type { GroupItem, Task } from '@/db/types'

/**
 * Prioridade: marca (bandeira) de tarefa solta pendente e de item pendente de grupo. Aqui ficam as
 * regras, sem banco: o repositório só as aplica. Ela é MANTIDA ao adiar, mover, arrastar e
 * duplicar o grupo (a cópia do item leva a marca; o original, que vira registro, a perde) e SAI
 * sozinha quando o registro é concluído, direto ou pela última subetapa.
 */

/** Os dois campos da marca, nos dois tipos de registro. */
export interface CamposDePrioridade {
  prioridade?: boolean | undefined
  prioridadeDesde?: string | undefined
}

/** Para gravar com `update`/`put`: apaga a marca (campo `undefined` some do registro). */
export const SEM_PRIORIDADE = { prioridade: undefined, prioridadeDesde: undefined } as const

export function isPrioritario(registro: CamposDePrioridade) {
  return registro.prioridade === true
}

/** Só o que ainda está por fazer pode ter prioridade. */
export function podeTerPrioridade(registro: Pick<Task | GroupItem, 'status'>) {
  return registro.status === 'pendente'
}

/** Campos que marcam o registro como prioridade a partir de `momento`. */
export function camposDePrioridade(momento: string): CamposDePrioridade {
  return { prioridade: true, prioridadeDesde: momento }
}

/**
 * A marca do registro para levar a um registro novo (cópia do item, tarefa ↔ item): vazia se
 * não é prioridade.
 */
export function prioridadeDe(registro: CamposDePrioridade): CamposDePrioridade {
  return isPrioritario(registro)
    ? { prioridade: true, prioridadeDesde: registro.prioridadeDesde }
    : {}
}

/** Quantos itens pendentes do grupo são prioridade (para a bandeira do grupo recolhido). */
export function contarPrioritarios(itens: Pick<GroupItem, 'status' | 'prioridade'>[]) {
  return itens.filter((item) => item.status === 'pendente' && item.prioridade === true).length
}

/**
 * Tecla P e botão de alternar: se algum dos que PODEM ter prioridade ainda não tem, marca todos;
 * senão (todos já têm) tira de todos. Quem não está pendente não conta.
 */
export function deveMarcarPrioridade(
  registros: (CamposDePrioridade & Pick<Task | GroupItem, 'status'>)[],
) {
  const elegiveis = registros.filter(podeTerPrioridade)
  return elegiveis.some((registro) => !isPrioritario(registro))
}

/** Texto do aviso depois de marcar ou tirar. */
export function textoDaPrioridade(quantidade: number, isMarcar: boolean) {
  if (quantidade <= 1) return isMarcar ? 'Marcada como prioridade' : 'Prioridade removida'
  return isMarcar
    ? `${quantidade} marcadas como prioridade`
    : `Prioridade removida de ${quantidade}`
}
