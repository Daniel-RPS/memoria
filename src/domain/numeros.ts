import { endOfMonth, format, startOfMonth, startOfWeek, subMonths } from 'date-fns'
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
import {
  agruparDiasEmIntervalos,
  resolverDiasDoPeriodo,
  type PeriodoDeDados,
} from '@/domain/periodo'
import { deDataLocal, diasEntre, paraDataLocal, somarDias } from '@/lib/datas'

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
export interface TarefaNoDia {
  data: DataLocal
  classe: ClasseDaTarefa
  /** Saiu deste dia para um posterior sem ser concluída (conta em "Adiadas"). */
  isTransferida: boolean
  /** Atrasada como no Início: pendente, não arquivada, num dia que passou. */
  isAtrasada: boolean
  categoryId?: string
  cadeia: string
}

/** Quantas de cada classe. */
export interface ContagemPorClasse {
  concluidas: number
  naoConcluidas: number
  emAberto: number
}

export interface ComparacaoComAnterior {
  diferenca: number
  texto: string
}

export interface ColunaPorDia extends ContagemPorClasse {
  data: DataLocal
  /** Rótulo do eixo ("seg", "5", "03/11"); vazio quando não leva rótulo. */
  rotuloDoEixo: string
  /** Texto completo para o tooltip. */
  dica: string
  /** Se deve haver um espaçamento maior antes desta coluna (entre períodos desconectados). */
  temEspacoAntes?: boolean
}

export interface BarraPorCategoria extends ContagemPorClasse {
  id: string | null
  nome: string
  cor?: string
  total: number
}

export interface RelatorioDeNumeros extends ContagemPorClasse {
  total: number
  pendentes: number
  atrasadas: number
  adiadas: number
  percentualConcluidas: number
  percentualNaoConcluidas: number
  comparacao?: ComparacaoComAnterior
  porDia?: ColunaPorDia[]
  porCategoria: BarraPorCategoria[]
  diasComTarefas: Set<DataLocal>
}

/**
 * Calcula o período imediatamente anterior de mesmo tamanho ou relativo:
 * - Hoje -> ontem
 * - 1 dia escolhido -> dia anterior
 * - Esta semana -> semana passada
 * - Este mês -> mês passado
 * - Intervalo contínuo de 2+ dias -> intervalo imediatamente anterior de mesmo tamanho
 * - Múltiplos períodos ou dias soltos -> undefined (omite a linha)
 */
export function periodoAnterior(
  periodo: PeriodoDeDados,
  diasDoPeriodo: DataLocal[],
  hoje: DataLocal,
): { dias: Set<DataLocal>; rotulo: string } | undefined {
  if (diasDoPeriodo.length === 0) return undefined

  if (periodo.tipo === 'hoje') {
    const ontem = somarDias(hoje, -1)
    return { dias: new Set([ontem]), rotulo: 'ontem' }
  }

  if (periodo.tipo === 'semana') {
    const primeiro = diasDoPeriodo[0]
    const dias = new Set<DataLocal>()
    for (let i = 7; i >= 1; i -= 1) {
      dias.add(somarDias(primeiro, -i))
    }
    return { dias, rotulo: 'semana passada' }
  }

  if (periodo.tipo === 'mes') {
    const dataRef = deDataLocal(diasDoPeriodo[0])
    const mesPassado = subMonths(dataRef, 1)
    const inicio = paraDataLocal(startOfMonth(mesPassado))
    const fim = paraDataLocal(endOfMonth(mesPassado))
    const dias = new Set<DataLocal>()
    for (let d = inicio; d <= fim; d = somarDias(d, 1)) {
      dias.add(d)
    }
    return { dias, rotulo: 'mês passado' }
  }

  // Tipo 'escolher'
  if (diasDoPeriodo.length === 1) {
    const anterior = somarDias(diasDoPeriodo[0], -1)
    return { dias: new Set([anterior]), rotulo: 'dia anterior' }
  }

  // 2+ dias em 'escolher': verificar se é intervalo contínuo
  const intervalos = agruparDiasEmIntervalos(diasDoPeriodo)
  if (intervalos.length === 1) {
    const tamanho = diasDoPeriodo.length
    const primeiro = intervalos[0].inicio
    const dias = new Set<DataLocal>()
    for (let i = tamanho; i >= 1; i -= 1) {
      dias.add(somarDias(primeiro, -i))
    }
    return { dias, rotulo: 'período anterior' }
  }

  // Vários períodos ou dias soltos: omite a comparação
  return undefined
}

/** Pendente: em aberto se o dia ainda não passou; senão, não concluída. */
function classeDaPendente(data: DataLocal, hoje: DataLocal): ClasseDaTarefa {
  return data < hoje ? 'naoConcluida' : 'emAberto'
}

/** Cada tarefa em cada dia em que esteve na lista, já classificada. */
export function tarefasNosDias(dados: DadosDeNumeros, hoje: DataLocal): TarefaNoDia[] {
  const cardPorId = new Map(dados.cards.map((card) => [card.id, card]))
  const categoriaDaSerie = new Map(dados.series.map((serie) => [serie.id, serie.categoryId]))
  const categoriaPorTarefa = new Map<string, string | undefined>()
  const cadeiaPorTarefa = new Map<string, string>()

  const soltas = dados.tarefas.map((tarefa): TarefaNoDia => {
    categoriaPorTarefa.set(tarefa.id, tarefa.categoryId)
    cadeiaPorTarefa.set(tarefa.id, tarefa.id)
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

function comSinal(numero: number) {
  if (numero > 0) return `+${numero}`
  if (numero < 0) return `−${Math.abs(numero)}`
  return '0'
}

function plural(quantidade: number, singular: string, varias: string) {
  return `${quantidade} ${quantidade === 1 ? singular : varias}`
}

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

/** Monta as colunas do gráfico Por dia para um conjunto de dias. */
function montarColunasPorDia(
  doPeriodo: TarefaNoDia[],
  diasOrdenados: DataLocal[],
  periodoTipo: PeriodoDeDados['tipo'],
): ColunaPorDia[] {
  const totalDias = diasOrdenados.length
  if (totalDias <= 1) return []

  const tarefasPorData = new Map<DataLocal, TarefaNoDia[]>()
  for (const t of doPeriodo) {
    const lista = tarefasPorData.get(t.data) ?? []
    lista.push(t)
    tarefasPorData.set(t.data, lista)
  }

  // <= 120 dias: uma coluna por dia
  if (totalDias <= 120) {
    const colunas: ColunaPorDia[] = []
    const isSemana = periodoTipo === 'semana'
    const isMes = periodoTipo === 'mes'

    for (let i = 0; i < totalDias; i += 1) {
      const data = diasOrdenados[i]
      const tarefasDoDia = tarefasPorData.get(data) ?? []
      const contagem = contarClasses(tarefasDoDia)
      const diaObj = deDataLocal(data)
      const numeroDoDia = diaObj.getDate()

      const diaAnterior = i > 0 ? diasOrdenados[i - 1] : undefined
      const temEspacoAntes = diaAnterior ? diasEntre(diaAnterior, data) > 1 : false

      let rotuloDoEixo = ''
      if (isSemana) {
        rotuloDoEixo = format(diaObj, 'EEEEEE', { locale: ptBR })
      } else if (isMes) {
        rotuloDoEixo = numeroDoDia === 1 || numeroDoDia % 5 === 0 ? String(numeroDoDia) : ''
      } else {
        // Trecho em 'escolher': início de trecho ou a cada ~5 colunas
        if (i === 0 || temEspacoAntes || i % 5 === 0) {
          rotuloDoEixo = format(diaObj, 'dd/MM')
        }
      }

      const diaPorExtenso = format(diaObj, 'EEEEEE, d MMM', { locale: ptBR })
      const detalhe = textoDasClasses(contagem)
      colunas.push({
        data,
        ...contagem,
        rotuloDoEixo,
        dica: detalhe ? `${diaPorExtenso} · ${detalhe}` : `${diaPorExtenso} · nenhuma tarefa`,
        temEspacoAntes,
      })
    }
    return colunas
  }

  // > 120 dias: uma coluna por semana (segunda a domingo recortada pelo período)
  // Agrupa os dias consecutivos/semanas
  const semanasMap = new Map<string, DataLocal[]>()
  for (const data of diasOrdenados) {
    const d = deDataLocal(data)
    const seg = paraDataLocal(startOfWeek(d, { weekStartsOn: 1 }))
    const lista = semanasMap.get(seg) ?? []
    lista.push(data)
    semanasMap.set(seg, lista)
  }

  const colunas: ColunaPorDia[] = []
  const chavesSemanas = [...semanasMap.keys()].sort()

  for (let i = 0; i < chavesSemanas.length; i += 1) {
    const seg = chavesSemanas[i]
    const diasDestaSemana = semanasMap.get(seg)!
    const primeiroDia = diasDestaSemana[0]
    const ultimoDia = diasDestaSemana[diasDestaSemana.length - 1]

    let concluidas = 0
    let naoConcluidas = 0
    let emAberto = 0

    for (const d of diasDestaSemana) {
      const tarefasDoDia = tarefasPorData.get(d) ?? []
      const c = contarClasses(tarefasDoDia)
      concluidas += c.concluidas
      naoConcluidas += c.naoConcluidas
      emAberto += c.emAberto
    }

    const contagem: ContagemPorClasse = { concluidas, naoConcluidas, emAberto }

    const semanaAnteriorSeg = i > 0 ? chavesSemanas[i - 1] : undefined
    const temEspacoAntes = semanaAnteriorSeg
      ? diasEntre(semanasMap.get(semanaAnteriorSeg)!.slice(-1)[0], primeiroDia) > 1
      : false

    let rotuloDoEixo = ''
    if (i === 0 || temEspacoAntes || i % 5 === 0) {
      rotuloDoEixo = format(deDataLocal(primeiroDia), 'dd/MM')
    }

    const dInicio = deDataLocal(primeiroDia)
    const dFim = deDataLocal(ultimoDia)
    const intervaloExtenso =
      primeiroDia === ultimoDia
        ? format(dInicio, "d 'de' MMM", { locale: ptBR })
        : `${format(dInicio, 'dd MMM', { locale: ptBR })} – ${format(dFim, 'dd MMM', { locale: ptBR })}`

    const detalhe = textoDasClasses(contagem)
    const dica = detalhe
      ? `${intervaloExtenso} · ${detalhe}`
      : `${intervaloExtenso} · nenhuma tarefa`

    colunas.push({
      data: primeiroDia,
      ...contagem,
      rotuloDoEixo,
      dica,
      temEspacoAntes,
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
  const ordem = (id: string | null) => (id ? (categoriaPorId.get(id)?.ordem ?? 0) : Infinity)
  return barras.sort((a, b) => b.total - a.total || ordem(a.id) - ordem(b.id))
}

/** Monta todos os números da tela para o período baseado em conjunto de dias. */
export function montarRelatorioDeNumeros(
  dados: DadosDeNumeros,
  periodo: PeriodoDeDados,
  hoje: DataLocal,
): RelatorioDeNumeros {
  const diasDoPeriodo = resolverDiasDoPeriodo(periodo, hoje)
  const setDias = new Set(diasDoPeriodo)
  const todas = tarefasNosDias(dados, hoje)
  const doPeriodo = todas.filter((tarefa) => setDias.has(tarefa.data))
  const total = doPeriodo.length
  const contagem = contarClasses(doPeriodo)
  const adiadas = doPeriodo.filter((tarefa) => tarefa.isTransferida).length

  const anterior = periodoAnterior(periodo, diasDoPeriodo, hoje)
  const totalAnterior = anterior
    ? todas.filter((tarefa) => anterior.dias.has(tarefa.data)).length
    : 0
  const comparacao =
    anterior && totalAnterior > 0
      ? {
          diferenca: total - totalAnterior,
          texto: `${comSinal(total - totalAnterior)} vs ${anterior.rotulo}`,
        }
      : undefined

  const porDia =
    diasDoPeriodo.length >= 2
      ? montarColunasPorDia(doPeriodo, diasDoPeriodo, periodo.tipo)
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
    ...(porDia && { porDia }),
    porCategoria: montarPorCategoria(doPeriodo, dados.categorias),
    diasComTarefas: new Set(todas.map((tarefa) => tarefa.data)),
  }
}
