import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  Adiamento,
  Category,
  DataLocal,
  GroupCard,
  GroupItem,
  GroupSeries,
  Task,
} from '@/db/types'
import { intervaloDoPeriodoDeDados, type PeriodoDeDados } from '@/domain/tempo'
import { deDataLocal, hoje as diaLocalDe, paraDataLocal, somarDias } from '@/lib/datas'

/**
 * Regras da tela Dados › Números, sem banco nem UI. Tarefa = tarefa solta ou item de grupo (o
 * grupo em si e as subetapas não contam). Cada uma conta no dia em que está agora: o registro
 * "transferido" que um item deixa no card de origem não conta de novo. Arquivada conta; excluída
 * não existe mais no banco.
 */

/** Tudo o que a tela lê do banco. */
export interface DadosDeNumeros {
  tarefas: Task[]
  itens: GroupItem[]
  cards: GroupCard[]
  series: GroupSeries[]
  categorias: Category[]
  adiamentos: Adiamento[]
}

/** Tarefa solta ou item, já no formato da contagem. */
interface TarefaContada {
  data: DataLocal
  isConcluida: boolean
  isArquivada: boolean
  categoryId?: string
}

export interface ComparacaoComAnterior {
  /** Total do período menos o do anterior. */
  diferenca: number
  /** "+4 vs semana passada", "−2 vs ontem". */
  texto: string
}

export interface ColunaPorDia {
  data: DataLocal
  concluidas: number
  pendentes: number
  /** Rótulo do eixo ("seg", "5"); vazio quando o dia não leva rótulo. */
  rotuloDoEixo: string
  /** "qua, 11 nov · 4 concluídas · 2 pendentes". */
  dica: string
}

export interface BarraPorCategoria {
  /** `null` = sem categoria. */
  id: string | null
  nome: string
  /** Cor salva da categoria; ausente = neutra. */
  cor?: string
  concluidas: number
  total: number
}

export interface RelatorioDeNumeros {
  total: number
  concluidas: number
  pendentes: number
  atrasadas: number
  adiadas: number
  /** Concluídas sobre o total, inteiro (0 sem tarefas). */
  percentualConcluidas: number
  /** Ausente quando o período anterior não tem tarefas. */
  comparacao?: ComparacaoComAnterior
  /** Só em Esta semana e Este mês. */
  porDia?: ColunaPorDia[]
  /** Pelo total, maior primeiro; só categorias com tarefas no período. */
  porCategoria: BarraPorCategoria[]
  /** Dias com ao menos uma tarefa (bolinhas do calendário de "Escolher…"). */
  diasComTarefas: Set<DataLocal>
}

/** Intervalo inclusive de dias locais. */
interface Intervalo {
  inicio: DataLocal
  fim: DataLocal
}

/** Período anterior ao filtro, com o rótulo da comparação. Sem anterior (intervalo legado): nada. */
export function periodoAnterior(
  periodo: PeriodoDeDados,
  hoje: DataLocal,
): { intervalo: Intervalo; rotulo: string } | undefined {
  const atual = intervaloDoPeriodoDeDados(periodo, hoje)
  switch (periodo.tipo) {
    case 'hoje': {
      const ontem = somarDias(hoje, -1)
      return { intervalo: { inicio: ontem, fim: ontem }, rotulo: 'ontem' }
    }
    case 'dia': {
      const anterior = somarDias(periodo.dia, -1)
      return { intervalo: { inicio: anterior, fim: anterior }, rotulo: 'dia anterior' }
    }
    case 'semana':
      return {
        intervalo: { inicio: somarDias(atual.inicio, -7), fim: somarDias(atual.inicio, -1) },
        rotulo: 'semana passada',
      }
    case 'mes': {
      const mesPassado = subMonths(deDataLocal(atual.inicio), 1)
      return {
        intervalo: {
          inicio: paraDataLocal(startOfMonth(mesPassado)),
          fim: paraDataLocal(endOfMonth(mesPassado)),
        },
        rotulo: 'mês passado',
      }
    }
    case 'intervalo':
      return undefined
  }
}

function isNoIntervalo(data: DataLocal, { inicio, fim }: Intervalo) {
  return data >= inicio && data <= fim
}

/** Tarefas soltas e itens de grupo (sem os registros "transferido"), com o dia em que estão. */
function tarefasContadas(dados: DadosDeNumeros): TarefaContada[] {
  const cardPorId = new Map(dados.cards.map((card) => [card.id, card]))
  const categoriaDaSerie = new Map(dados.series.map((serie) => [serie.id, serie.categoryId]))
  const soltas = dados.tarefas.map((tarefa) => ({
    data: tarefa.data,
    // Arquivada guarda `concluidaEm` se foi concluída antes de arquivar.
    isConcluida:
      tarefa.status === 'concluida' ||
      (tarefa.status === 'arquivada' && tarefa.concluidaEm !== undefined),
    isArquivada: tarefa.status === 'arquivada',
    categoryId: tarefa.categoryId,
  }))
  const itens = dados.itens.flatMap((item) => {
    const card = cardPorId.get(item.cardId)
    if (!card || item.status === 'transferido') return []
    const isArquivado = item.status === 'arquivado' || card.arquivado
    return [
      {
        data: card.data,
        isConcluida:
          item.status === 'concluido' ||
          (item.status === 'arquivado' && item.concluidoEm !== undefined),
        isArquivada: isArquivado,
        categoryId: categoriaDaSerie.get(card.seriesId),
      },
    ]
  })
  return [...soltas, ...itens]
}

/**
 * Atrasada: pendente (não arquivada) num dia que já passou, a mesma regra das Atrasadas do Início.
 */
function isAtrasada(tarefa: TarefaContada, hoje: DataLocal) {
  return !tarefa.isConcluida && !tarefa.isArquivada && tarefa.data < hoje
}

/** Diferença com sinal tipográfico: "+4", "−2", "0". */
function comSinal(numero: number) {
  if (numero > 0) return `+${numero}`
  if (numero < 0) return `−${Math.abs(numero)}`
  return '0'
}

function plural(quantidade: number, singular: string, varias: string) {
  return `${quantidade} ${quantidade === 1 ? singular : varias}`
}

function montarPorDia(
  doPeriodo: TarefaContada[],
  intervalo: Intervalo,
  tipo: 'semana' | 'mes',
): ColunaPorDia[] {
  const colunas: ColunaPorDia[] = []
  for (let data = intervalo.inicio; data <= intervalo.fim; data = somarDias(data, 1)) {
    const doDia = doPeriodo.filter((tarefa) => tarefa.data === data)
    const concluidas = doDia.filter((tarefa) => tarefa.isConcluida).length
    const pendentes = doDia.length - concluidas
    const dia = deDataLocal(data)
    const numeroDoDia = dia.getDate()
    const rotuloDoEixo =
      tipo === 'semana'
        ? format(dia, 'EEEEEE', { locale: ptBR })
        : numeroDoDia === 1 || numeroDoDia % 5 === 0
          ? String(numeroDoDia)
          : ''
    colunas.push({
      data,
      concluidas,
      pendentes,
      rotuloDoEixo,
      dica: `${format(dia, 'EEEEEE, d MMM', { locale: ptBR })} · ${plural(concluidas, 'concluída', 'concluídas')} · ${plural(pendentes, 'pendente', 'pendentes')}`,
    })
  }
  return colunas
}

function montarPorCategoria(
  doPeriodo: TarefaContada[],
  categorias: Category[],
): BarraPorCategoria[] {
  const categoriaPorId = new Map(categorias.map((categoria) => [categoria.id, categoria]))
  const barras = new Map<string | null, BarraPorCategoria>()
  for (const tarefa of doPeriodo) {
    const categoria = tarefa.categoryId ? categoriaPorId.get(tarefa.categoryId) : undefined
    const chave = categoria?.id ?? null
    const barra = barras.get(chave) ?? {
      id: chave,
      nome: categoria?.nome ?? 'Sem categoria',
      ...(categoria && { cor: categoria.cor }),
      concluidas: 0,
      total: 0,
    }
    barra.total += 1
    if (tarefa.isConcluida) barra.concluidas += 1
    barras.set(chave, barra)
  }
  // Empate no total: segue a ordem das categorias; "Sem categoria" por último.
  const ordem = (id: string | null) => (id ? (categoriaPorId.get(id)?.ordem ?? 0) : Infinity)
  return [...barras.values()].sort((a, b) => b.total - a.total || ordem(a.id) - ordem(b.id))
}

/** Monta todos os números da tela para o período. */
export function montarRelatorioDeNumeros(
  dados: DadosDeNumeros,
  periodo: PeriodoDeDados,
  hoje: DataLocal,
): RelatorioDeNumeros {
  const intervalo = intervaloDoPeriodoDeDados(periodo, hoje)
  const todas = tarefasContadas(dados)
  const doPeriodo = todas.filter((tarefa) => isNoIntervalo(tarefa.data, intervalo))
  const total = doPeriodo.length
  const concluidas = doPeriodo.filter((tarefa) => tarefa.isConcluida).length
  const pendentes = total - concluidas

  const anterior = periodoAnterior(periodo, hoje)
  const totalAnterior = anterior
    ? todas.filter((tarefa) => isNoIntervalo(tarefa.data, anterior.intervalo)).length
    : 0
  const comparacao =
    anterior && totalAnterior > 0
      ? {
          diferenca: total - totalAnterior,
          texto: `${comSinal(total - totalAnterior)} vs ${anterior.rotulo}`,
        }
      : undefined

  // Pelo dia (local) em que a mudança foi feita, não pelo dia de destino.
  const adiadas = dados.adiamentos.filter((adiamento) =>
    isNoIntervalo(diaLocalDe(new Date(adiamento.em)), intervalo),
  ).length

  return {
    total,
    concluidas,
    pendentes,
    atrasadas: doPeriodo.filter((tarefa) => isAtrasada(tarefa, hoje)).length,
    adiadas,
    percentualConcluidas: total > 0 ? Math.round((concluidas / total) * 100) : 0,
    ...(comparacao && { comparacao }),
    ...((periodo.tipo === 'semana' || periodo.tipo === 'mes') && {
      porDia: montarPorDia(doPeriodo, intervalo, periodo.tipo),
    }),
    porCategoria: montarPorCategoria(doPeriodo, dados.categorias),
    diasComTarefas: new Set(todas.map((tarefa) => tarefa.data)),
  }
}
