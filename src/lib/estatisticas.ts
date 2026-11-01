import type { DataLocal, GroupCard, GroupItem, GroupSeries, Task } from '@/db/types'
import { deDataLocal, paraDataLocal, somarDias } from '@/lib/datas'

/**
 * Regras do mapa de conclusões do Início (estilo GitHub). Tudo puro: o componente só desenha.
 * A semana do mapa começa no DOMINGO, como no GitHub (o resto do app começa na segunda).
 */

/** Uma conclusão: o dia local em que aconteceu e a categoria (para o filtro). */
export interface Conclusao {
  data: DataLocal
  categoryId?: string
}

/** Dia local de um momento ISO (`concluidaEm`/`concluidoEm`), sem deslocar pelo UTC. */
export function diaDoMomento(momento: string): DataLocal {
  return paraDataLocal(new Date(momento))
}

/**
 * Tarefas soltas concluídas e itens de grupo concluídos, pela data em que foram concluídos.
 * Transferidos e arquivados não contam. Sem o momento da conclusão (dado antigo), vale o dia
 * planejado (da tarefa ou do card) como aproximação. A categoria do item vem da série.
 */
export function listarConclusoes(
  tarefas: Pick<Task, 'status' | 'concluidaEm' | 'data' | 'categoryId'>[],
  itens: Pick<GroupItem, 'status' | 'concluidoEm' | 'cardId'>[],
  cards: Pick<GroupCard, 'id' | 'data' | 'seriesId'>[],
  series: Pick<GroupSeries, 'id' | 'categoryId'>[],
): Conclusao[] {
  const cardPorId = new Map(cards.map((card) => [card.id, card]))
  const categoriaDaSerie = new Map(series.map((serie) => [serie.id, serie.categoryId]))
  const deTarefas = tarefas
    .filter((tarefa) => tarefa.status === 'concluida')
    .map((tarefa) => ({
      data: tarefa.concluidaEm ? diaDoMomento(tarefa.concluidaEm) : tarefa.data,
      categoryId: tarefa.categoryId,
    }))
  const deItens = itens.flatMap((item) => {
    const card = cardPorId.get(item.cardId)
    if (item.status !== 'concluido' || !card) return []
    return [
      {
        data: item.concluidoEm ? diaDoMomento(item.concluidoEm) : card.data,
        categoryId: categoriaDaSerie.get(card.seriesId),
      },
    ]
  })
  return [...deTarefas, ...deItens]
}

/** Quantas conclusões por dia; com `categoryId`, só as daquela categoria. */
export function contarPorDia(conclusoes: Conclusao[], categoryId?: string) {
  const contagem = new Map<DataLocal, number>()
  for (const conclusao of conclusoes) {
    if (categoryId && conclusao.categoryId !== categoryId) continue
    contagem.set(conclusao.data, (contagem.get(conclusao.data) ?? 0) + 1)
  }
  return contagem
}

const DIAS_NA_SEMANA = 7
const DIAS_NO_ANO = 365

/** Um quadrado do mapa. `isFuturo`: depois de hoje (fica em branco, só completa a coluna). */
export interface DiaDoMapa {
  data: DataLocal
  isFuturo: boolean
}

/**
 * Semanas (colunas de domingo a sábado) dos últimos 12 meses até `hoje`: a primeira coluna
 * é a do domingo de 364 dias atrás; a última, a semana de hoje.
 */
export function montarSemanasDoMapa(hoje: DataLocal): DiaDoMapa[][] {
  const umAnoAtras = somarDias(hoje, -(DIAS_NO_ANO - 1))
  const primeiroDomingo = somarDias(umAnoAtras, -deDataLocal(umAnoAtras).getDay())
  const semanas: DiaDoMapa[][] = []
  for (let domingo = primeiroDomingo; domingo <= hoje; domingo = somarDias(domingo, 7)) {
    semanas.push(
      Array.from({ length: DIAS_NA_SEMANA }, (_, indice) => {
        const data = somarDias(domingo, indice)
        return { data, isFuturo: data > hoje }
      }),
    )
  }
  return semanas
}

/** Primeiro e último dia que o mapa mostra (o período das contagens). */
export function periodoDoMapa(semanas: DiaDoMapa[][]) {
  const ultimaSemana = semanas[semanas.length - 1]
  const ultimo = ultimaSemana.filter((dia) => !dia.isFuturo).at(-1)
  return { inicio: semanas[0][0].data, fim: ultimo?.data ?? semanas[0][0].data }
}

/** Semanas mínimas entre dois rótulos de mês para não se sobreporem. */
const SEMANAS_ENTRE_ROTULOS = 3

/**
 * Rótulo de mês no topo da coluna em que o mês começa (pelo domingo da semana). O da primeira
 * coluna só aparece se houver espaço antes do próximo; na última coluna, nunca.
 */
export function rotulosDosMeses(semanas: DiaDoMapa[][]) {
  const rotulos: { indice: number; data: DataLocal }[] = []
  semanas.forEach((semana, indice) => {
    const mes = semana[0].data.slice(0, 7)
    if (indice === 0 || mes !== semanas[indice - 1][0].data.slice(0, 7)) {
      rotulos.push({ indice, data: semana[0].data })
    }
  })
  if (rotulos.length > 1 && rotulos[1].indice - rotulos[0].indice < SEMANAS_ENTRE_ROTULOS) {
    rotulos.shift()
  }
  // Na última coluna o nome sairia da grade.
  if (rotulos.at(-1)?.indice === semanas.length - 1) rotulos.pop()
  return rotulos
}

/** Nível 0 (nada) e 4 faixas pelos quartis dos dias com conclusões do próprio usuário. */
export type NivelDeIntensidade = 0 | 1 | 2 | 3 | 4

/** Limites [Q1, Q2, Q3] dos dias com pelo menos uma conclusão (posto mais próximo). */
export function faixasDeIntensidade(valores: number[]): [number, number, number] {
  const ordenados = valores.filter((valor) => valor > 0).sort((a, b) => a - b)
  if (ordenados.length === 0) return [0, 0, 0]
  const quartil = (fracao: number) =>
    ordenados[Math.max(0, Math.ceil(fracao * ordenados.length) - 1)]
  return [quartil(0.25), quartil(0.5), quartil(0.75)]
}

export function nivelDeIntensidade(
  valor: number,
  [q1, q2, q3]: [number, number, number],
): NivelDeIntensidade {
  if (valor <= 0) return 0
  if (valor <= q1) return 1
  if (valor <= q2) return 2
  if (valor <= q3) return 3
  return 4
}

/** Total de conclusões no período. */
export function totalNoPeriodo(
  contagem: Map<DataLocal, number>,
  inicio: DataLocal,
  fim: DataLocal,
) {
  let total = 0
  for (const [data, quantidade] of contagem) if (data >= inicio && data <= fim) total += quantidade
  return total
}

/** "1 concluído em 12/10/2026" / "5 concluídos em 12/10/2026" / "Nada concluído em …". */
export function textoDoQuadrado(quantidade: number, data: DataLocal) {
  const [ano, mes, dia] = data.split('-')
  const quando = `${dia}/${mes}/${ano}`
  if (quantidade === 0) return `Nada concluído em ${quando}`
  return `${quantidade} ${quantidade === 1 ? 'concluído' : 'concluídos'} em ${quando}`
}
