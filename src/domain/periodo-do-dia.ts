export type PeriodoDoDia = 'dia' | 'noite'

/** Hora local em que o "dia" começa (06:00) e em que a "noite" começa (18:00). */
export const HORA_INICIO_DIA = 6
export const HORA_INICIO_NOITE = 18

/** Período do dia pelo horário local do computador. */
export function periodoDoDia(data: Date): PeriodoDoDia {
  const hora = data.getHours()
  return hora >= HORA_INICIO_DIA && hora < HORA_INICIO_NOITE ? 'dia' : 'noite'
}

/** Milissegundos até a próxima virada (06:00 ou 18:00) a partir de `agora`. */
export function msAteProximaVirada(agora: Date): number {
  const alvo = new Date(agora)
  for (const hora of [HORA_INICIO_DIA, HORA_INICIO_NOITE]) {
    alvo.setHours(hora, 0, 0, 0)
    if (alvo.getTime() > agora.getTime()) return alvo.getTime() - agora.getTime()
  }
  alvo.setDate(alvo.getDate() + 1)
  alvo.setHours(HORA_INICIO_DIA, 0, 0, 0)
  return alvo.getTime() - agora.getTime()
}
