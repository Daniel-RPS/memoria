import { format } from 'date-fns'
import type { DataLocal, GroupCard, GroupItem, GroupSeries, Task } from '@/db/types'
import { deDataLocal } from '@/lib/datas'
import { normalizar } from '@/lib/procedimentos'

/** Um card já montado: card, série e itens visíveis (sem arquivados). */
export interface GrupoDoDia {
  card: GroupCard
  serie: GroupSeries
  /** Pendentes primeiro (ordem do card); depois feitos e transferidos, na ordem do card. */
  itens: GroupItem[]
}

/** Títulos de série iguais sem diferenciar acento e maiúscula. */
export function mesmoTituloDeSerie(a: string, b: string) {
  return normalizar(a) === normalizar(b)
}

const porOrdem = (a: GroupItem, b: GroupItem) => a.ordem - b.ordem

/** Pendentes no alto; feitos e transferidos ficam embaixo, na posição que tinham. */
export function ordenarItens(itens: GroupItem[]) {
  const visiveis = itens.filter((item) => item.status !== 'arquivado')
  return [
    ...visiveis.filter((item) => item.status === 'pendente').sort(porOrdem),
    ...visiveis.filter((item) => item.status !== 'pendente').sort(porOrdem),
  ]
}

export function pendentesDo(grupo: Pick<GrupoDoDia, 'itens'>) {
  return grupo.itens.filter((item) => item.status === 'pendente')
}

export interface ProgressoDoGrupo {
  pendentes: number
  feitos: number
  transferidos: number
}

export function progressoDoGrupo(grupo: Pick<GrupoDoDia, 'itens'>): ProgressoDoGrupo {
  const contar = (status: GroupItem['status']) =>
    grupo.itens.filter((item) => item.status === status).length
  return {
    pendentes: contar('pendente'),
    feitos: contar('concluido'),
    transferidos: contar('transferido'),
  }
}

function plural(quantidade: number, singular: string, plural: string) {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`
}

/**
 * Card ativo: "3/4" (feitos de pendentes + feitos). Encerrado: "3 feitos · 1 transferido".
 * Transferidos não contam como pendentes nem como feitos.
 */
export function textoProgressoGrupo({ pendentes, feitos, transferidos }: ProgressoDoGrupo) {
  const partes =
    pendentes > 0
      ? [`${feitos}/${feitos + pendentes}`]
      : feitos > 0 || transferidos === 0
        ? [plural(feitos, 'feito', 'feitos')]
        : []
  if (transferidos > 0) partes.push(plural(transferidos, 'transferido', 'transferidos'))
  return partes.join(' · ')
}

/** Card encerrado: tem itens e nenhuma pendência real. */
export function isGrupoEncerrado(grupo: Pick<GrupoDoDia, 'itens'>) {
  return grupo.itens.length > 0 && pendentesDo(grupo).length === 0
}

/** Só há o que copiar para outro dia se houver item pendente. */
export function podeCopiarGrupo(grupo: Pick<GrupoDoDia, 'itens'>) {
  return pendentesDo(grupo).length > 0
}

/** "31/10" */
export function diaCurto(data: DataLocal) {
  return format(deDataLocal(data), 'dd/MM')
}

/**
 * Prévia do arrastar para outro dia: "Casa · 2 pendentes → 03/11" (card) ou
 * "Fazer janta → 03/11" (item sozinho, sem `pendentes`).
 */
export function textoPreviaLevar(titulo: string, destino: DataLocal, pendentes?: number) {
  const quantidade =
    pendentes === undefined ? '' : ` · ${plural(pendentes, 'pendente', 'pendentes')}`
  return `${titulo}${quantidade} → ${diaCurto(destino)}`
}

/** Ação de levar os pendentes um dia adiante (mesma regra de `destinoDoAdiamento`). */
export function rotuloLevarAdiante(dataDoCard: DataLocal, hoje: DataLocal) {
  return dataDoCard > hoje ? 'Levar pendentes para o dia seguinte' : 'Levar pendentes para amanhã'
}

/** Monta os cards (não arquivados, com série) com os itens ordenados. */
export function montarGrupos(
  cards: GroupCard[],
  series: GroupSeries[],
  itens: GroupItem[],
): GrupoDoDia[] {
  const seriePorId = new Map(series.map((serie) => [serie.id, serie]))
  const itensPorCard = new Map<string, GroupItem[]>()
  for (const item of itens) {
    const lista = itensPorCard.get(item.cardId) ?? []
    lista.push(item)
    itensPorCard.set(item.cardId, lista)
  }
  return cards
    .filter((card) => !card.arquivado && seriePorId.has(card.seriesId))
    .sort((a, b) => a.ordem - b.ordem)
    .map((card) => ({
      card,
      serie: seriePorId.get(card.seriesId)!,
      itens: ordenarItens(itensPorCard.get(card.id) ?? []),
    }))
}

/** Entrada da lista do dia: tarefa solta ou card, na ordem comum do dia. */
export type EntradaDoDia = { tipo: 'tarefa'; tarefa: Task } | { tipo: 'grupo'; grupo: GrupoDoDia }

export function idDaEntrada(entrada: EntradaDoDia) {
  return entrada.tipo === 'tarefa' ? entrada.tarefa.id : entrada.grupo.card.id
}

function ordemDaEntrada(entrada: EntradaDoDia) {
  return entrada.tipo === 'tarefa' ? entrada.tarefa.ordem : entrada.grupo.card.ordem
}

/** Junta tarefas soltas e cards numa lista só, pela `ordem` do dia. */
export function intercalarNoDia(tarefas: Task[], grupos: GrupoDoDia[]): EntradaDoDia[] {
  return [
    ...tarefas.map((tarefa) => ({ tipo: 'tarefa' as const, tarefa })),
    ...grupos.map((grupo) => ({ tipo: 'grupo' as const, grupo })),
  ].sort((a, b) => ordemDaEntrada(a) - ordemDaEntrada(b))
}

/**
 * Itens pendentes e feitos no formato das tarefas, para os resumos de mês e ano
 * (transferidos não contam).
 */
export function itensParaResumo(grupos: GrupoDoDia[]) {
  return grupos.flatMap((grupo) =>
    grupo.itens
      .filter((item) => item.status === 'pendente' || item.status === 'concluido')
      .map((item) => ({
        data: grupo.card.data,
        status: item.status === 'pendente' ? ('pendente' as const) : ('concluida' as const),
      })),
  )
}

/**
 * Item pendente que vem de um dia anterior ao do card (cópia) ou a hoje (atrasado):
 * mostra "pendente desde <dataOriginal>".
 */
export function isPendenteDeAntes(
  item: Pick<GroupItem, 'status' | 'dataOriginal'>,
  dataDoCard: DataLocal,
  hoje: DataLocal,
) {
  return item.status === 'pendente' && (item.dataOriginal < dataDoCard || item.dataOriginal < hoje)
}
