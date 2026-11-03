import type { Task } from '@/db/types'
import type { EntradaDoDia, GrupoDoDia } from '@/lib/grupos'

/** Como a visão Dia mostra as duas seções: empilhadas ou lado a lado. */
export const MODOS_DO_DIA = ['lista', 'colunas'] as const
export type ModoDoDia = (typeof MODOS_DO_DIA)[number]

/** Qual seção vem primeiro (em cima na Lista, à esquerda nas Colunas). */
export const ORDENS_DO_DIA = ['grupos', 'soltas'] as const
export type OrdemDoDia = (typeof ORDENS_DO_DIA)[number]
export type SecaoDoDia = OrdemDoDia

export function lerModoDoDia(valor: string | null): ModoDoDia {
  return valor === 'colunas' ? 'colunas' : 'lista'
}

export function lerOrdemDoDia(valor: string | null): OrdemDoDia {
  return valor === 'soltas' ? 'soltas' : 'grupos'
}

/** As duas seções na ordem escolhida. */
export function secoesNaOrdem(ordem: OrdemDoDia): [SecaoDoDia, SecaoDoDia] {
  return ordem === 'soltas' ? ['soltas', 'grupos'] : ['grupos', 'soltas']
}

/** Separa as entradas do dia (já na ordem do dia) em cards de grupo e tarefas soltas. */
export function separarSecoes(entradas: EntradaDoDia[]) {
  const grupos: GrupoDoDia[] = []
  const soltas: Task[] = []
  for (const entrada of entradas) {
    if (entrada.tipo === 'grupo') grupos.push(entrada.grupo)
    else soltas.push(entrada.tarefa)
  }
  return { grupos, soltas }
}

/** "2/3": tarefas soltas pendentes sobre o total do dia (pendentes + concluídas). */
export function contagemDasSoltas(pendentes: number, concluidas: number) {
  const total = pendentes + concluidas
  return {
    texto: concluidas === 0 ? String(pendentes) : `${pendentes}/${total}`,
    rotulo:
      total === 0
        ? 'nenhuma'
        : `${pendentes} ${pendentes === 1 ? 'pendente' : 'pendentes'} de ${total}`,
  }
}
