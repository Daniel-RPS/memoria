import { format, isSameYear, startOfMonth } from 'date-fns'
import { z } from 'zod'
import type { DataLocal } from '@/db/types'
import { deDataLocal, isDataLocalValida, paraDataLocal, somarDias } from '@/lib/datas'

/**
 * Filtro por dia das abas Notas (dia da última edição) e Procedimentos (dia da criação). Tudo em
 * dia local: o momento gravado (UTC) vira o dia de São Paulo antes de comparar.
 */

export type AtalhoDeData = 'hoje' | 'ontem' | 'ultimos7' | 'mes'

export type FiltroDeData =
  | { tipo: 'qualquer' }
  | { tipo: AtalhoDeData }
  /** Escolhido no calendário: `inicio === fim` é um dia só. */
  | { tipo: 'periodo'; inicio: DataLocal; fim: DataLocal }

export const QUALQUER_DIA: FiltroDeData = { tipo: 'qualquer' }

/** Atalhos do filtro nas Notas (dia da última edição). */
export const ATALHOS_DAS_NOTAS: readonly AtalhoDeData[] = ['hoje', 'ontem', 'ultimos7']
/** Atalhos do filtro em Procedimentos (dia da criação). */
export const ATALHOS_DOS_PROCEDIMENTOS: readonly AtalhoDeData[] = [
  'hoje',
  'ontem',
  'ultimos7',
  'mes',
]

/** Dias que "Últimos 7 dias" cobre, contando hoje. */
const DIAS_DA_SEMANA_RECENTE = 7

const ROTULOS: Record<AtalhoDeData, string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  ultimos7: 'Últimos 7 dias',
  mes: 'Este mês',
}

/** Rótulo do atalho no menu ("Hoje", "Últimos 7 dias"…). */
export function rotuloDoAtalho(atalho: AtalhoDeData) {
  return ROTULOS[atalho]
}

/** Primeiro e último dia (inclusive) que o filtro aceita; `null` = qualquer dia. */
export function intervaloDoFiltro(
  filtro: FiltroDeData,
  hoje: DataLocal,
): { inicio: DataLocal; fim: DataLocal } | null {
  switch (filtro.tipo) {
    case 'qualquer':
      return null
    case 'hoje':
      return { inicio: hoje, fim: hoje }
    case 'ontem': {
      const ontem = somarDias(hoje, -1)
      return { inicio: ontem, fim: ontem }
    }
    case 'ultimos7':
      return { inicio: somarDias(hoje, -(DIAS_DA_SEMANA_RECENTE - 1)), fim: hoje }
    case 'mes':
      return { inicio: paraDataLocal(startOfMonth(deDataLocal(hoje))), fim: hoje }
    case 'periodo':
      // Intervalo escolhido "de trás para frente" vale do mesmo jeito.
      return filtro.inicio <= filtro.fim
        ? { inicio: filtro.inicio, fim: filtro.fim }
        : { inicio: filtro.fim, fim: filtro.inicio }
  }
}

/** Dia local de um momento gravado (ISO em UTC). */
export function diaLocalDoMomento(momento: string): DataLocal | undefined {
  const data = new Date(momento)
  return Number.isNaN(data.getTime()) ? undefined : paraDataLocal(data)
}

/** O momento (ISO) cai num dia que o filtro aceita? Sem data válida, só "qualquer dia" aceita. */
export function isNoFiltro(momento: string, filtro: FiltroDeData, hoje: DataLocal) {
  const intervalo = intervaloDoFiltro(filtro, hoje)
  if (!intervalo) return true
  const dia = diaLocalDoMomento(momento)
  return dia !== undefined && dia >= intervalo.inicio && dia <= intervalo.fim
}

/** Itens cujo momento (lido por `momentoDe`) cai no filtro, na ordem recebida. */
export function filtrarPorData<T>(
  itens: T[],
  momentoDe: (item: T) => string,
  filtro: FiltroDeData,
  hoje: DataLocal,
) {
  if (filtro.tipo === 'qualquer') return itens
  return itens.filter((item) => isNoFiltro(momentoDe(item), filtro, hoje))
}

function textoDoDia(dia: DataLocal, hoje: DataLocal) {
  const data = deDataLocal(dia)
  return format(data, isSameYear(data, deDataLocal(hoje)) ? 'dd/MM' : 'dd/MM/yyyy')
}

/** Texto do gatilho: "Hoje", "02/11", "28/10 – 02/11"; `undefined` = qualquer dia. */
export function rotuloDoFiltro(filtro: FiltroDeData, hoje: DataLocal): string | undefined {
  if (filtro.tipo === 'qualquer') return undefined
  if (filtro.tipo !== 'periodo') return ROTULOS[filtro.tipo]
  const { inicio, fim } = intervaloDoFiltro(filtro, hoje) ?? filtro
  if (inicio === fim) return textoDoDia(inicio, hoje)
  return `${textoDoDia(inicio, hoje)} – ${textoDoDia(fim, hoje)}`
}

const dataLocal = z.string().refine((texto) => isDataLocalValida(texto))

const esquemaFiltro = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('qualquer') }),
  z.object({ tipo: z.enum(['hoje', 'ontem', 'ultimos7', 'mes']) }),
  z.object({ tipo: z.literal('periodo'), inicio: dataLocal, fim: dataLocal }),
])

/** Lê o filtro guardado (texto JSON); inválido, ausente ou fora das opções da tela = qualquer dia. */
export function lerFiltroDeData(
  texto: string | null,
  atalhos: readonly AtalhoDeData[],
): FiltroDeData {
  if (!texto) return QUALQUER_DIA
  try {
    const lido = esquemaFiltro.safeParse(JSON.parse(texto))
    if (!lido.success) return QUALQUER_DIA
    const filtro = lido.data as FiltroDeData
    if (filtro.tipo !== 'qualquer' && filtro.tipo !== 'periodo' && !atalhos.includes(filtro.tipo)) {
      return QUALQUER_DIA
    }
    return filtro
  } catch {
    return QUALQUER_DIA
  }
}
