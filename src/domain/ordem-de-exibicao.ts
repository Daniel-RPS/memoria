import type { OrdemNoTopo } from '@/db/types'

/**
 * Ordem de EXIBIÇÃO das pendentes (tarefas soltas e itens de cada grupo), calculada na hora e sem
 * reescrever o campo `ordem` salvo: parar o andamento ou tirar a prioridade faz o registro
 * voltar sozinho ao lugar que a `ordem` dele manda. Blocos, de cima para baixo:
 *   1. prioridade E em andamento · 2. em andamento · 3. prioridade · 4. demais, na ordem manual.
 * Os blocos do topo seguem a ordem em que foram marcados, a não ser que a pessoa arraste dentro
 * do bloco (`ordemNoTopo`). As concluídas ficam fora: têm o bloco próprio no fim do dia.
 */

/** O que a ordem de exibição lê de uma tarefa ou item. */
export interface Ordenavel {
  ordem: number
  emAndamento?: boolean | undefined
  emAndamentoDesde?: string | undefined
  prioridade?: boolean | undefined
  prioridadeDesde?: string | undefined
  ordemNoTopo?: OrdemNoTopo | undefined
}

/** Posição do bloco, de 0 (prioridade E andamento) a 3 (demais). */
export type Bloco = 0 | 1 | 2 | 3

export const BLOCO_DEMAIS: Bloco = 3

export function blocoDe(registro: Ordenavel): Bloco {
  const isEmAndamento = registro.emAndamento === true
  const isPrioritario = registro.prioridade === true
  if (isEmAndamento && isPrioritario) return 0
  if (isEmAndamento) return 1
  if (isPrioritario) return 2
  return BLOCO_DEMAIS
}

/** Bloco de cima: quem tem prioridade ou está em andamento. */
export function isDoTopo(bloco: Bloco) {
  return bloco !== BLOCO_DEMAIS
}

/**
 * Identifica "este bloco com estas marcas": a posição arrastada só vale enquanto a chave é a
 * mesma. Marcar de novo (momento novo) ou trocar de bloco muda a chave, e a posição velha é
 * ignorada sem precisar apagar nada.
 */
export function chaveDoTopo(registro: Ordenavel) {
  return `${blocoDe(registro)}|${registro.emAndamentoDesde ?? ''}|${registro.prioridadeDesde ?? ''}`
}

function posicaoValida(registro: Ordenavel) {
  const posicao = registro.ordemNoTopo
  return posicao && posicao.chave === chaveDoTopo(registro) ? posicao.posicao : undefined
}

/** Quem ainda não foi arrastado vem pela hora da marcação (andamento primeiro, depois prioridade). */
function horaDaMarcacao(registro: Ordenavel, bloco: Bloco) {
  const andamento = registro.emAndamentoDesde ?? ''
  const prioridade = registro.prioridadeDesde ?? ''
  return bloco === 0 ? `${andamento}|${prioridade}` : bloco === 1 ? andamento : prioridade
}

function comparar(a: Ordenavel, b: Ordenavel) {
  const blocoA = blocoDe(a)
  const blocoB = blocoDe(b)
  if (blocoA !== blocoB) return blocoA - blocoB
  if (blocoA !== BLOCO_DEMAIS) {
    const posicaoA = posicaoValida(a)
    const posicaoB = posicaoValida(b)
    if (posicaoA !== undefined && posicaoB !== undefined && posicaoA !== posicaoB) {
      return posicaoA - posicaoB
    }
    // Quem foi arrastado fica antes de quem chegou depois (que entra no fim, pela hora).
    if ((posicaoA === undefined) !== (posicaoB === undefined))
      return posicaoA === undefined ? 1 : -1
    const horaA = horaDaMarcacao(a, blocoA)
    const horaB = horaDaMarcacao(b, blocoB)
    if (horaA !== horaB) return horaA < horaB ? -1 : 1
  }
  return a.ordem - b.ordem
}

/**
 * Ordena para mostrar (ver o topo do arquivo). Não muda a lista recebida nem os registros.
 * `ler` extrai o que é ordenável quando a lista mistura outros tipos (ex.: cards do dia, que
 * ficam sempre nos "demais", pela `ordem` do dia).
 */
export function sortForDisplay<T extends Ordenavel>(registros: T[]): T[]
export function sortForDisplay<T>(registros: T[], ler: (registro: T) => Ordenavel): T[]
export function sortForDisplay<T>(
  registros: T[],
  ler: (registro: T) => Ordenavel = (registro) => registro as unknown as Ordenavel,
): T[] {
  return registros
    .map((registro, indice) => ({ registro, indice, lido: ler(registro) }))
    .sort((a, b) => comparar(a.lido, b.lido) || a.indice - b.indice)
    .map(({ registro }) => registro)
}

/**
 * Arrastar não atravessa blocos: reordena estavelmente pelo bloco de cada id, então o item
 * solto fora do próprio bloco para na borda dele. `blocoDoId` devolve `undefined` para o que não
 * tem bloco (vale como "demais").
 */
export function manterBlocos(ids: string[], blocoDoId: (id: string) => Bloco | undefined) {
  return ids
    .map((id, indice) => ({ id, indice, bloco: blocoDoId(id) ?? BLOCO_DEMAIS }))
    .sort((a, b) => a.bloco - b.bloco || a.indice - b.indice)
    .map(({ id }) => id)
}

/** O que gravar depois de reordenar `idMovido`: o bloco do topo inteiro, ou a escala comum. */
export type Gravacao = { tipo: 'topo'; ids: string[] } | { tipo: 'ordem'; ids: string[] }

/**
 * `idsEmOrdem` já com o movido no lugar e os blocos mantidos. Mexer num bloco do topo grava a
 * posição só dos membros daquele bloco; mexer nos demais grava a `ordem` entre vizinhos dos
 * demais (os do topo não entram: a `ordem` deles não segue a posição na tela).
 */
export function planejarGravacao(
  idsEmOrdem: string[],
  idMovido: string,
  blocoDoId: (id: string) => Bloco | undefined,
): Gravacao {
  const bloco = blocoDoId(idMovido) ?? BLOCO_DEMAIS
  if (isDoTopo(bloco)) {
    return { tipo: 'topo', ids: idsEmOrdem.filter((id) => blocoDoId(id) === bloco) }
  }
  return { tipo: 'ordem', ids: idsParaOrdemComum(idsEmOrdem, idMovido, blocoDoId) }
}

/**
 * Os ids que servem de vizinhos para gravar `ordem`: só os "demais", mais o movido (que, vindo
 * do topo ou de outra lista, entra onde foi solto entre eles).
 */
export function idsParaOrdemComum(
  idsEmOrdem: string[],
  idMovido: string,
  blocoDoId: (id: string) => Bloco | undefined,
) {
  return idsEmOrdem.filter(
    (id) => id === idMovido || (blocoDoId(id) ?? BLOCO_DEMAIS) === BLOCO_DEMAIS,
  )
}
