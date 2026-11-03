import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { DataLocal, GroupItem, Task } from '@/db/types'
import { deDataLocal, diasEntre, somarDias } from '@/lib/datas'
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

/** Como está o dia no resumo de Hoje: decide a frase principal. */
export type SituacaoDoDia = 'vazio' | 'tudo-feito' | 'nada-feito' | 'parcial'

/** Resumo de Hoje só em números (a tela monta o texto com `fraseDoDia` e `textoDaQuantidade`). */
export interface NumerosDoDia {
  situacao: SituacaoDoDia
  pendentes: number
  feitos: number
  /** Itens de grupo e tarefas soltas, pendentes + feitos (transferidos e arquivados fora). */
  total: number
  /** Grupos no dia (um por série, por mais itens que tenha). */
  grupos: number
  itensPendentesDosGrupos: number
  /** Tarefas soltas no dia, pendentes e concluídas. */
  soltas: number
}

/** Atrasadas só em números: só pendentes contam. */
export interface NumerosDasAtrasadas {
  itens: number
  grupos: number
  soltas: number
  /** Dia mais antigo com pendente (destino de "Ver atrasadas"); `null` sem atrasadas. */
  diaMaisAntigo: DataLocal | null
}

function situacaoDoDia(feitos: number, total: number): SituacaoDoDia {
  if (total === 0) return 'vazio'
  if (feitos === total) return 'tudo-feito'
  if (feitos === 0) return 'nada-feito'
  return 'parcial'
}

/** Números do bloco Hoje do Início: situação, progresso e quantos grupos e tarefas soltas. */
export function resumirDia(resumo: ResumoDoDia): NumerosDoDia {
  const feitosDosGrupos = resumo.grupos.reduce((soma, { feitos }) => soma + feitos, 0)
  const totalDosGrupos = resumo.grupos.reduce((soma, { total }) => soma + total, 0)
  const soltasFeitas = resumo.soltas.filter(({ tarefa }) => tarefa.status === 'concluida').length
  const feitos = feitosDosGrupos + soltasFeitas
  const total = totalDosGrupos + resumo.soltas.length
  return {
    situacao: situacaoDoDia(feitos, total),
    pendentes: total - feitos,
    feitos,
    total,
    grupos: new Set(resumo.grupos.map(({ grupo }) => grupo.serie.id)).size,
    itensPendentesDosGrupos: totalDosGrupos - feitosDosGrupos,
    soltas: resumo.soltas.length,
  }
}

/**
 * Números do bloco Atrasadas: pendentes, grupos (um por série, mesmo em dias diferentes),
 * tarefas soltas e o dia mais antigo. O dia é onde o pendente está (card ou tarefa), não a
 * `dataOriginal`.
 */
export function resumirAtrasadas(resumo: ResumoDoDia): NumerosDasAtrasadas {
  const grupos = resumo.grupos.filter(({ total, feitos }) => total > feitos)
  const soltas = resumo.soltas.filter(({ tarefa }) => tarefa.status === 'pendente')
  const dias = [
    ...grupos.map(({ grupo }) => grupo.card.data),
    ...soltas.map(({ tarefa }) => tarefa.data),
  ].sort()
  return {
    itens: resumo.pendentes,
    grupos: new Set(grupos.map(({ grupo }) => grupo.serie.id)).size,
    soltas: soltas.length,
    diaMaisAntigo: dias[0] ?? null,
  }
}

/** "1 grupo" / "2 grupos": singular e plural pela quantidade. */
export function textoDaQuantidade(quantidade: number, singular: string, plural: string) {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`
}

/** Frase principal do bloco Hoje, pela situação do dia. */
export function fraseDoDia({ situacao, pendentes, total }: NumerosDoDia) {
  switch (situacao) {
    case 'vazio':
      return 'Nada para hoje.'
    case 'tudo-feito':
      return 'Tudo feito por hoje.'
    case 'nada-feito':
      return `${textoDaQuantidade(pendentes, 'pendente', 'pendentes')} para hoje.`
    case 'parcial':
      return `${pendentes === 1 ? 'Falta' : 'Faltam'} ${pendentes} de ${total}.`
  }
}

/** Frase das Atrasadas: "3 itens atrasados, o mais antigo de 28/out" (um item: "de 28/out"). */
export function fraseDasAtrasadas({ itens, diaMaisAntigo }: NumerosDasAtrasadas) {
  if (diaMaisAntigo === null) return 'Tudo em dia'
  const data = format(deDataLocal(diaMaisAntigo), 'dd/MMM', { locale: ptBR })
  return itens === 1
    ? `1 item atrasado, de ${data}`
    : `${itens} itens atrasados, o mais antigo de ${data}`
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
