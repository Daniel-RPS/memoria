import {
  deDataLocal,
  diasEntre,
  isDataLocalValida,
  paraDataLocal,
  somarDias,
} from '@/lib/datas'
import type { DataLocal } from '@/db/types'
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PRIMEIRO_DIA_DA_SEMANA } from '@/lib/semana'
import { z } from 'zod'

/** Tipo único e compartilhado para o filtro de período em Dados (Visão geral, Números e Tempo). */
export type PeriodoDeDados =
  | { tipo: 'hoje' }
  | { tipo: 'semana' }
  | { tipo: 'mes' }
  | { tipo: 'escolher'; dias: DataLocal[] }

export const PERIODO_PADRAO_DADOS: PeriodoDeDados = { tipo: 'semana' }

const esquemaPeriodoDeDados = z.union([
  z.object({ tipo: z.literal('hoje') }),
  z.object({ tipo: z.literal('semana') }),
  z.object({ tipo: z.literal('mes') }),
  z.object({ tipo: z.literal('escolher'), dias: z.array(z.string()) }),
  // Formatos legados para migração:
  z.object({ tipo: z.literal('dia'), dia: z.string() }),
  z.object({ tipo: z.literal('intervalo'), inicio: z.string(), fim: z.string() }),
])

/**
 * Lê o período salvo no localStorage com try/catch e migração:
 * - Se texto legado { tipo: 'dia', dia } -> { tipo: 'escolher', dias: [dia] }
 * - Se texto legado { tipo: 'intervalo', inicio, fim } -> expandido em dias
 * - Inválido ou nulo -> padrão 'semana'.
 */
export function lerPeriodoDeDados(texto: string | null): PeriodoDeDados {
  if (!texto) return PERIODO_PADRAO_DADOS
  try {
    const parseado = JSON.parse(texto)
    const validado = esquemaPeriodoDeDados.safeParse(parseado)
    if (!validado.success) return PERIODO_PADRAO_DADOS
    const d = validado.data
    if (d.tipo === 'hoje' || d.tipo === 'semana' || d.tipo === 'mes') {
      return { tipo: d.tipo }
    }
    if (d.tipo === 'escolher') {
      const diasValidos = normalizarDias(d.dias)
      return diasValidos.length > 0
        ? { tipo: 'escolher', dias: diasValidos }
        : PERIODO_PADRAO_DADOS
    }
    if (d.tipo === 'dia') {
      if (isDataLocalValida(d.dia)) {
        return { tipo: 'escolher', dias: [d.dia] }
      }
      return PERIODO_PADRAO_DADOS
    }
    if (d.tipo === 'intervalo') {
      if (isDataLocalValida(d.inicio) && isDataLocalValida(d.fim)) {
        return {
          tipo: 'escolher',
          dias: expandirIntervalosEmDias([{ inicio: d.inicio, fim: d.fim }]),
        }
      }
      return PERIODO_PADRAO_DADOS
    }
    return PERIODO_PADRAO_DADOS
  } catch {
    return PERIODO_PADRAO_DADOS
  }
}

/** Um intervalo contínuo entre duas datas locais (inclusive). */
export interface IntervaloDeDias {
  inicio: DataLocal
  fim: DataLocal
}

/**
 * Normaliza um conjunto ou lista de datas:
 * - Filtra inválidas
 * - Elimina duplicadas
 * - Ordena cronologicamente
 */
export function normalizarDias(dias: Iterable<DataLocal>): DataLocal[] {
  const unicos = new Set<DataLocal>()
  for (const dia of dias) {
    if (isDataLocalValida(dia)) {
      unicos.add(dia)
    }
  }
  return Array.from(unicos).sort()
}

/**
 * Agrupa dias ordenados e consecutivos em intervalos.
 */
export function agruparDiasEmIntervalos(dias: Iterable<DataLocal>): IntervaloDeDias[] {
  const ordenados = normalizarDias(dias)
  if (ordenados.length === 0) return []

  const intervalos: IntervaloDeDias[] = []
  let inicioAtual = ordenados[0]
  let fimAtual = ordenados[0]

  for (let i = 1; i < ordenados.length; i += 1) {
    const dia = ordenados[i]
    if (diasEntre(fimAtual, dia) === 1) {
      fimAtual = dia
    } else {
      intervalos.push({ inicio: inicioAtual, fim: fimAtual })
      inicioAtual = dia
      fimAtual = dia
    }
  }
  intervalos.push({ inicio: inicioAtual, fim: fimAtual })

  return intervalos
}

/**
 * Expande intervalos em uma lista de dias locais sem repetição e ordenados.
 */
export function expandirIntervalosEmDias(intervalos: Iterable<IntervaloDeDias>): DataLocal[] {
  const unicos = new Set<DataLocal>()
  for (const { inicio, fim } of intervalos) {
    if (!isDataLocalValida(inicio) || !isDataLocalValida(fim)) continue
    const [de, ate] = inicio <= fim ? [inicio, fim] : [fim, inicio]
    let cursor = de
    while (cursor <= ate) {
      unicos.add(cursor)
      cursor = somarDias(cursor, 1)
    }
  }
  return Array.from(unicos).sort()
}

/** Resolve os dias locais (ordenados e sem duplicatas) cobertos pelo período em relação a `hoje`. */
export function resolverDiasDoPeriodo(periodo: PeriodoDeDados, hoje: DataLocal): DataLocal[] {
  const dataHoje = deDataLocal(hoje)
  switch (periodo.tipo) {
    case 'hoje':
      return [hoje]
    case 'semana': {
      const inicio = paraDataLocal(
        startOfWeek(dataHoje, { weekStartsOn: PRIMEIRO_DIA_DA_SEMANA }),
      )
      const fim = paraDataLocal(endOfWeek(dataHoje, { weekStartsOn: PRIMEIRO_DIA_DA_SEMANA }))
      return expandirIntervalosEmDias([{ inicio, fim }])
    }
    case 'mes': {
      const inicio = paraDataLocal(startOfMonth(dataHoje))
      const fim = paraDataLocal(endOfMonth(dataHoje))
      return expandirIntervalosEmDias([{ inicio, fim }])
    }
    case 'escolher':
      return normalizarDias(periodo.dias)
  }
}

/**
 * Interpreta string no formato "dd/mm" ou "dd/mm/aaaa" (ou "dd/mm/aa").
 */
export function interpretarDataDigitada(
  texto: string,
  anoReferencia: number = new Date().getFullYear(),
): DataLocal | undefined {
  const limpo = texto.trim()
  if (!limpo) return undefined

  const partes = limpo.split('/')
  if (partes.length < 2 || partes.length > 3) return undefined

  const diaNum = parseInt(partes[0], 10)
  const mesNum = parseInt(partes[1], 10)
  if (Number.isNaN(diaNum) || Number.isNaN(mesNum)) return undefined
  if (diaNum < 1 || diaNum > 31 || mesNum < 1 || mesNum > 12) return undefined

  let anoNum = anoReferencia
  if (partes.length === 3) {
    const anoStr = partes[2].trim()
    if (!anoStr) return undefined
    const anoParsed = parseInt(anoStr, 10)
    if (Number.isNaN(anoParsed)) return undefined
    if (anoStr.length <= 2) {
      anoNum = 2000 + anoParsed
    } else {
      anoNum = anoParsed
    }
  }

  if (anoNum < 2000 || anoNum > 2099) return undefined

  const iso = `${String(anoNum).padStart(4, '0')}-${String(mesNum).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`
  if (!isDataLocalValida(iso)) return undefined

  return iso
}

/**
 * Interpreta uma linha "De [textoDe] até [textoAte]".
 */
export function interpretarLinhaDePeriodo(
  textoDe: string,
  textoAte: string,
  anoReferencia: number = new Date().getFullYear(),
): { intervalo?: IntervaloDeDias; erro?: string } {
  const deBruto = textoDe.trim()
  const ateBruto = textoAte.trim()

  if (!deBruto && !ateBruto) {
    return { erro: 'Data inválida' }
  }

  // Se só o "De" estiver preenchido, vale um único dia
  if (deBruto && !ateBruto) {
    const data = interpretarDataDigitada(deBruto, anoReferencia)
    if (!data) return { erro: 'Data inválida' }
    return { intervalo: { inicio: data, fim: data } }
  }

  if (!deBruto && ateBruto) {
    return { erro: 'Data inválida' }
  }

  const partesDe = deBruto.split('/')
  const temAnoDe = partesDe.length === 3 && partesDe[2].trim().length > 0
  const partesAte = ateBruto.split('/')
  const temAnoAte = partesAte.length === 3 && partesAte[2].trim().length > 0

  let dataDe = interpretarDataDigitada(deBruto, anoReferencia)
  const dataAte = interpretarDataDigitada(ateBruto, anoReferencia)

  if (!dataDe || !dataAte) {
    return { erro: 'Data inválida' }
  }

  if (!temAnoDe && !temAnoAte && dataDe > dataAte) {
    const dataDeAnoAnterior = interpretarDataDigitada(deBruto, anoReferencia - 1)
    if (dataDeAnoAnterior && dataDeAnoAnterior <= dataAte) {
      dataDe = dataDeAnoAnterior
    }
  }

  if (dataDe > dataAte) {
    return { erro: 'O fim vem antes do início' }
  }

  return { intervalo: { inicio: dataDe, fim: dataAte } }
}

/** Formata DataLocal para "dd/MM/yyyy". */
export function formatarDataInput(data: DataLocal): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

/** Formata DataLocal para "dd/MM". */
export function formatarDiaEMes(data: DataLocal): string {
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

/** Formata 1 dia para rótulo curto: "13 nov" ou "13 nov 2025" se não for o ano atual. */
export function rotuloUmDia(data: DataLocal, anoAtual: number = new Date().getFullYear()): string {
  const d = deDataLocal(data)
  const ano = d.getFullYear()
  const diaEMes = format(d, 'd MMM', { locale: ptBR })
  return ano === anoAtual ? diaEMes : `${diaEMes} ${ano}`
}

/** Formata 1 intervalo: "09/10 – 11/11" ou "09/10/2025 – 11/11/2025". */
export function rotuloUmIntervalo(
  inicio: DataLocal,
  fim: DataLocal,
  anoAtual: number = new Date().getFullYear(),
): string {
  if (inicio === fim) return rotuloUmDia(inicio, anoAtual)
  const dInicio = deDataLocal(inicio)
  const dFim = deDataLocal(fim)
  const anoInicio = dInicio.getFullYear()
  const anoFim = dFim.getFullYear()

  if (anoInicio === anoAtual && anoFim === anoAtual) {
    return `${format(dInicio, 'dd/MM')} – ${format(dFim, 'dd/MM')}`
  }
  return `${format(dInicio, 'dd/MM/yyyy')} – ${format(dFim, 'dd/MM/yyyy')}`
}

/**
 * Rótulo do botão "Escolher…" depois de aplicar:
 * 1 dia = "13 nov" (ou "13 nov 2025")
 * 1 período = "09/10 – 11/11"
 * vários = "2 períodos · 96 dias"
 */
export function rotuloBotaoEscolher(
  dias: Iterable<DataLocal>,
  anoAtual: number = new Date().getFullYear(),
): string {
  const ordenados = normalizarDias(dias)
  if (ordenados.length === 0) return 'Escolher…'

  const intervalos = agruparDiasEmIntervalos(ordenados)
  if (intervalos.length === 1) {
    const { inicio, fim } = intervalos[0]
    return rotuloUmIntervalo(inicio, fim, anoAtual)
  }

  return `${intervalos.length} períodos · ${ordenados.length} dias`
}

/**
 * Linha completa de detalhes quando a seleção veio de "Escolher…":
 * "Período: 07/08 – 05/10 · 09/10 – 11/11 · 96 dias"
 */
export function textoCompletoDoPeriodo(
  dias: Iterable<DataLocal>,
  anoAtual: number = new Date().getFullYear(),
): string {
  const ordenados = normalizarDias(dias)
  if (ordenados.length === 0) return ''

  const intervalos = agruparDiasEmIntervalos(ordenados)
  const partes = intervalos.map(({ inicio, fim }) => rotuloUmIntervalo(inicio, fim, anoAtual))
  const diasTexto = ordenados.length === 1 ? '1 dia' : `${ordenados.length} dias`

  return `Período: ${partes.join(' · ')} · ${diasTexto}`
}
