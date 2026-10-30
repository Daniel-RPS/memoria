import { addDays, differenceInCalendarDays, format, parse } from 'date-fns'
import type { DataLocal } from '@/db/types'

const FORMATO_DATA_LOCAL = 'yyyy-MM-dd'

/** Converte um `Date` em data local `YYYY-MM-DD`, sem passar por UTC. */
export function paraDataLocal(data: Date): DataLocal {
  return format(data, FORMATO_DATA_LOCAL)
}

/** Interpreta `YYYY-MM-DD` como meia-noite local (nunca `new Date(texto)`, que usa UTC). */
export function deDataLocal(data: DataLocal): Date {
  return parse(data, FORMATO_DATA_LOCAL, new Date())
}

export function hoje(agora: Date = new Date()): DataLocal {
  return paraDataLocal(agora)
}

export function somarDias(data: DataLocal, dias: number): DataLocal {
  return paraDataLocal(addDays(deDataLocal(data), dias))
}

/** Dias de calendário de `inicio` até `fim` (positivo quando `fim` é depois). */
export function diasEntre(inicio: DataLocal, fim: DataLocal): number {
  return differenceInCalendarDays(deDataLocal(fim), deDataLocal(inicio))
}

const PADRAO_DATA_LOCAL = /^\d{4}-\d{2}-\d{2}$/

/** Valida texto vindo de fora (URL, importação) como data local existente. */
export function isDataLocalValida(texto: string | undefined): texto is DataLocal {
  if (!texto || !PADRAO_DATA_LOCAL.test(texto)) return false
  const data = deDataLocal(texto)
  return !Number.isNaN(data.getTime()) && paraDataLocal(data) === texto
}

const NOMES_RELATIVOS: Record<number, string> = { [-1]: 'ontem', 0: 'hoje', 1: 'amanhã' }

/** "ontem", "hoje" ou "amanhã" em relação a `hoje`; `undefined` para outros dias. */
export function nomeRelativo(data: DataLocal, hoje: DataLocal): string | undefined {
  return NOMES_RELATIVOS[diasEntre(hoje, data)]
}
