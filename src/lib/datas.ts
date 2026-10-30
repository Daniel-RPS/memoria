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
