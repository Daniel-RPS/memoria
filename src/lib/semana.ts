import { format, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { DataLocal } from '@/db/types'
import { deDataLocal, paraDataLocal, somarDias } from '@/lib/datas'

/** A semana começa na segunda-feira. */
export const PRIMEIRO_DIA_DA_SEMANA = 1
const DIAS_NA_SEMANA = 7

/** Segunda-feira da semana que contém `data`. */
export function inicioDaSemana(data: DataLocal): DataLocal {
  return paraDataLocal(startOfWeek(deDataLocal(data), { weekStartsOn: PRIMEIRO_DIA_DA_SEMANA }))
}

/** Os 7 dias da semana que começa em `inicio`. */
export function diasDaSemana(inicio: DataLocal): DataLocal[] {
  return Array.from({ length: DIAS_NA_SEMANA }, (_, indice) => somarDias(inicio, indice))
}

/** "26 de out a 1 de nov" ou "2 a 8 de nov" (mesmo mês). */
export function intervaloDaSemana(inicio: DataLocal) {
  const primeiro = deDataLocal(inicio)
  const ultimo = deDataLocal(somarDias(inicio, DIAS_NA_SEMANA - 1))
  const mesmoMes = primeiro.getMonth() === ultimo.getMonth()
  const formatoInicio = mesmoMes ? 'd' : "d 'de' MMM"
  return `${format(primeiro, formatoInicio, { locale: ptBR })} a ${format(ultimo, "d 'de' MMM", { locale: ptBR })}`
}
