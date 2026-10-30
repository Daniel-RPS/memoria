import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { DataLocal, Task } from '@/db/types'
import { deDataLocal, nomeRelativo, somarDias } from '@/lib/datas'

/**
 * Para onde "Adiar" leva a tarefa: tarefa de hoje ou atrasada vai para amanhã;
 * tarefa futura vai para o dia seguinte ao dela.
 */
export function destinoDoAdiamento(data: DataLocal, hoje: DataLocal): DataLocal {
  return somarDias(data > hoje ? data : hoje, 1)
}

export type TarefaParaMover = Pick<Task, 'id' | 'data' | 'ordem' | 'status'>

export interface Movimento {
  id: string
  data: DataLocal
  ordem: number
}

const porDiaEOrdem = (a: TarefaParaMover, b: TarefaParaMover) =>
  a.data === b.data ? a.ordem - b.ordem : a.data.localeCompare(b.data)

/**
 * Planeja mover tarefas para `destino`, entrando no fim do dia e mantendo a ordem relativa
 * entre elas (primeiro por dia de origem, depois pela ordem no dia).
 * Ignora arquivadas e as que já estão no destino. NUNCA mexe em `dataOriginal`.
 */
export function planejarMovimento(
  tarefas: TarefaParaMover[],
  destino: DataLocal,
  maiorOrdemNoDestino: number,
): Movimento[] {
  return tarefas
    .filter((tarefa) => tarefa.status !== 'arquivada' && tarefa.data !== destino)
    .sort(porDiaEOrdem)
    .map((tarefa, indice) => ({
      id: tarefa.id,
      data: destino,
      ordem: maiorOrdemNoDestino + indice + 1,
    }))
}

/** Pendentes que estão exatamente no dia anterior a `hoje`. */
export function pendenciasDeOntem<T extends Pick<Task, 'data' | 'status'>>(
  tarefas: T[],
  hoje: DataLocal,
) {
  const ontem = somarDias(hoje, -1)
  return tarefas.filter((tarefa) => tarefa.status === 'pendente' && tarefa.data === ontem)
}

/** "amanhã", "hoje", "ontem" ou "sexta, 6 de nov". */
export function nomeDoDia(data: DataLocal, hoje: DataLocal) {
  return nomeRelativo(data, hoje) ?? format(deDataLocal(data), "EEE, d 'de' MMM", { locale: ptBR })
}

/** Mensagem do aviso depois de mover, ex.: "2 tarefas movidas para amanhã". */
export function textoMovimento(quantidade: number, destino: DataLocal, hoje: DataLocal) {
  const tarefas = quantidade === 1 ? '1 tarefa movida' : `${quantidade} tarefas movidas`
  return `${tarefas} para ${nomeDoDia(destino, hoje)}`
}

/**
 * Aviso de uma ação que move tarefas soltas e copia itens de grupo, ex.:
 * "1 tarefa movida e 2 itens copiados para amanhã".
 */
export function textoAcao(tarefas: number, itens: number, destino: DataLocal, hoje: DataLocal) {
  const partes = []
  if (tarefas > 0) partes.push(tarefas === 1 ? '1 tarefa movida' : `${tarefas} tarefas movidas`)
  if (itens > 0) partes.push(itens === 1 ? '1 item copiado' : `${itens} itens copiados`)
  return `${partes.join(' e ')} para ${nomeDoDia(destino, hoje)}`
}
