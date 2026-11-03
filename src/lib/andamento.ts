import type { GroupItem, Task } from '@/db/types'

/**
 * "Em andamento": marca do que a pessoa está fazendo AGORA, em tarefa solta pendente e em item
 * pendente de grupo. Pode haver várias ao mesmo tempo. Aqui ficam as regras, sem banco: os
 * repositórios só as aplicam. A marca sai sozinha quando o registro deixa de ser "o que estou
 * fazendo neste dia": é movido de dia, concluído, arquivado, ou vira registro de transferência.
 */

/** Os dois campos da marca, nos dois tipos de registro. */
export interface CamposDeAndamento {
  emAndamento?: boolean | undefined
  emAndamentoDesde?: string | undefined
}

/** Para gravar com `update`/`put`: apaga a marca (campo `undefined` some do registro). */
export const SEM_ANDAMENTO = { emAndamento: undefined, emAndamentoDesde: undefined } as const

export function isEmAndamento(registro: CamposDeAndamento) {
  return registro.emAndamento === true
}

/** Só o que ainda está por fazer pode estar em andamento. */
export function podeEstarEmAndamento(registro: Pick<Task | GroupItem, 'status'>) {
  return registro.status === 'pendente'
}

/** Campos que marcam o registro como em andamento a partir de `momento`. */
export function camposDeAndamento(momento: string): CamposDeAndamento {
  return { emAndamento: true, emAndamentoDesde: momento }
}

/**
 * A marca do registro para levar a um registro novo do mesmo dia (tarefa ↔ item): vazia se não
 * está em andamento.
 */
export function marcaDe(registro: CamposDeAndamento): CamposDeAndamento {
  return isEmAndamento(registro)
    ? { emAndamento: true, emAndamentoDesde: registro.emAndamentoDesde }
    : {}
}

/** O registro com a marca apagada (nem os campos ficam, para não sujar o backup). */
export function semAndamento<T extends CamposDeAndamento>(registro: T): T {
  const { emAndamento: _marca, emAndamentoDesde: _desde, ...resto } = registro
  return resto as T
}

/** O registro marcado como em andamento; recusa o que não está pendente. */
export function comAndamento<T extends CamposDeAndamento & Pick<Task | GroupItem, 'status'>>(
  registro: T,
  momento: string,
): T {
  return podeEstarEmAndamento(registro) ? { ...registro, ...camposDeAndamento(momento) } : registro
}

/** Quantos itens pendentes do grupo estão em andamento (para o ponto do grupo recolhido). */
export function contarEmAndamento(itens: Pick<GroupItem, 'status' | 'emAndamento'>[]) {
  return itens.filter((item) => item.status === 'pendente' && item.emAndamento === true).length
}

/** Texto do aviso depois de marcar ou parar. */
export function textoDoAndamento(quantidade: number, isMarcar: boolean) {
  if (quantidade <= 1) return isMarcar ? 'Em andamento' : 'Andamento parado'
  return isMarcar ? `${quantidade} em andamento` : `Andamento parado em ${quantidade}`
}
