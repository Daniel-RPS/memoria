/** Colunas do quadro da semana: para cada dia, os ids das pendentes em ordem. */
export type Colunas = Record<string, string[]>

/** Em qual coluna está o item (ou `undefined`). */
export function colunaDe(colunas: Colunas, id: string) {
  return Object.keys(colunas).find((coluna) => colunas[coluna].includes(id))
}

/**
 * Tira `id` da coluna atual e o coloca em `destino`, na posição `indice`
 * (no fim, se `indice` for omitido ou passar do tamanho). Não altera `colunas`.
 */
export function moverEntreColunas(
  colunas: Colunas,
  id: string,
  destino: string,
  indice?: number,
): Colunas {
  const origem = colunaDe(colunas, id)
  if (origem === undefined) return colunas
  const semItem = colunas[origem].filter((item) => item !== id)
  const alvo = origem === destino ? semItem : [...colunas[destino]]
  const posicao = indice === undefined ? alvo.length : Math.min(Math.max(indice, 0), alvo.length)
  alvo.splice(posicao, 0, id)
  return { ...colunas, [origem]: semItem, [destino]: alvo }
}
