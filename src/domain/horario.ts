/**
 * Horário de início de uma tarefa solta ou item de grupo ("Fazer comida · 12:00"). Só o início:
 * sem fim, alarme ou notificação. Guardado como `HH:mm` (24h) no campo opcional `horario`; é do
 * próprio registro, então acompanha a tarefa ao mover/adiar/arrastar e vai na cópia do item.
 */

/** Os campos de horário nos dois tipos de registro. */
export interface CamposDeHorario {
  horario?: string | undefined
}

/** Para gravar com `update`/`put`: apaga o horário (campo `undefined` some do registro). */
export const SEM_HORARIO = { horario: undefined } as const

const FORMATO_GRAVADO = /^([01]\d|2[0-3]):[0-5]\d$/

/** O texto gravado é um `HH:mm` válido (00:00–23:59)? */
export function isHorarioValido(texto: unknown): texto is string {
  return typeof texto === 'string' && FORMATO_GRAVADO.test(texto)
}

function montar(horas: number, minutos: number) {
  if (horas > 23 || minutos > 59) return undefined
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`
}

/**
 * Lê o que a pessoa digitou e devolve `HH:mm`, ou `undefined` se não for um horário válido.
 * Aceita "9" → 09:00, "930" → 09:30, "0930" → 09:30, "14h" → 14:00, "14h30" → 14:30,
 * "9:5" → 09:05 e "14:00".
 */
export function normalizarHorario(texto: string): string | undefined {
  const limpo = texto.trim().toLowerCase().replace(/\s+/g, '')
  if (limpo === '') return undefined
  const comSeparador = /^(\d{1,2})[:h.](\d{1,2})?h?$/.exec(limpo)
  if (comSeparador) {
    return montar(Number(comSeparador[1]), Number(comSeparador[2] ?? 0))
  }
  if (!/^\d{1,4}$/.test(limpo)) return undefined
  if (limpo.length <= 2) return montar(Number(limpo), 0)
  const horas = Number(limpo.slice(0, limpo.length - 2))
  const minutos = Number(limpo.slice(-2))
  return montar(horas, minutos)
}

/** Campos para gravar o horário (ou apagá-lo, com `undefined`). Recusa horário inválido. */
export function camposDeHorario(horario: string | undefined): CamposDeHorario {
  if (horario === undefined) return SEM_HORARIO
  if (!isHorarioValido(horario)) throw new Error('Horário inválido.')
  return { horario }
}

/** O horário do registro para levar a um registro novo (cópia do item, tarefa ↔ item). */
export function horarioDe(registro: CamposDeHorario): CamposDeHorario {
  return isHorarioValido(registro.horario) ? { horario: registro.horario } : {}
}

/** O registro com o horário definido. */
export function definirHorarioEm<T extends CamposDeHorario>(registro: T, horario: string): T {
  return { ...registro, ...camposDeHorario(horario) }
}

/** O registro sem horário (nem o campo fica, para não sujar o backup). */
export function removerHorarioDe<T extends CamposDeHorario>(registro: T): T {
  const { horario: _horario, ...resto } = registro
  return resto as T
}
