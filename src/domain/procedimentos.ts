import type { Procedure } from '@/db/types'

/**
 * Ordem manual dos procedimentos dentro da categoria, sem banco: a ordem de exibição, subir e
 * descer uma posição, onde entra o novo e o que muda ao trocar de categoria. O repositório só
 * lê e grava (`procedure-repository`).
 */

type ComOrdem = Pick<Procedure, 'id' | 'titulo' | 'categoryId' | 'ordem'>

export type DirecaoDeMover = 'cima' | 'baixo'

const porTitulo = (a: Pick<Procedure, 'titulo'>, b: Pick<Procedure, 'titulo'>) =>
  a.titulo.localeCompare(b.titulo, 'pt-BR')

/** Ordem de exibição: a `ordem` gravada; empate (dados antigos) pelo título. */
export function compararPorOrdem(a: ComOrdem, b: ComOrdem) {
  return a.ordem - b.ordem || porTitulo(a, b)
}

/** Chave do bloco: a categoria, ou `''` para "Sem categoria". */
const blocoDe = (procedimento: Pick<Procedure, 'categoryId'>) => procedimento.categoryId ?? ''

/**
 * Preenche a `ordem` de quem não tem (banco antes da v14, backup antes do formato 15) na mesma
 * sequência em que os cartões apareciam: pelo título. Quem já tem `ordem` não muda; os sem
 * ordem vão depois deles.
 */
export function preencherOrdemDosProcedimentos<
  T extends Pick<Procedure, 'titulo'> & { ordem?: number },
>(procedimentos: T[]): (T & { ordem: number })[] {
  const maior = Math.max(
    0,
    ...procedimentos.flatMap((procedimento) =>
      typeof procedimento.ordem === 'number' ? [procedimento.ordem] : [],
    ),
  )
  const semOrdem = procedimentos.filter((procedimento) => typeof procedimento.ordem !== 'number')
  const posicaoNova = new Map([...semOrdem].sort(porTitulo).map((item, indice) => [item, indice]))
  return procedimentos.map((procedimento) =>
    typeof procedimento.ordem === 'number'
      ? (procedimento as T & { ordem: number })
      : { ...procedimento, ordem: maior + 1 + (posicaoNova.get(procedimento) ?? 0) },
  )
}

/** `ordem` para entrar no FIM da categoria (novo procedimento ou troca de categoria). */
export function ordemNoFimDaCategoria(
  procedimentos: ComOrdem[],
  categoryId: string | undefined,
  ignorarId?: string,
) {
  const daCategoria = procedimentos.filter(
    (procedimento) => blocoDe(procedimento) === (categoryId ?? '') && procedimento.id !== ignorarId,
  )
  return daCategoria.length === 0
    ? 1
    : Math.max(...daCategoria.map((procedimento) => procedimento.ordem)) + 1
}

/** Os procedimentos da mesma categoria de `id`, na ordem de exibição. */
export function procedimentosDoBloco(procedimentos: ComOrdem[], id: string) {
  const alvo = procedimentos.find((procedimento) => procedimento.id === id)
  if (!alvo) return []
  return procedimentos
    .filter((procedimento) => blocoDe(procedimento) === blocoDe(alvo))
    .sort(compararPorOrdem)
}

/** Uma `ordem` a gravar. */
export interface NovaOrdem {
  id: string
  ordem: number
}

/**
 * O que gravar para subir ou descer `id` uma posição dentro da categoria, ou `null` quando não
 * dá (primeiro não sobe, último não desce, id que não existe). Só o movido muda, ficando entre
 * os novos vizinhos; sem espaço entre eles (ordens iguais), o bloco é renumerado. Não muda a
 * categoria nem a data de edição.
 */
export function planejarMoverProcedimento(
  procedimentos: ComOrdem[],
  id: string,
  direcao: DirecaoDeMover,
): NovaOrdem[] | null {
  const bloco = procedimentosDoBloco(procedimentos, id)
  const posicao = bloco.findIndex((procedimento) => procedimento.id === id)
  const destino = direcao === 'cima' ? posicao - 1 : posicao + 1
  if (posicao < 0 || destino < 0 || destino >= bloco.length) return null

  const nova = bloco.map((procedimento) => procedimento.id)
  ;[nova[posicao], nova[destino]] = [nova[destino], nova[posicao]]
  return planejarReordenarProcedimentos(bloco, nova, id)
}

/**
 * O que gravar depois de arrastar `idMovido` para a posição dele em `idsEmOrdem` (o bloco já na
 * ordem nova): só o movido muda, entre os novos vizinhos; sem espaço entre eles, o bloco é
 * renumerado. `null` quando o id não está na lista.
 */
export function planejarReordenarProcedimentos(
  procedimentos: Pick<Procedure, 'id' | 'ordem'>[],
  idsEmOrdem: string[],
  idMovido: string,
): NovaOrdem[] | null {
  const ordemPorId = new Map(
    procedimentos.map((procedimento) => [procedimento.id, procedimento.ordem]),
  )
  const nova = idsEmOrdem.filter((id) => ordemPorId.has(id))
  const posicao = nova.indexOf(idMovido)
  if (posicao < 0) return null
  const ordem = ordemEntre(ordemPorId.get(nova[posicao - 1]), ordemPorId.get(nova[posicao + 1]))
  if (ordem !== null) return [{ id: idMovido, ordem }]
  return nova.map((id, indice) => ({ id, ordem: indice + 1 }))
}

function ordemEntre(anterior?: number, posterior?: number) {
  if (anterior === undefined) return posterior === undefined ? 1 : posterior - 1
  if (posterior === undefined) return anterior + 1
  const meio = (anterior + posterior) / 2
  return meio > anterior && meio < posterior ? meio : null
}
