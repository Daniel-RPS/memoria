/**
 * Regras puras da seleção múltipla (Shift+clique, Ctrl+clique) e do movimento em lote: sem tela
 * e sem banco. A tela lê o estado e a ordem visível; o repositório (`lote-repository`) grava.
 */

/** O que está selecionado: linhas (tarefas soltas e itens) OU subetapas de UMA tarefa/item. */
export type TipoDeSelecao = 'linhas' | 'subetapas'

export interface EstadoDaSelecao {
  ids: Set<string>
  tipo: TipoDeSelecao
  /** Dono das subetapas selecionadas (só com `tipo` `subetapas`). */
  dono?: string | undefined
  /** Última linha clicada: o início do intervalo do próximo Shift+clique. */
  ancora: string | null
}

export const SELECAO_VAZIA: EstadoDaSelecao = { ids: new Set(), tipo: 'linhas', ancora: null }

/** Uma linha que dá para selecionar, na ordem em que aparece na tela. */
export interface AlvoDeClique {
  id: string
  tipo: TipoDeSelecao
  dono?: string | undefined
}

export interface Modificadores {
  shift: boolean
  /** Ctrl no Windows e Linux, ⌘ no Mac. */
  ctrl: boolean
}

function isDoMesmoGrupo(
  a: Pick<AlvoDeClique, 'tipo' | 'dono'>,
  b: Pick<AlvoDeClique, 'tipo' | 'dono'>,
) {
  return a.tipo === b.tipo && (a.tipo === 'linhas' || a.dono === b.dono)
}

/**
 * Shift+clique seleciona o intervalo entre a última clicada e esta (troca a seleção; com Ctrl
 * junto, soma); Ctrl+clique põe ou tira esta; um clique com modificador sem âncora seleciona só
 * esta. Subetapas não se misturam com linhas nem com as de outro dono: a seleção anterior é
 * trocada. `ordem` são as linhas visíveis, na ordem da tela.
 */
export function aplicarClique(
  estado: EstadoDaSelecao,
  alvo: AlvoDeClique,
  modificadores: Modificadores,
  ordem: AlvoDeClique[],
): EstadoDaSelecao {
  const mudouDeGrupo = !isDoMesmoGrupo(estado, alvo)
  const base = mudouDeGrupo ? new Set<string>() : new Set(estado.ids)
  const ancora = mudouDeGrupo ? null : estado.ancora
  const tipo = alvo.tipo
  const dono = alvo.tipo === 'subetapas' ? alvo.dono : undefined

  const mesmoGrupo = ordem.filter((outro) => isDoMesmoGrupo(outro, alvo))
  const indiceAncora = ancora === null ? -1 : mesmoGrupo.findIndex((outro) => outro.id === ancora)
  const indiceAlvo = mesmoGrupo.findIndex((outro) => outro.id === alvo.id)

  if (modificadores.shift && indiceAncora >= 0 && indiceAlvo >= 0) {
    const [inicio, fim] = [indiceAncora, indiceAlvo].sort((a, b) => a - b)
    const intervalo = mesmoGrupo.slice(inicio, fim + 1).map((outro) => outro.id)
    const ids = modificadores.ctrl ? new Set([...base, ...intervalo]) : new Set(intervalo)
    return { ids, tipo, dono, ancora }
  }
  if (modificadores.ctrl) {
    if (base.has(alvo.id)) base.delete(alvo.id)
    else base.add(alvo.id)
    return { ids: base, tipo, dono, ancora: alvo.id }
  }
  return { ids: new Set([alvo.id]), tipo, dono, ancora: alvo.id }
}

/**
 * Lista depois de soltar o bloco `movidos` (já na ordem da tela) sobre `idAlvo`: o bloco entra
 * junto, na ordem, depois do alvo se ele subia de cima (como o arrastar de um só) ou antes dele
 * se vinha de baixo. Soltar sobre um dos próprios movidos não muda nada.
 */
export function inserirBloco(lista: string[], movidos: string[], idAlvo: string): string[] {
  const conjunto = new Set(movidos)
  if (conjunto.has(idAlvo)) return lista
  const indiceAlvo = lista.indexOf(idAlvo)
  if (indiceAlvo < 0) return lista
  const primeiroMovido = lista.findIndex((id) => conjunto.has(id))
  const isDescendo = primeiroMovido >= 0 && primeiroMovido < indiceAlvo
  const resto = lista.filter((id) => !conjunto.has(id))
  const posicao = resto.indexOf(idAlvo) + (isDescendo ? 1 : 0)
  // Os movidos entram juntos, na ordem recebida (também os que vêm de outra lista).
  return [...resto.slice(0, posicao), ...movidos, ...resto.slice(posicao)]
}

/**
 * Sobe (`-1`) ou desce (`1`) as selecionadas uma posição (Alt+↑/↓): cada uma troca de lugar com
 * a vizinha não selecionada; as que já estão na ponta ficam. Selecionadas juntas andam juntas.
 */
export function deslocar(lista: string[], selecionadas: Set<string>, direcao: -1 | 1): string[] {
  const resultado = [...lista]
  const indices = resultado.map((_, indice) => indice)
  for (const indice of direcao === -1 ? indices : indices.reverse()) {
    const vizinho = indice + direcao
    if (!selecionadas.has(resultado[indice])) continue
    if (vizinho < 0 || vizinho >= resultado.length || selecionadas.has(resultado[vizinho])) continue
    ;[resultado[indice], resultado[vizinho]] = [resultado[vizinho], resultado[indice]]
  }
  return resultado
}

/**
 * Valores de `ordem` para `quantidade` itens colocados entre `anterior` e `posterior` (os
 * vizinhos que não se mexeram). `null` quando não cabe (é preciso renumerar a lista).
 */
export function ordensEntre(
  anterior: number | undefined,
  posterior: number | undefined,
  quantidade: number,
): number[] | null {
  if (quantidade <= 0) return []
  const passo =
    anterior === undefined || posterior === undefined
      ? 1
      : (posterior - anterior) / (quantidade + 1)
  const inicio = anterior ?? (posterior === undefined ? 0 : posterior - quantidade)
  const valores = Array.from({ length: quantidade }, (_, indice) =>
    anterior === undefined && posterior !== undefined
      ? inicio + indice
      : inicio + passo * (indice + 1),
  )
  const isCrescente = valores.every(
    (valor, indice) =>
      (indice === 0 || valor > valores[indice - 1]) &&
      (anterior === undefined || valor > anterior) &&
      (posterior === undefined || valor < posterior),
  )
  return isCrescente ? valores : null
}

/** Novo `ordem` de cada um dos movidos, ou a lista inteira a renumerar se não coube. */
export type PlanoDeOrdem = { tipo: 'ordens'; ordens: Map<string, number> } | { tipo: 'renumerar' }

/**
 * Dá `ordem` aos `movidos` (que estão em `idsEmOrdem`, na posição final) sem tocar nos outros:
 * cada sequência seguida de movidos recebe valores entre os dois vizinhos que ficaram parados.
 */
export function planejarOrdens(
  idsEmOrdem: string[],
  movidos: Set<string>,
  ordemDe: (id: string) => number,
): PlanoDeOrdem {
  const ordens = new Map<string, number>()
  let indice = 0
  while (indice < idsEmOrdem.length) {
    if (!movidos.has(idsEmOrdem[indice])) {
      indice += 1
      continue
    }
    let fim = indice
    while (fim + 1 < idsEmOrdem.length && movidos.has(idsEmOrdem[fim + 1])) fim += 1
    const sequencia = idsEmOrdem.slice(indice, fim + 1)
    const anterior = indice > 0 ? ordemDe(idsEmOrdem[indice - 1]) : undefined
    const posterior = fim + 1 < idsEmOrdem.length ? ordemDe(idsEmOrdem[fim + 1]) : undefined
    const valores = ordensEntre(anterior, posterior, sequencia.length)
    if (!valores) return { tipo: 'renumerar' }
    sequencia.forEach((id, posicao) => ordens.set(id, valores[posicao]))
    indice = fim + 1
  }
  return { tipo: 'ordens', ordens }
}
