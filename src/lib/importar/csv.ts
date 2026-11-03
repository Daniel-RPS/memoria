import type { DataLocal } from '@/db/types'
import { isDataLocalValida } from '@/lib/datas'
import { normalizar } from '@/lib/procedimentos'
import { rascunhoVazio, type GrupoImportado } from '@/lib/importar/rascunho'

/**
 * CSV de tarefas: a 1ª linha é o cabeçalho; colunas título, data, categoria, concluída e grupo
 * (mapeadas na prévia). Linha com grupo vira item do grupo daquele nome e dia; sem grupo, tarefa.
 * Aceita vírgula, ponto e vírgula ou tab, e campos entre aspas (com "" dentro).
 */

export const CAMPOS_DO_CSV = ['titulo', 'data', 'categoria', 'concluida', 'grupo'] as const
export type CampoDoCsv = (typeof CAMPOS_DO_CSV)[number]

export const ROTULO_DO_CAMPO: Record<CampoDoCsv, string> = {
  titulo: 'Título',
  data: 'Data',
  categoria: 'Categoria',
  concluida: 'Concluída',
  grupo: 'Grupo',
}

/** Coluna (índice) de cada campo; `null` = não usar. */
export type MapeamentoDoCsv = Record<CampoDoCsv, number | null>

/** Nomes de cabeçalho reconhecidos sozinhos (sem acento e maiúscula). */
const NOMES_CONHECIDOS: Record<CampoDoCsv, string[]> = {
  titulo: ['titulo', 'title', 'tarefa', 'task', 'nome', 'name', 'item', 'descricao'],
  data: ['data', 'date', 'dia', 'day', 'vencimento', 'prazo', 'due', 'duedate'],
  categoria: ['categoria', 'category', 'rotulo', 'label', 'tag', 'etiqueta'],
  concluida: ['concluida', 'concluido', 'feito', 'feita', 'done', 'completed', 'status'],
  grupo: ['grupo', 'group', 'lista', 'list', 'projeto', 'project'],
}

const VALORES_DE_CONCLUIDA = [
  'sim',
  's',
  'x',
  'true',
  '1',
  'yes',
  'y',
  'feito',
  'feita',
  'concluida',
  'concluido',
  'done',
  'completed',
]

export interface TabelaCsv {
  cabecalho: string[]
  linhas: string[][]
}

/** Vírgula, ponto e vírgula ou tab: o que mais aparece na 1ª linha (fora de aspas). */
function separadorDe(primeiraLinha: string) {
  const candidatos = [',', ';', '\t']
  let melhor = ','
  let maior = -1
  for (const candidato of candidatos) {
    const vezes = primeiraLinha.replace(/"[^"]*"/g, '').split(candidato).length - 1
    if (vezes > maior) {
      melhor = candidato
      maior = vezes
    }
  }
  return melhor
}

/** Lê o texto do CSV em linhas e campos (RFC 4180: aspas, "" e quebra de linha dentro de aspas). */
export function lerTabelaCsv(texto: string): TabelaCsv {
  const limpo = texto.replace(/^﻿/, '')
  const separador = separadorDe(limpo.split(/\r?\n/, 1)[0] ?? '')
  const linhas: string[][] = []
  let campo = ''
  let linha: string[] = []
  let isEntreAspas = false
  for (let indice = 0; indice < limpo.length; indice++) {
    const letra = limpo[indice]
    if (isEntreAspas) {
      if (letra === '"' && limpo[indice + 1] === '"') {
        campo += '"'
        indice++
      } else if (letra === '"') isEntreAspas = false
      else campo += letra
      continue
    }
    if (letra === '"' && campo === '') isEntreAspas = true
    else if (letra === separador) {
      linha.push(campo)
      campo = ''
    } else if (letra === '\n' || letra === '\r') {
      if (letra === '\r' && limpo[indice + 1] === '\n') indice++
      linha.push(campo)
      linhas.push(linha)
      linha = []
      campo = ''
    } else campo += letra
  }
  if (campo !== '' || linha.length > 0) {
    linha.push(campo)
    linhas.push(linha)
  }
  const preenchidas = linhas.filter((campos) => campos.some((valor) => valor.trim() !== ''))
  const [cabecalho = [], ...resto] = preenchidas
  return { cabecalho: cabecalho.map((nome) => nome.trim()), linhas: resto }
}

const semSimbolos = (texto: string) => normalizar(texto).replace(/[^a-z0-9]/g, '')

/** Mapeamento pelo nome das colunas; sem título reconhecido, a 1ª coluna é o título. */
export function sugerirMapeamento(cabecalho: string[]): MapeamentoDoCsv {
  const nomes = cabecalho.map(semSimbolos)
  const mapeamento = Object.fromEntries(
    CAMPOS_DO_CSV.map((campo) => {
      const indice = nomes.findIndex((nome) => NOMES_CONHECIDOS[campo].includes(nome))
      return [campo, indice >= 0 ? indice : null]
    }),
  ) as MapeamentoDoCsv
  if (mapeamento.titulo === null && cabecalho.length > 0) mapeamento.titulo = 0
  return mapeamento
}

/** "2026-11-03", "03/11/2026" ou "3/11/26" → data local; o resto, `undefined`. */
export function lerDataDoCsv(valor: string): DataLocal | undefined {
  const limpo = valor.trim()
  if (isDataLocalValida(limpo)) return limpo
  const brasileira = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(limpo)
  if (!brasileira) return undefined
  const [, dia, mes, ano] = brasileira
  const anoCompleto = ano.length === 2 ? `20${ano}` : ano
  const data = `${anoCompleto}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  return isDataLocalValida(data) ? data : undefined
}

function isConcluida(valor: string) {
  return VALORES_DE_CONCLUIDA.includes(semSimbolos(valor))
}

/** Monta o rascunho com o mapeamento escolhido; linha sem título ou data ruim vira aviso. */
export function montarRascunhoDoCsv(
  tabela: TabelaCsv,
  mapeamento: MapeamentoDoCsv,
  origem = 'csv',
) {
  const rascunho = rascunhoVazio()
  if (mapeamento.titulo === null) {
    rascunho.avisos.push('Escolha a coluna do título.')
    return rascunho
  }
  const grupos = new Map<string, GrupoImportado>()
  const valor = (campos: string[], campo: CampoDoCsv) => {
    const indice = mapeamento[campo]
    return indice === null ? '' : (campos[indice] ?? '').trim()
  }

  tabela.linhas.forEach((campos, indice) => {
    // +2: a contagem começa em 1 e a 1ª linha do arquivo é o cabeçalho.
    const numero = indice + 2
    const titulo = valor(campos, 'titulo')
    if (!titulo) {
      rascunho.avisos.push(`Linha ${numero}: sem título.`)
      return
    }
    const textoDaData = valor(campos, 'data')
    const data = textoDaData ? lerDataDoCsv(textoDaData) : undefined
    if (textoDaData && !data) {
      rascunho.avisos.push(
        `Linha ${numero}: data “${textoDaData}” não reconhecida; vai para o dia escolhido.`,
      )
    }
    const categoria = valor(campos, 'categoria') || undefined
    const isFeita = isConcluida(valor(campos, 'concluida'))
    const nomeDoGrupo = valor(campos, 'grupo')

    if (nomeDoGrupo) {
      const chaveDoGrupo = `${semSimbolos(nomeDoGrupo)}|${data ?? ''}`
      let grupo = grupos.get(chaveDoGrupo)
      if (!grupo) {
        grupo = { chave: `${origem}:g${numero}`, titulo: nomeDoGrupo, data, itens: [], categoria }
        grupos.set(chaveDoGrupo, grupo)
        rascunho.grupos.push(grupo)
      }
      grupo.itens.push({ titulo, isConcluido: isFeita })
      return
    }
    rascunho.tarefas.push({
      chave: `${origem}:t${numero}`,
      titulo,
      data,
      isConcluida: isFeita,
      subtarefas: [],
      categoria,
    })
  })
  return rascunho
}
