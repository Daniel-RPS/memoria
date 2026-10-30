import type { GroupInstance, GroupSeries, Task } from '@/db/types'
import { normalizar } from '@/lib/procedimentos'
import { separarDoDia, type Progresso } from '@/lib/tarefas'

/** Um card do dia já montado: instância, série e itens visíveis (sem arquivados). */
export interface GrupoDoDia {
  instancia: GroupInstance
  serie: GroupSeries
  /** Pendentes por ordem, depois concluídos por ordem de conclusão. */
  pendentes: Task[]
  concluidas: Task[]
}

/** Títulos de série iguais sem diferenciar acento e maiúscula. */
export function mesmoTituloDeSerie(a: string, b: string) {
  return normalizar(a) === normalizar(b)
}

/** Itens do card: pendentes na ordem do card, concluídos no fim; arquivados ficam fora. */
export function separarItens(itens: Task[]) {
  return separarDoDia(itens)
}

export function progressoDoGrupo(grupo: Pick<GrupoDoDia, 'pendentes' | 'concluidas'>): Progresso {
  return {
    concluidas: grupo.concluidas.length,
    total: grupo.pendentes.length + grupo.concluidas.length,
  }
}

/** "3/4" */
export function textoProgressoGrupo({ concluidas, total }: Progresso) {
  return `${concluidas}/${total}`
}

/** Card concluído: tem itens e nenhum pendente. Card vazio continua pendente. */
export function isGrupoConcluido(grupo: Pick<GrupoDoDia, 'pendentes' | 'concluidas'>) {
  return grupo.pendentes.length === 0 && grupo.concluidas.length > 0
}

/** Card todo concluído não sai do dia: ele é o registro do que foi feito. */
export function podeMoverGrupo(grupo: Pick<GrupoDoDia, 'pendentes' | 'concluidas'>) {
  return !isGrupoConcluido(grupo)
}

/**
 * Monta os cards a partir das instâncias, séries e itens (tarefas com `groupInstanceId`).
 * Instâncias arquivadas ou sem série ficam fora.
 */
export function montarGrupos(
  instancias: GroupInstance[],
  series: GroupSeries[],
  itens: Task[],
): GrupoDoDia[] {
  const seriePorId = new Map(series.map((serie) => [serie.id, serie]))
  const itensPorInstancia = new Map<string, Task[]>()
  for (const item of itens) {
    if (!item.groupInstanceId) continue
    const lista = itensPorInstancia.get(item.groupInstanceId) ?? []
    lista.push(item)
    itensPorInstancia.set(item.groupInstanceId, lista)
  }
  return instancias
    .filter((instancia) => !instancia.arquivado && seriePorId.has(instancia.seriesId))
    .sort((a, b) => a.ordem - b.ordem)
    .map((instancia) => ({
      instancia,
      serie: seriePorId.get(instancia.seriesId)!,
      ...separarItens(itensPorInstancia.get(instancia.id) ?? []),
    }))
}

/** Entrada da folha do dia: tarefa solta ou card de grupo, na ordem comum do dia. */
export type EntradaDoDia = { tipo: 'tarefa'; tarefa: Task } | { tipo: 'grupo'; grupo: GrupoDoDia }

export function idDaEntrada(entrada: EntradaDoDia) {
  return entrada.tipo === 'tarefa' ? entrada.tarefa.id : entrada.grupo.instancia.id
}

function ordemDaEntrada(entrada: EntradaDoDia) {
  return entrada.tipo === 'tarefa' ? entrada.tarefa.ordem : entrada.grupo.instancia.ordem
}

/** Junta tarefas soltas e cards numa lista só, pela `ordem` do dia. */
export function intercalarNoDia(tarefas: Task[], grupos: GrupoDoDia[]): EntradaDoDia[] {
  return [
    ...tarefas.map((tarefa) => ({ tipo: 'tarefa' as const, tarefa })),
    ...grupos.map((grupo) => ({ tipo: 'grupo' as const, grupo })),
  ].sort((a, b) => ordemDaEntrada(a) - ordemDaEntrada(b))
}
