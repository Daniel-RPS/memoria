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
import { deDataLocal, paraDataLocal, somarDias } from '@/lib/datas'

/**
 * Regras da tela Dados › Números, sem banco nem UI. Tarefa = tarefa solta ou item de grupo (o
 * grupo em si e as subetapas não contam). Cada tarefa vale em CADA dia em que esteve na lista e,
 * nesse dia, cai numa classe só:
 * - concluída: marcada como feita;
 * - não concluída: transferida para outro dia sem concluir, ou pendente num dia que já passou;
 * - em aberto: pendente hoje ou num dia futuro.
 * A transferência é lida do que o app já guarda: o item "transferido" que fica no card de origem
 * e, para a tarefa solta (que é MOVIDA, sem deixar registro no dia), o `Adiamento` gravado ao
 * movê-la para um dia posterior. Arquivada conta; excluída não existe mais no banco.
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

export type ClasseDaTarefa = 'concluida' | 'naoConcluida' | 'emAberto'

/** Uma tarefa num dia em que esteve na lista, já classificada. */
interface TarefaNoDia {
  data: DataLocal
  classe: ClasseDaTarefa
  /** Saiu deste dia para um posterior sem ser concluída (conta em "Adiadas"). */
  isTransferida: boolean
  /** Atrasada como no Início: pendente, não arquivada, num dia que passou. */
  isAtrasada: boolean
  categoryId?: string
  /**
   * A mesma tarefa ao longo dos dias: `cadeiaId` no item (marcador, cópias e origem) e o id na
   * tarefa solta (o mesmo do adiamento e do item, se ela virou item).
   */
  cadeia: string
}

/** Quantas de cada classe. */
export interface ContagemPorClasse {
  concluidas: number
  naoConcluidas: number
  emAberto: number
}

export interface ComparacaoComAnterior {
  /** Total do período menos o do anterior. */
  diferenca: number
  /** "+4 vs semana passada", "−2 vs ontem". */
  texto: string
}

export interface ColunaPorDia extends ContagemPorClasse {
  data: DataLocal
  /** Rótulo do eixo ("seg", "5"); vazio quando o dia não leva rótulo. */
  rotuloDoEixo: string
  /** "qua, 11 nov · 4 concluídas · 2 não concluídas · 1 em aberto" (sem os zeros). */
  dica: string
}

export interface BarraPorCategoria extends ContagemPorClasse {
  /** `null` = sem categoria. */
  id: string | null
  nome: string
  /** Cor salva da categoria; ausente = neutra. */
  cor?: string
  total: number
}

export interface RelatorioDeNumeros extends ContagemPorClasse {
  /** Concluídas + não concluídas + em aberto. */
  total: number
  /** Pendentes que não foram transferidas (não concluídas no passado + em aberto). */
  pendentes: number
  atrasadas: number
  /** Transferidas para outro dia, pelo dia de origem. */
  adiadas: number
  /** Sobre o total, inteiros (0 sem tarefas). */
  percentualConcluidas: number
  percentualNaoConcluidas: number
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

/** Pendente: em aberto se o dia ainda não passou; senão, não concluída. */
function classeDaPendente(data: DataLocal, hoje: DataLocal): ClasseDaTarefa {
  return data < hoje ? 'naoConcluida' : 'emAberto'
}

/** Cada tarefa em cada dia em que esteve na lista, já classificada. */
function tarefasNosDias(dados: DadosDeNumeros, hoje: DataLocal): TarefaNoDia[] {
  const cardPorId = new Map(dados.cards.map((card) => [card.id, card]))
  const categoriaDaSerie = new Map(dados.series.map((serie) => [serie.id, serie.categoryId]))
  const categoriaPorTarefa = new Map<string, string | undefined>()
  const cadeiaPorTarefa = new Map<string, string>()

  const soltas = dados.tarefas.map((tarefa): TarefaNoDia => {
    categoriaPorTarefa.set(tarefa.id, tarefa.categoryId)
    cadeiaPorTarefa.set(tarefa.id, tarefa.id)
    // Arquivada guarda `concluidaEm` se foi concluída antes de arquivar.
    const isConcluida =
      tarefa.status === 'concluida' ||
      (tarefa.status === 'arquivada' && tarefa.concluidaEm !== undefined)
    return {
      data: tarefa.data,
      classe: isConcluida ? 'concluida' : classeDaPendente(tarefa.data, hoje),
      isTransferida: false,
      isAtrasada: tarefa.status === 'pendente' && tarefa.data < hoje,
      categoryId: tarefa.categoryId,
      cadeia: tarefa.id,
    }
  })

  const itens = dados.itens.flatMap((item): TarefaNoDia[] => {
    const card = cardPorId.get(item.cardId)
    if (!card) return []
    const categoryId = categoriaDaSerie.get(card.seriesId)
    categoriaPorTarefa.set(item.id, categoryId)
    cadeiaPorTarefa.set(item.id, item.cadeiaId)
    if (item.status === 'transferido') {
      return [
        {
          data: card.data,
          classe: 'naoConcluida',
          isTransferida: true,
          isAtrasada: false,
          categoryId,
          cadeia: item.cadeiaId,
        },
      ]
    }
    const isConcluido =
      item.status === 'concluido' || (item.status === 'arquivado' && item.concluidoEm !== undefined)
    return [
      {
        data: card.data,
        classe: isConcluido ? 'concluida' : classeDaPendente(card.data, hoje),
        isTransferida: false,
        isAtrasada: item.status === 'pendente' && !card.arquivado && card.data < hoje,
        categoryId,
        cadeia: item.cadeiaId,
      },
    ]
  })

  // Tarefa solta movida para um dia posterior: não concluída no dia de onde saiu. O id segue o
  // mesmo se ela virou item; se foi excluída, não conta.
  const movidas = dados.adiamentos.flatMap((adiamento): TarefaNoDia[] => {
    const cadeia = cadeiaPorTarefa.get(adiamento.tarefaId)
    if (cadeia === undefined) return []
    return [
      {
        data: adiamento.deData,
        classe: 'naoConcluida',
        isTransferida: true,
        isAtrasada: false,
        categoryId: categoriaPorTarefa.get(adiamento.tarefaId),
        cadeia,
      },
    ]
  })

  return semMarcadoresRepetidos([...soltas, ...itens, ...movidas])
}

/**
 * A mesma tarefa conta no máximo uma vez por dia: o marcador de transferência só vale se a cadeia
 * não estiver viva (feita, pendente ou arquivada) naquele dia, e dois marcadores da mesma cadeia
 * no mesmo dia (saiu, voltou e saiu de novo) contam como um.
 */
function semMarcadoresRepetidos(tarefas: TarefaNoDia[]): TarefaNoDia[] {
  const vivas = tarefas.filter((tarefa) => !tarefa.isTransferida)
  const ocupados = new Set(vivas.map((tarefa) => `${tarefa.cadeia}|${tarefa.data}`))
  const marcadores = tarefas.filter((tarefa) => {
    if (!tarefa.isTransferida) return false
    const chave = `${tarefa.cadeia}|${tarefa.data}`
    if (ocupados.has(chave)) return false
    ocupados.add(chave)
    return true
  })
  return [...vivas, ...marcadores]
}

function contarClasses(tarefas: TarefaNoDia[]): ContagemPorClasse {
  const contagem: ContagemPorClasse = { concluidas: 0, naoConcluidas: 0, emAberto: 0 }
  for (const tarefa of tarefas) {
    if (tarefa.classe === 'concluida') contagem.concluidas += 1
    else if (tarefa.classe === 'naoConcluida') contagem.naoConcluidas += 1
    else contagem.emAberto += 1
  }
  return contagem
}

function percentual(parte: number, total: number) {
  return total > 0 ? Math.round((parte / total) * 100) : 0
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

/** "4 concluídas · 2 não concluídas · 1 em aberto", sem as partes zeradas. */
export function textoDasClasses(
  { concluidas, naoConcluidas, emAberto }: ContagemPorClasse,
  isComEmAberto = true,
) {
  return [
    concluidas > 0 && plural(concluidas, 'concluída', 'concluídas'),
    naoConcluidas > 0 && plural(naoConcluidas, 'não concluída', 'não concluídas'),
    isComEmAberto && emAberto > 0 && `${emAberto} em aberto`,
  ]
    .filter(Boolean)
    .join(' · ')
}

function montarPorDia(
  doPeriodo: TarefaNoDia[],
  intervalo: Intervalo,
  tipo: 'semana' | 'mes',
): ColunaPorDia[] {
  const colunas: ColunaPorDia[] = []
  for (let data = intervalo.inicio; data <= intervalo.fim; data = somarDias(data, 1)) {
    const contagem = contarClasses(doPeriodo.filter((tarefa) => tarefa.data === data))
    const dia = deDataLocal(data)
    const numeroDoDia = dia.getDate()
    const rotuloDoEixo =
      tipo === 'semana'
        ? format(dia, 'EEEEEE', { locale: ptBR })
        : numeroDoDia === 1 || numeroDoDia % 5 === 0
          ? String(numeroDoDia)
          : ''
    const diaPorExtenso = format(dia, 'EEEEEE, d MMM', { locale: ptBR })
    const detalhe = textoDasClasses(contagem)
    colunas.push({
      data,
      ...contagem,
      rotuloDoEixo,
      dica: detalhe ? `${diaPorExtenso} · ${detalhe}` : `${diaPorExtenso} · nenhuma tarefa`,
    })
  }
  return colunas
}

function montarPorCategoria(doPeriodo: TarefaNoDia[], categorias: Category[]): BarraPorCategoria[] {
  const categoriaPorId = new Map(categorias.map((categoria) => [categoria.id, categoria]))
  const doGrupo = new Map<string | null, TarefaNoDia[]>()
  for (const tarefa of doPeriodo) {
    const chave = (tarefa.categoryId && categoriaPorId.get(tarefa.categoryId)?.id) || null
    doGrupo.set(chave, [...(doGrupo.get(chave) ?? []), tarefa])
  }
  const barras = [...doGrupo].map(([id, tarefas]): BarraPorCategoria => {
    const categoria = id ? categoriaPorId.get(id) : undefined
    return {
      id,
      nome: categoria?.nome ?? 'Sem categoria',
      ...(categoria && { cor: categoria.cor }),
      ...contarClasses(tarefas),
      total: tarefas.length,
    }
  })
  // Empate no total: segue a ordem das categorias; "Sem categoria" por último.
  const ordem = (id: string | null) => (id ? (categoriaPorId.get(id)?.ordem ?? 0) : Infinity)
  return barras.sort((a, b) => b.total - a.total || ordem(a.id) - ordem(b.id))
}

/** Monta todos os números da tela para o período. */
export function montarRelatorioDeNumeros(
  dados: DadosDeNumeros,
  periodo: PeriodoDeDados,
  hoje: DataLocal,
): RelatorioDeNumeros {
  const intervalo = intervaloDoPeriodoDeDados(periodo, hoje)
  const todas = tarefasNosDias(dados, hoje)
  const doPeriodo = todas.filter((tarefa) => isNoIntervalo(tarefa.data, intervalo))
  const total = doPeriodo.length
  const contagem = contarClasses(doPeriodo)
  const adiadas = doPeriodo.filter((tarefa) => tarefa.isTransferida).length

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

  return {
    total,
    ...contagem,
    pendentes: total - contagem.concluidas - adiadas,
    atrasadas: doPeriodo.filter((tarefa) => tarefa.isAtrasada).length,
    adiadas,
    percentualConcluidas: percentual(contagem.concluidas, total),
    percentualNaoConcluidas: percentual(contagem.naoConcluidas, total),
    ...(comparacao && { comparacao }),
    ...((periodo.tipo === 'semana' || periodo.tipo === 'mes') && {
      porDia: montarPorDia(doPeriodo, intervalo, periodo.tipo),
    }),
    porCategoria: montarPorCategoria(doPeriodo, dados.categorias),
    diasComTarefas: new Set(todas.map((tarefa) => tarefa.data)),
  }
}
