import { endOfMonth, format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { DataLocal, Task } from '@/db/types'
import { deDataLocal, paraDataLocal, somarDias } from '@/lib/datas'
import { inicioDaSemana } from '@/lib/semana'

const DIAS_NA_SEMANA = 7
export const MESES_NO_ANO = 12

/** Primeiro dia do mês de `data`. */
export function inicioDoMes(data: DataLocal): DataLocal {
  return paraDataLocal(startOfMonth(deDataLocal(data)))
}

export function fimDoMes(data: DataLocal): DataLocal {
  return paraDataLocal(endOfMonth(deDataLocal(data)))
}

/** Mesmo dia (ou o último possível) `quantidade` meses depois; usado para navegar entre meses. */
export function somarMeses(data: DataLocal, quantidade: number): DataLocal {
  const dia = deDataLocal(inicioDoMes(data))
  dia.setMonth(dia.getMonth() + quantidade)
  return paraDataLocal(dia)
}

/**
 * Semanas (de segunda a domingo) que cobrem o mês de `data`, incluindo os dias do mês
 * anterior e do seguinte que completam a primeira e a última semana.
 */
export function semanasDoMes(data: DataLocal): DataLocal[][] {
  const ultimo = fimDoMes(data)
  const semanas: DataLocal[][] = []
  let inicio = inicioDaSemana(inicioDoMes(data))
  while (inicio <= ultimo) {
    semanas.push(Array.from({ length: DIAS_NA_SEMANA }, (_, indice) => somarDias(inicio, indice)))
    inicio = somarDias(inicio, DIAS_NA_SEMANA)
  }
  return semanas
}

/** Primeiro dia de cada mês do ano. */
export function mesesDoAno(ano: number): DataLocal[] {
  return Array.from(
    { length: MESES_NO_ANO },
    (_, indice) => `${ano}-${String(indice + 1).padStart(2, '0')}-01`,
  )
}

export function isMesmoMes(a: DataLocal, b: DataLocal) {
  return a.slice(0, 7) === b.slice(0, 7)
}

/** "outubro de 2026" */
export function nomeDoMes(data: DataLocal) {
  return format(deDataLocal(data), "MMMM 'de' yyyy", { locale: ptBR })
}

/** Iniciais dos dias da semana, começando na segunda. */
export function iniciaisDosDias(): { curta: string; completa: string }[] {
  const segunda = inicioDaSemana('2026-01-05')
  return Array.from({ length: DIAS_NA_SEMANA }, (_, indice) => {
    const dia = deDataLocal(somarDias(segunda, indice))
    return {
      curta: format(dia, 'EEEEEE', { locale: ptBR }),
      completa: format(dia, 'EEEE', { locale: ptBR }),
    }
  })
}

export interface ResumoDoDia {
  pendentes: number
  concluidas: number
  /** Pendentes num dia que já passou. */
  atrasadas: number
}

/** Quantas tarefas pendentes, concluídas e atrasadas há em cada dia (arquivadas ficam fora). */
export function resumirPorDia(
  tarefas: Pick<Task, 'data' | 'status'>[],
  hoje: DataLocal,
): Map<DataLocal, ResumoDoDia> {
  const resumo = new Map<DataLocal, ResumoDoDia>()
  for (const tarefa of tarefas) {
    if (tarefa.status === 'arquivada') continue
    const dia = resumo.get(tarefa.data) ?? { pendentes: 0, concluidas: 0, atrasadas: 0 }
    if (tarefa.status === 'concluida') dia.concluidas += 1
    else {
      dia.pendentes += 1
      if (tarefa.data < hoje) dia.atrasadas += 1
    }
    resumo.set(tarefa.data, dia)
  }
  return resumo
}

/** Faixas de intensidade da visão de ano: 0 (nada), 1 (1), 2 (2 a 3), 3 (4 ou mais). */
const LIMITES_INTENSIDADE = [1, 2, 4] as const

export function intensidade(totalDeTarefas: number): 0 | 1 | 2 | 3 {
  if (totalDeTarefas >= LIMITES_INTENSIDADE[2]) return 3
  if (totalDeTarefas >= LIMITES_INTENSIDADE[1]) return 2
  if (totalDeTarefas >= LIMITES_INTENSIDADE[0]) return 1
  return 0
}
