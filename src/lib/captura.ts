import { z } from 'zod'
import type { DataLocal } from '@/db/types'
import { isDataLocalValida } from '@/lib/datas'
import { esquemaTituloTarefa } from '@/lib/esquemas'

/** Regras da captura rápida do Início (o que criar, onde e quando). */

/** Tarefa solta ou grupo novo (com itens). Item num grupo que já existe = Tarefa + grupo escolhido. */
export type TipoCaptura = 'tarefa' | 'grupo'

/** O que o campo mostra: texto da tarefa, nome + itens do grupo novo ou itens do grupo escolhido. */
export type ModoDoCampo = 'tarefa' | 'grupo' | 'itens'

export function modoDoCampo(tipo: TipoCaptura, seriesId?: string): ModoDoCampo {
  if (tipo === 'grupo') return 'grupo'
  return seriesId ? 'itens' : 'tarefa'
}

/**
 * Texto apagado do campo, um por modo: na Tarefa, no campo do título; no Grupo, na linha do nome;
 * com um grupo escolhido, só na 1ª linha de item (a caixinha já indica as outras).
 */
export const DICA_DO_CAMPO: Record<ModoDoCampo, string> = {
  tarefa: 'Escreva a tarefa a ser feita',
  grupo: 'Crie o grupo e coloque a(s) tarefa(s) a ser(em) feita(s)',
  itens: 'Escreva a tarefa do grupo',
}

/**
 * Tarefa: a 1ª linha preenchida do texto é o título e as seguintes viram a anotação (só as linhas
 * em branco das pontas saem).
 */
export function dividirTexto(texto: string) {
  const linhas = texto.split(/\r?\n/)
  const primeira = linhas.findIndex((linha) => linha.trim() !== '')
  if (primeira === -1) return { titulo: '', anotacao: '' }
  return {
    titulo: linhas[primeira].trim(),
    anotacao: linhas
      .slice(primeira + 1)
      .join('\n')
      .trim(),
  }
}

/**
 * Nome do grupo = 1ª linha do texto da tarefa. Trocar de modo não perde nada: o nome edita só
 * essa linha e a anotação que estava embaixo volta quando se retorna à Tarefa.
 */
export function primeiraLinha(texto: string) {
  return texto.split(/\r?\n/)[0]
}

export function trocarPrimeiraLinha(texto: string, linha: string) {
  const [, ...resto] = texto.split(/\r?\n/)
  return [linha, ...resto].join('\n')
}

/** Ao ir para o modo Grupo, as linhas em branco do topo saem para o título virar o nome. */
export function semLinhasVaziasNoTopo(texto: string) {
  return texto.replace(/^(?:[ \t]*\r?\n)+/, '')
}

/** Estado da captura que muda ao escolher (ou tirar) o grupo. */
export interface CampoDaCaptura {
  texto: string
  itens: string[]
  seriesId?: string
}

/**
 * Escolher um grupo na Tarefa: cada linha preenchida do texto vira um item (o texto continua
 * guardado). Voltar para "Sem grupo" faz o caminho inverso: os itens voltam a ser o texto, com o
 * 1º como título. Trocar de um grupo para outro não mexe nos itens.
 */
export function escolherGrupoDaCaptura(
  campo: CampoDaCaptura,
  seriesId: string | undefined,
): CampoDaCaptura {
  if (seriesId && campo.seriesId) return { ...campo, seriesId }
  if (seriesId) {
    const linhas = campo.texto.split(/\r?\n/).filter((linha) => linha.trim() !== '')
    return { ...campo, seriesId, itens: linhas.length > 0 ? linhas : [''] }
  }
  if (!campo.seriesId) return campo
  return { texto: itensPreenchidos(campo.itens).join('\n'), itens: [''], seriesId: undefined }
}

export const esquemaCaptura = z
  .object({
    /** Texto da tarefa (título + anotação); no modo Grupo, a 1ª linha é o nome do grupo. */
    texto: z.string(),
    /** Linhas de item do grupo novo ou do grupo escolhido, na ordem; as vazias são ignoradas. */
    itens: z.array(z.string()),
    tipo: z.enum(['tarefa', 'grupo']),
    categoryId: z.string().optional(),
    subcategoryId: z.string().optional(),
    /** Grupo que já existe escolhido na Tarefa: o texto vira item dele. */
    seriesId: z.string().optional(),
    data: z.string().refine(isDataLocalValida, 'Escolha um dia.'),
  })
  .superRefine((captura, contexto) => {
    const modo = modoDoCampo(captura.tipo, captura.seriesId)
    if (modo !== 'itens') {
      const titulo =
        modo === 'tarefa' ? dividirTexto(captura.texto).titulo : primeiraLinha(captura.texto)
      const resultado = esquemaTituloTarefa.safeParse(titulo)
      if (!resultado.success) {
        contexto.addIssue({
          code: 'custom',
          path: ['texto'],
          message: resultado.error.issues[0].message,
        })
      }
    }
    if (modo === 'tarefa') return
    for (const [indice, linha] of captura.itens.entries()) {
      if (linha.trim() === '') continue
      const resultado = esquemaTituloTarefa.safeParse(linha)
      if (resultado.success) continue
      contexto.addIssue({
        code: 'custom',
        path: ['itens'],
        message: `Item ${indice + 1}: ${resultado.error.issues[0].message}`,
      })
      break
    }
    if (modo === 'itens' && itensPreenchidos(captura.itens).length === 0) {
      contexto.addIssue({ code: 'custom', path: ['itens'], message: 'Escreva um item.' })
    }
  })

export type CapturaInput = z.infer<typeof esquemaCaptura>

/** Títulos dos itens do grupo, sem espaços nas pontas e sem linhas vazias, na ordem. */
export function itensPreenchidos(itens: string[]) {
  return itens.map((item) => item.trim()).filter((titulo) => titulo.length > 0)
}

/** Linhas de item depois de uma edição e qual delas recebe o foco (cursor no fim, se não dito). */
export interface EdicaoDeItens {
  itens: string[]
  foco: number
  cursor?: number
}

/** Enter num item: uma linha vazia logo abaixo, já focada. */
export function inserirItemDepois(itens: string[], indice: number): EdicaoDeItens {
  return { itens: itens.toSpliced(indice + 1, 0, ''), foco: indice + 1 }
}

/**
 * Backspace num item vazio: a linha sai e o foco volta para a anterior (`-1` = o nome do grupo).
 * Sobra sempre uma linha para digitar: a única linha não sai, só o foco sobe.
 */
export function removerItemVazio(itens: string[], indice: number): EdicaoDeItens {
  if (itens.length === 1) return { itens, foco: indice - 1 }
  return { itens: itens.toSpliced(indice, 1), foco: indice - 1 }
}

/**
 * Colar várias linhas num item: o que vem antes do cursor junta com a 1ª linha colada, cada linha
 * seguinte vira um item e o resto do item vai para o fim da última. Linhas em branco saem.
 * `null` quando o texto colado tem uma linha só (o colar normal do campo resolve).
 */
export function colarNoItem(
  itens: string[],
  indice: number,
  colado: string,
  selecao: { inicio: number; fim: number },
): EdicaoDeItens | null {
  const linhas = colado.split(/\r?\n/).filter((linha) => linha.trim() !== '')
  if (linhas.length < 2) return null
  const atual = itens[indice]
  const antes = atual.slice(0, selecao.inicio)
  const depois = atual.slice(selecao.fim)
  const novas = linhas.map((linha, posicao) => {
    const texto = posicao === 0 ? antes + linha : linha
    return posicao === linhas.length - 1 ? texto + depois : texto
  })
  const ultima = indice + novas.length - 1
  return {
    itens: itens.toSpliced(indice, 1, ...novas),
    foco: ultima,
    cursor: novas[novas.length - 1].length - depois.length,
  }
}

/** "dd/MM" de uma data local. */
export function diaEMes(data: DataLocal) {
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

/** Aviso depois de criar a tarefa, ex.: "Tarefa criada para 03/11". */
export function textoTarefaCriada(data: DataLocal) {
  return `Tarefa criada para ${diaEMes(data)}`
}

function quantosItens(quantidade: number) {
  return quantidade === 1 ? '1 item' : `${quantidade} itens`
}

/** Aviso depois de criar o grupo, ex.: "Grupo Casa criado com 3 itens · 02/11". */
export function textoGrupoCriado(grupo: string, quantidade: number, data: DataLocal) {
  const itens = quantidade === 0 ? '' : ` com ${quantosItens(quantidade)}`
  return `Grupo ${grupo} criado${itens} · ${diaEMes(data)}`
}

/** Aviso depois de pôr itens num grupo, ex.: "2 itens adicionados a Casa · 01/11". */
export function textoItensAdicionados(quantidade: number, grupo: string, data: DataLocal) {
  const adicionados = quantidade === 1 ? 'adicionado' : 'adicionados'
  return `${quantosItens(quantidade)} ${adicionados} a ${grupo} · ${diaEMes(data)}`
}
