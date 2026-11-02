import type { DataLocal, GroupItem, Task } from '@/db/types'
import { diasEntre, somarDias } from '@/lib/datas'
import { pendentesDo, type GrupoDoDia } from '@/lib/grupos'
import { diasPendente } from '@/lib/tarefas'

/** Regras dos resumos do Início (Hoje, Atrasadas e Próximos 7 dias). */

/** Item de um card no resumo: "há X dias" só nos pendentes de um dia que passou. */
export interface ItemDoResumo {
  item: GroupItem
  isFeito: boolean
  dias: number | null
}

/** Card de grupo no resumo: itens pendentes em cima e feitos no fim; transferidos ficam de fora. */
export interface GrupoDoResumo {
  grupo: GrupoDoDia
  itens: ItemDoResumo[]
  feitos: number
  /** Pendentes + feitos (transferidos não contam). */
  total: number
}

export interface SoltaDoResumo {
  tarefa: Task
  dias: number | null
}

/** Hoje ou Atrasadas: primeiro um card por grupo, depois as tarefas soltas. */
export interface ResumoDoDia {
  grupos: GrupoDoResumo[]
  soltas: SoltaDoResumo[]
  pendentes: number
}

const porDiaEOrdem = (
  a: { data: DataLocal; ordem: number },
  b: { data: DataLocal; ordem: number },
) => a.data.localeCompare(b.data) || a.ordem - b.ordem

function diasDoItem(item: GroupItem, hoje: DataLocal) {
  if (item.status !== 'pendente') return null
  const dias = diasEntre(item.dataOriginal, hoje)
  return dias > 0 ? dias : null
}

/**
 * Separa cards e tarefas soltas para os blocos Hoje e Atrasadas, cada lista pelo dia e pela
 * `ordem` do dia. Arquivados ficam de fora; card sem pendente nem feito não aparece. "Há X dias"
 * conta da `dataOriginal` (como no Dia); na tarefa solta de um dia que passou, no mínimo desde
 * o dia dela.
 */
export function montarResumoDoDia(
  tarefas: Task[],
  grupos: GrupoDoDia[],
  hoje: DataLocal,
): ResumoDoDia {
  const doResumo = [...grupos]
    .sort((a, b) => porDiaEOrdem(a.card, b.card))
    .map((grupo) => {
      const itens = grupo.itens
        .filter((item) => item.status === 'pendente' || item.status === 'concluido')
        .map((item) => ({
          item,
          isFeito: item.status === 'concluido',
          dias: diasDoItem(item, hoje),
        }))
      const feitos = itens.filter(({ isFeito }) => isFeito).length
      return { grupo, itens, feitos, total: itens.length }
    })
    .filter(({ total }) => total > 0)
  const soltas = tarefas
    .filter((tarefa) => tarefa.status !== 'arquivada')
    .sort(porDiaEOrdem)
    .map((tarefa) => ({
      tarefa,
      dias:
        tarefa.status !== 'pendente'
          ? null
          : (diasPendente(tarefa, hoje) ??
            (tarefa.data < hoje ? diasEntre(tarefa.data, hoje) : null)),
    }))
  const pendentes =
    doResumo.reduce((soma, { total, feitos }) => soma + total - feitos, 0) +
    soltas.filter(({ tarefa }) => tarefa.status === 'pendente').length
  return { grupos: doResumo, soltas, pendentes }
}

/** "há 1 dia" / "há 3 dias". */
export function textoHaDias(dias: number) {
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`
}

/**
 * Pendentes (tarefas soltas e itens de grupo) em cada um dos `quantidade` dias depois de
 * `hoje`. Dia sem nada aparece com 0.
 */
export function contarProximosDias(
  tarefas: Pick<Task, 'data' | 'status'>[],
  grupos: GrupoDoDia[],
  hoje: DataLocal,
  quantidade: number,
) {
  return Array.from({ length: quantidade }, (_, indice) => {
    const data = somarDias(hoje, indice + 1)
    const soltas = tarefas.filter((tarefa) => tarefa.data === data && tarefa.status === 'pendente')
    const itens = grupos
      .filter((grupo) => grupo.card.data === data)
      .reduce((soma, grupo) => soma + pendentesDo(grupo).length, 0)
    return { data, pendentes: soltas.length + itens }
  })
}
