import type { DataLocal, Task } from '@/db/types'
import { diasEntre, somarDias } from '@/lib/datas'
import { pendentesDo, type GrupoDoDia } from '@/lib/grupos'
import { diasPendente } from '@/lib/tarefas'

/** Regras dos resumos do Início (Atrasadas e Próximos 7 dias). */

/** Uma linha de "Atrasadas": tarefa solta ou card com itens pendentes num dia que passou. */
export type Atrasada =
  | { tipo: 'tarefa'; tarefa: Task; dias: number }
  | { tipo: 'grupo'; grupo: GrupoDoDia; pendentes: number; dias: number }

/**
 * Tarefas soltas pendentes e cards com pendentes em dias anteriores a hoje, da mais atrasada
 * para a mais recente. "Há X dias" conta da `dataOriginal` (como no Dia); no card, do item
 * pendente mais antigo.
 */
export function montarAtrasadas(
  tarefas: Task[],
  grupos: GrupoDoDia[],
  hoje: DataLocal,
): Atrasada[] {
  const deTarefas: Atrasada[] = tarefas
    .filter((tarefa) => tarefa.status === 'pendente' && tarefa.data < hoje)
    .map((tarefa) => ({
      tipo: 'tarefa',
      tarefa,
      dias: diasPendente(tarefa, hoje) ?? diasEntre(tarefa.data, hoje),
    }))
  const deGrupos: Atrasada[] = grupos.flatMap((grupo) => {
    const pendentes = pendentesDo(grupo)
    if (grupo.card.data >= hoje || pendentes.length === 0) return []
    const maisAntiga = pendentes.reduce(
      (menor, item) => (item.dataOriginal < menor ? item.dataOriginal : menor),
      grupo.card.data,
    )
    return [
      { tipo: 'grupo', grupo, pendentes: pendentes.length, dias: diasEntre(maisAntiga, hoje) },
    ]
  })
  return [...deTarefas, ...deGrupos].sort((a, b) => b.dias - a.dias)
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
