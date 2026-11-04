import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { z } from 'zod'
import { db } from '@/db/database'
import { agora } from '@/db/repositories/ordenacao'
import type {
  Category,
  DataLocal,
  GroupCard,
  GroupItem,
  GroupSeries,
  Task,
  TimeSession,
} from '@/db/types'
import { SEM_ANDAMENTO } from '@/lib/andamento'
import { deDataLocal, diasEntre, isDataLocalValida, paraDataLocal, somarDias } from '@/lib/datas'
import { ErroDeValidacao } from '@/lib/erros'
import { diaLocalDoMomento } from '@/lib/filtro-de-data'
import { normalizar } from '@/lib/procedimentos'
import { PRIMEIRO_DIA_DA_SEMANA } from '@/lib/semana'

/** Chave no localStorage para lembrar o filtro de período da aba Dados. */
export const CHAVE_PERIODO_DADOS = 'memoria:dados-periodo'

/** Sessão ligada há 4 horas ou mais aciona o aviso de "esqueci ligado". */
export const LIMITE_SESSAO_LONGA_MS = 4 * 60 * 60 * 1000

export type PeriodoDeDados =
  | { tipo: 'hoje' }
  | { tipo: 'semana' }
  | { tipo: 'mes' }
  | { tipo: 'dia'; dia: DataLocal }
  | { tipo: 'intervalo'; inicio: DataLocal; fim: DataLocal }

export const PERIODO_PADRAO_DADOS: PeriodoDeDados = { tipo: 'semana' }

const dataLocalSchema = z.string().refine((texto) => isDataLocalValida(texto))

const esquemaPeriodoDeDados = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('hoje') }),
  z.object({ tipo: z.literal('semana') }),
  z.object({ tipo: z.literal('mes') }),
  z.object({ tipo: z.literal('dia'), dia: dataLocalSchema }),
  z.object({ tipo: z.literal('intervalo'), inicio: dataLocalSchema, fim: dataLocalSchema }),
])

/** Lê o período salvo no localStorage; ausente ou inválido volta para "Esta semana". */
export function lerPeriodoDeDados(texto: string | null): PeriodoDeDados {
  if (!texto) return PERIODO_PADRAO_DADOS
  try {
    const lido = esquemaPeriodoDeDados.safeParse(JSON.parse(texto))
    return lido.success ? (lido.data as PeriodoDeDados) : PERIODO_PADRAO_DADOS
  } catch {
    return PERIODO_PADRAO_DADOS
  }
}

/** Primeiro e último dia local (inclusive) cobertos pelo filtro de período. */
export function intervaloDoPeriodoDeDados(
  periodo: PeriodoDeDados,
  hoje: DataLocal,
): { inicio: DataLocal; fim: DataLocal } {
  const dataHoje = deDataLocal(hoje)
  switch (periodo.tipo) {
    case 'hoje':
      return { inicio: hoje, fim: hoje }
    case 'dia':
      return { inicio: periodo.dia, fim: periodo.dia }
    case 'semana':
      return {
        inicio: paraDataLocal(startOfWeek(dataHoje, { weekStartsOn: PRIMEIRO_DIA_DA_SEMANA })),
        fim: paraDataLocal(endOfWeek(dataHoje, { weekStartsOn: PRIMEIRO_DIA_DA_SEMANA })),
      }
    case 'mes':
      return {
        inicio: paraDataLocal(startOfMonth(dataHoje)),
        fim: paraDataLocal(endOfMonth(dataHoje)),
      }
    case 'intervalo':
      return periodo.inicio <= periodo.fim
        ? { inicio: periodo.inicio, fim: periodo.fim }
        : { inicio: periodo.fim, fim: periodo.inicio }
  }
}

/** Rótulo do dia escolhido no filtro ("qua, 12/11"). */
export function rotuloDoDiaEscolhido(periodo: PeriodoDeDados): string | undefined {
  if (periodo.tipo === 'dia') {
    return format(deDataLocal(periodo.dia), 'cccccc, dd/MM', { locale: ptBR })
  }
  return undefined
}

/** Rótulo curto do botão "Escolher…" quando há um intervalo personalizado ativo (legado). */
export function rotuloDoIntervaloPersonalizado(
  periodo: PeriodoDeDados,
  hoje: DataLocal,
): string | undefined {
  if (periodo.tipo === 'dia') return rotuloDoDiaEscolhido(periodo)
  if (periodo.tipo !== 'intervalo') return undefined
  const { inicio, fim } = intervaloDoPeriodoDeDados(periodo, hoje)
  const formatarDia = (dia: DataLocal) =>
    format(deDataLocal(dia), dia.slice(0, 4) === hoje.slice(0, 4) ? 'dd/MM' : 'dd/MM/yyyy')
  return inicio === fim ? formatarDia(inicio) : `${formatarDia(inicio)} – ${formatarDia(fim)}`
}

/** Duração bruta de uma sessão em milissegundos (sessão aberta usa `agoraIso`). */
export function duracaoDaSessaoMs(
  sessao: Pick<TimeSession, 'inicio' | 'fim'>,
  agoraIso: string = new Date().toISOString(),
): number {
  const inicioMs = new Date(sessao.inicio).getTime()
  const fimMs = new Date(sessao.fim ?? agoraIso).getTime()
  if (Number.isNaN(inicioMs) || Number.isNaN(fimMs)) return 0
  return Math.max(0, fimMs - inicioMs)
}

/**
 * Rótulo compacto ao lado de "agora" na tarefa em andamento:
 * abaixo de 1 min → "agora · <1 min"; 1..59 min → "agora · 12 min"; ≥ 1h → "agora · 1h 05".
 */
export function formatarTempoAgora(ms: number): string {
  const minutos = Math.floor(Math.max(0, ms) / 60_000)
  if (minutos < 1) return 'agora · <1 min'
  if (minutos < 60) return `agora · ${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return `agora · ${horas}h ${String(resto).padStart(2, '0')}`
}

/**
 * Formata uma duração para o rodapé do menu ⋯ e para a tela Dados:
 * < 1 min (mas > 0) → "<1 min"; < 1h → "12 min"; ≥ 1h → "1h 20 min" (ou "2h" se redondo).
 */
export function formatarDuracao(ms: number): string {
  if (ms <= 0) return '0 min'
  const minutos = Math.floor(ms / 60_000)
  if (minutos < 1) return '<1 min'
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `${horas}h` : `${horas}h ${resto} min`
}

/** Duração resumida para o aviso de sessão longa ("9h", "5h", "1h 30 min", "45 min"). */
export function formatarDuracaoAviso(ms: number): string {
  const minutos = Math.max(1, Math.floor(ms / 60_000))
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `${horas}h` : `${horas}h ${resto} min`
}

/** Início (00:00 do 1º dia) e fim exclusivo (00:00 do dia seguinte ao último) em ms locais. */
export function limitesDoIntervaloLocal(
  inicio: DataLocal,
  fim: DataLocal,
): { inicioMs: number; fimMs: number } {
  const [de, ate] = inicio <= fim ? [inicio, fim] : [fim, inicio]
  return {
    inicioMs: deDataLocal(de).getTime(),
    fimMs: deDataLocal(somarDias(ate, 1)).getTime(),
  }
}

export interface TrechoDeSessao {
  inicioMs: number
  fimMs: number
  duracaoMs: number
}

/**
 * Corta a sessão pelo intervalo `[inicioIntervaloMs, fimIntervaloMs]`.
 * Devolve `null` se a sessão não toca o intervalo.
 */
export function cortarSessaoNoIntervalo(
  sessao: Pick<TimeSession, 'inicio' | 'fim'>,
  inicioIntervaloMs: number,
  fimIntervaloMs: number,
  agoraIso: string = new Date().toISOString(),
): TrechoDeSessao | null {
  const inicioSessaoMs = new Date(sessao.inicio).getTime()
  const fimSessaoMs = new Date(sessao.fim ?? agoraIso).getTime()
  if (Number.isNaN(inicioSessaoMs) || Number.isNaN(fimSessaoMs) || fimSessaoMs <= inicioSessaoMs) {
    return null
  }
  const inicioMs = Math.max(inicioSessaoMs, inicioIntervaloMs)
  const fimMs = Math.min(fimSessaoMs, fimIntervaloMs)
  if (fimMs <= inicioMs) return null
  return { inicioMs, fimMs, duracaoMs: fimMs - inicioMs }
}

export interface FatiaDiariaDeSessao extends TrechoDeSessao {
  data: DataLocal
}

/**
 * Fatia uma sessão dia a dia na meia-noite local (opcionalmente já cortada por um intervalo de
 * datas locais). Uma sessão das 23h às 01h vira duas fatias: 1h no primeiro dia e 1h no segundo.
 */
export function fatiarSessaoPorDiaLocal(
  sessao: Pick<TimeSession, 'inicio' | 'fim'>,
  agoraIso: string = new Date().toISOString(),
  intervalo?: { inicio: DataLocal; fim: DataLocal },
): FatiaDiariaDeSessao[] {
  const limites = intervalo
    ? limitesDoIntervaloLocal(intervalo.inicio, intervalo.fim)
    : { inicioMs: -Infinity, fimMs: Infinity }
  const trecho = cortarSessaoNoIntervalo(sessao, limites.inicioMs, limites.fimMs, agoraIso)
  if (!trecho) return []

  const fatias: FatiaDiariaDeSessao[] = []
  let cursorMs = trecho.inicioMs
  while (cursorMs < trecho.fimMs) {
    const data = paraDataLocal(new Date(cursorMs))
    const proximaMeiaNoiteMs = deDataLocal(somarDias(data, 1)).getTime()
    const fimDaFatiaMs = Math.min(trecho.fimMs, proximaMeiaNoiteMs)
    if (fimDaFatiaMs > cursorMs) {
      fatias.push({
        data,
        inicioMs: cursorMs,
        fimMs: fimDaFatiaMs,
        duracaoMs: fimDaFatiaMs - cursorMs,
      })
    }
    cursorMs = fimDaFatiaMs
  }
  return fatias
}

export interface DadosDeTempo {
  sessoes: TimeSession[]
  tarefas: Task[]
  itens: GroupItem[]
  cards: GroupCard[]
  series: GroupSeries[]
  categorias: Category[]
}

export interface SessaoNoPeriodo {
  id: string
  inicio: string
  fim?: string
  dataLocal: DataLocal
  duracaoTotalMs: number
  duracaoNoPeriodoMs: number
  isAberta: boolean
}

export interface ResumoTarefaNoTempo {
  /** Chave única que une as cópias da mesma tarefa/item (`tarefaId` ou `cadeiaId`). */
  chave: string
  tipo: 'tarefa' | 'item'
  titulo: string
  nomeGrupo?: string
  categoria?: { id: string; nome: string; cor: string }
  isArquivada: boolean
  tempoTotalMs: number
  diasTrabalhados: DataLocal[]
  sessoes: SessaoNoPeriodo[]
}

export interface TempoPorCategoria {
  categoryId: string | null
  nome: string
  cor: string | null
  tempoMs: number
  percentual: number
}

export interface TempoPorDia {
  data: DataLocal
  tempoMs: number
}

export interface ItemGraficoPorTarefa {
  chave: string
  titulo: string
  nomeGrupo?: string
  cor: string | null
  tempoMs: number
  proporcao: number
  isOutras?: boolean
}

export interface CategoriaDaLegenda {
  id: string | null
  nome: string
  cor: string | null
}

export interface DadosGraficoPorTarefa {
  itens: ItemGraficoPorTarefa[]
  categoriasLegenda: CategoriaDaLegenda[]
}

export interface FatiaGraficoPizza {
  id: string | null
  nome: string
  cor: string | null
  tempoMs: number
  percentual: number
  isOutras?: boolean
}

export interface TarefaNaCategoria {
  chave: string
  tipo: 'tarefa' | 'item'
  titulo: string
  nomeGrupo?: string
  isArquivada: boolean
  tempoTotalMs: number
  diasTrabalhados: DataLocal[]
  sessoes: SessaoNoPeriodo[]
}

export interface CategoriaComTarefas {
  id: string | null
  nome: string
  cor: string | null
  tempoTotalMs: number
  tarefas: TarefaNaCategoria[]
}

export interface ResumoLinhaTempo {
  tempoMedioMs: number
  tarefasMedidas: number
  tarefaComMaisTempo?: { titulo: string; tempoMs: number; cor?: string | null }
  tarefaComMenosTempo?: { titulo: string; tempoMs: number; cor?: string | null }
}

export interface RelatorioDeTempo {
  intervalo: { inicio: DataLocal; fim: DataLocal }
  tempoTotalMs: number
  tempoMedioMs: number
  tarefasMedidas: number
  tarefaComMaisTempo?: { titulo: string; tempoMs: number; cor?: string | null }
  tarefaComMenosTempo?: { titulo: string; tempoMs: number; cor?: string | null }
  porCategoria: TempoPorCategoria[]
  fatiasPizza: FatiaGraficoPizza[]
  porDia: TempoPorDia[]
  tarefas: ResumoTarefaNoTempo[]
  categoriasComTarefas: CategoriaComTarefas[]
  graficoPorTarefa: DadosGraficoPorTarefa
  diasComTempo: Set<DataLocal>
}

interface AlvoResolvido {
  chave: string
  tipo: 'tarefa' | 'item'
  titulo: string
  nomeGrupo?: string
  categoria?: { id: string; nome: string; cor: string }
  isArquivada: boolean
}

/**
 * Descobre a cadeia (`cadeiaId`) de um item seguindo `origemItemId` caso `cadeiaId` não esteja
 * preenchido na sessão.
 */
function resolverCadeiaDoItem(itemId: string, itemPorId: Map<string, GroupItem>): string {
  const visitados = new Set<string>()
  let atual = itemPorId.get(itemId)
  if (!atual) return itemId
  if (atual.cadeiaId) return atual.cadeiaId
  while (atual.origemItemId && !visitados.has(atual.origemItemId)) {
    visitados.add(atual.id)
    const pai = itemPorId.get(atual.origemItemId)
    if (!pai) break
    if (pai.cadeiaId) return pai.cadeiaId
    atual = pai
  }
  return atual.id
}

function criarResolvedorDeAlvo(dados: DadosDeTempo) {
  const tarefaPorId = new Map(dados.tarefas.map((t) => [t.id, t]))
  const itemPorId = new Map(dados.itens.map((i) => [i.id, i]))
  const cardPorId = new Map(dados.cards.map((c) => [c.id, c]))
  const seriePorId = new Map(dados.series.map((s) => [s.id, s]))
  const categoriaPorId = new Map(dados.categorias.map((c) => [c.id, c]))

  // Agrupa itens por cadeiaId para achar o título mais recente e saber se a cadeia está arquivada.
  const itensPorCadeia = new Map<string, GroupItem[]>()
  for (const item of dados.itens) {
    const cadeiaId = item.cadeiaId || resolverCadeiaDoItem(item.id, itemPorId)
    const lista = itensPorCadeia.get(cadeiaId) ?? []
    lista.push(item)
    itensPorCadeia.set(cadeiaId, lista)
  }

  const resolverCategoria = (idCategoria?: string) => {
    if (!idCategoria) return undefined
    const cat = categoriaPorId.get(idCategoria)
    return cat ? { id: cat.id, nome: cat.nome, cor: cat.cor } : undefined
  }

  return function resolver(sessao: TimeSession): AlvoResolvido {
    const idCandidato = sessao.cadeiaId ?? sessao.itemId ?? sessao.tarefaId ?? sessao.id
    const cadeiaId = sessao.itemId
      ? (sessao.cadeiaId ?? resolverCadeiaDoItem(sessao.itemId, itemPorId))
      : sessao.cadeiaId

    // 1. Se existe tarefa solta com esse id (mesmo que antes tenha sido item tirado do grupo)
    const tarefa = tarefaPorId.get(sessao.tarefaId ?? cadeiaId ?? '')
    if (tarefa) {
      return {
        chave: `tarefa:${tarefa.id}`,
        tipo: 'tarefa',
        titulo: tarefa.titulo,
        categoria: resolverCategoria(tarefa.categoryId ?? sessao.categoryId),
        isArquivada: tarefa.status === 'arquivada',
      }
    }

    // 2. Se é item de grupo (ou tarefa que foi colocada num grupo mantendo o id)
    const chaveCadeia = cadeiaId ?? sessao.tarefaId ?? idCandidato
    const itensDaCadeia = itensPorCadeia.get(chaveCadeia) ?? []
    const itemDireto = sessao.itemId ? itemPorId.get(sessao.itemId) : undefined
    const todosOsItens = itensDaCadeia.length > 0 ? itensDaCadeia : itemDireto ? [itemDireto] : []

    if (todosOsItens.length > 0) {
      // Escolhe o exemplar mais recente pelo dia do card (e depois por atualizadoEm)
      const ordenado = [...todosOsItens].sort((a, b) => {
        const dataA = cardPorId.get(a.cardId)?.data ?? ''
        const dataB = cardPorId.get(b.cardId)?.data ?? ''
        return dataB.localeCompare(dataA) || b.atualizadoEm.localeCompare(a.atualizadoEm)
      })
      const representante = ordenado.find((i) => i.status !== 'transferido') ?? ordenado[0]
      const card = cardPorId.get(representante.cardId)
      const serie = seriePorId.get(card?.seriesId ?? sessao.grupoId ?? '')
      const naoTransferidos = todosOsItens.filter((i) => i.status !== 'transferido')
      const isArquivada =
        naoTransferidos.length > 0 &&
        naoTransferidos.every(
          (i) => i.status === 'arquivado' || cardPorId.get(i.cardId)?.arquivado === true,
        )

      return {
        chave: `item:${chaveCadeia}`,
        tipo: 'item',
        titulo: representante.titulo,
        ...(serie ? { nomeGrupo: serie.titulo } : {}),
        categoria: resolverCategoria(serie?.categoryId ?? sessao.categoryId),
        isArquivada,
      }
    }

    // 3. Fallback caso o registro tenha sido apagado fora do fluxo normal
    const serieFallback = sessao.grupoId ? seriePorId.get(sessao.grupoId) : undefined
    return {
      chave: sessao.itemId || sessao.cadeiaId ? `item:${chaveCadeia}` : `tarefa:${idCandidato}`,
      tipo: sessao.itemId || sessao.cadeiaId ? 'item' : 'tarefa',
      titulo: 'Tarefa removida',
      ...(serieFallback ? { nomeGrupo: serieFallback.titulo } : {}),
      categoria: resolverCategoria(serieFallback?.categoryId ?? sessao.categoryId),
      isArquivada: false,
    }
  }
}

/**
 * Monta todos os números, gráficos e a lista de tarefas da seção "Tempo nas tarefas" para o
 * período escolhido. Sessões que atravessam o período ou a meia-noite contam só a fatia dentro
 * de cada dia do período.
 */
export function montarRelatorioDeTempo(
  dados: DadosDeTempo,
  periodo: PeriodoDeDados,
  hoje: DataLocal,
  agoraIso: string = new Date().toISOString(),
): RelatorioDeTempo {
  const intervalo = intervaloDoPeriodoDeDados(periodo, hoje)
  const { inicioMs, fimMs } = limitesDoIntervaloLocal(intervalo.inicio, intervalo.fim)
  const resolverAlvo = criarResolvedorDeAlvo(dados)

  const mapaTarefas = new Map<
    string,
    {
      alvo: AlvoResolvido
      tempoTotalMs: number
      dias: Set<DataLocal>
      sessoes: SessaoNoPeriodo[]
    }
  >()
  const mapaCategorias = new Map<
    string | null,
    { categoryId: string | null; nome: string; cor: string | null; tempoMs: number }
  >()
  const mapaDias = new Map<DataLocal, number>()
  const totalDias = Math.max(0, diasEntre(intervalo.inicio, intervalo.fim))
  for (let i = 0; i <= totalDias; i += 1) {
    mapaDias.set(somarDias(intervalo.inicio, i), 0)
  }

  let tempoTotalMs = 0

  for (const sessao of dados.sessoes) {
    const corte = cortarSessaoNoIntervalo(sessao, inicioMs, fimMs, agoraIso)
    if (!corte || corte.duracaoMs <= 0) continue

    const alvo = resolverAlvo(sessao)
    const fatias = fatiarSessaoPorDiaLocal(sessao, agoraIso, intervalo)
    tempoTotalMs += corte.duracaoMs

    // Soma por dia
    for (const fatia of fatias) {
      mapaDias.set(fatia.data, (mapaDias.get(fatia.data) ?? 0) + fatia.duracaoMs)
    }

    // Soma por categoria
    const chaveCat = alvo.categoria?.id ?? null
    const atualCat = mapaCategorias.get(chaveCat) ?? {
      categoryId: chaveCat,
      nome: alvo.categoria?.nome ?? 'Sem categoria',
      cor: alvo.categoria?.cor ?? null,
      tempoMs: 0,
    }
    atualCat.tempoMs += corte.duracaoMs
    mapaCategorias.set(chaveCat, atualCat)

    // Soma por tarefa/item
    let entrada = mapaTarefas.get(alvo.chave)
    if (!entrada) {
      entrada = { alvo, tempoTotalMs: 0, dias: new Set(), sessoes: [] }
      mapaTarefas.set(alvo.chave, entrada)
    }
    entrada.tempoTotalMs += corte.duracaoMs
    for (const fatia of fatias) entrada.dias.add(fatia.data)
    entrada.sessoes.push({
      id: sessao.id,
      inicio: sessao.inicio,
      fim: sessao.fim,
      dataLocal: diaLocalDoMomento(new Date(corte.inicioMs).toISOString()) ?? intervalo.inicio,
      duracaoTotalMs: duracaoDaSessaoMs(sessao, agoraIso),
      duracaoNoPeriodoMs: corte.duracaoMs,
      isAberta: sessao.fim === undefined,
    })
  }

  const tarefas: ResumoTarefaNoTempo[] = [...mapaTarefas.values()]
    .map(({ alvo, tempoTotalMs: totalTarefa, dias, sessoes }) => ({
      chave: alvo.chave,
      tipo: alvo.tipo,
      titulo: alvo.titulo,
      ...(alvo.nomeGrupo ? { nomeGrupo: alvo.nomeGrupo } : {}),
      ...(alvo.categoria ? { categoria: alvo.categoria } : {}),
      isArquivada: alvo.isArquivada,
      tempoTotalMs: totalTarefa,
      diasTrabalhados: [...dias].sort(),
      sessoes: [...sessoes].sort((a, b) => b.inicio.localeCompare(a.inicio)),
    }))
    .sort((a, b) => b.tempoTotalMs - a.tempoTotalMs || a.titulo.localeCompare(b.titulo, 'pt-BR'))

  const porCategoria: TempoPorCategoria[] = [...mapaCategorias.values()]
    .sort((a, b) => b.tempoMs - a.tempoMs || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((cat) => ({
      ...cat,
      percentual: tempoTotalMs > 0 ? (cat.tempoMs / tempoTotalMs) * 100 : 0,
    }))

  const porDia: TempoPorDia[] = [...mapaDias.entries()].map(([data, tempoMs]) => ({
    data,
    tempoMs,
  }))

  const isVisaoDeUmDia = periodo.tipo === 'hoje' || periodo.tipo === 'dia'
  const modoTop5 = !isVisaoDeUmDia
  const graficoPorTarefa = modoTop5
    ? montarGraficoPorTarefa(tarefas, 5, false)
    : montarGraficoPorTarefa(tarefas, 8, true)

  const fatiasPizza = montarPizzaPorCategoria(porCategoria, tempoTotalMs)
  const categoriasComTarefas = agruparTarefasPorCategoria(tarefas)
  const resumo = calcularResumoTempo(tarefas, tempoTotalMs)
  const diasComTempo = listarDiasComTempo(dados.sessoes, agoraIso)

  return {
    intervalo,
    tempoTotalMs,
    tempoMedioMs: resumo.tempoMedioMs,
    tarefasMedidas: resumo.tarefasMedidas,
    tarefaComMaisTempo: resumo.tarefaComMaisTempo,
    tarefaComMenosTempo: resumo.tarefaComMenosTempo,
    porCategoria,
    fatiasPizza,
    porDia,
    tarefas,
    categoriasComTarefas,
    graficoPorTarefa,
    diasComTempo,
  }
}

/**
 * Prepara os dados para o gráfico "Por tarefa":
 * - Ordenadas do maior para o menor tempo no período
 * - Comprimento proporcional à tarefa com mais tempo (100% para a maior)
 * - Até 8 tarefas no gráfico; acima disso, agrupa o excedente na linha "+N outras" (cor neutra)
 * - Em modo Top 5 (Semana/Mês), limita a 5 sem "+N outras"
 * - Extrai a legenda compacta das categorias únicas presentes nas tarefas do período
 */
export function montarGraficoPorTarefa(
  tarefas: ResumoTarefaNoTempo[],
  limiteTarefas = 8,
  permitirOutras = true,
): DadosGraficoPorTarefa {
  const tarefasValidas = [...tarefas]
    .filter((t) => t.tempoTotalMs > 0)
    .sort((a, b) => b.tempoTotalMs - a.tempoTotalMs || a.titulo.localeCompare(b.titulo, 'pt-BR'))

  if (tarefasValidas.length === 0) {
    return { itens: [], categoriasLegenda: [] }
  }

  const maiorTempoMs = tarefasValidas[0].tempoTotalMs

  const mapaCategorias = new Map<string, CategoriaDaLegenda>()
  for (const tarefa of tarefasValidas) {
    const chave = tarefa.categoria?.id ?? 'sem-categoria'
    if (!mapaCategorias.has(chave)) {
      mapaCategorias.set(chave, {
        id: tarefa.categoria?.id ?? null,
        nome: tarefa.categoria?.nome ?? 'Sem categoria',
        cor: tarefa.categoria?.cor ?? null,
      })
    }
  }
  const categoriasLegenda = [...mapaCategorias.values()]

  const principais = tarefasValidas.slice(0, limiteTarefas)
  const excedentes = tarefasValidas.slice(limiteTarefas)

  const itens: ItemGraficoPorTarefa[] = principais.map((t) => ({
    chave: t.chave,
    titulo: t.titulo,
    ...(t.nomeGrupo ? { nomeGrupo: t.nomeGrupo } : {}),
    cor: t.categoria?.cor ?? null,
    tempoMs: t.tempoTotalMs,
    proporcao: maiorTempoMs > 0 ? Math.round((t.tempoTotalMs / maiorTempoMs) * 100) : 0,
  }))

  if (permitirOutras && excedentes.length > 0) {
    const tempoOutrasMs = excedentes.reduce((soma, t) => soma + t.tempoTotalMs, 0)
    itens.push({
      chave: 'outras',
      titulo: `+${excedentes.length} outras`,
      cor: null,
      tempoMs: tempoOutrasMs,
      proporcao: maiorTempoMs > 0 ? Math.round((tempoOutrasMs / maiorTempoMs) * 100) : 0,
      isOutras: true,
    })
  }

  return { itens, categoriasLegenda }
}

/**
 * Calcula o resumo da linha de métricas de tempo:
 * - Tempo médio por tarefa: soma / quantidade de tarefas
 * - Tarefas realizadas: quantidade de tarefas/itens com tempo medido no período
 * - Mais tempo: tarefa com maior tempo no período
 * - Menos tempo: tarefa com menor tempo no período, ignorando sessões abaixo de 1 min
 */
export function calcularResumoTempo(
  tarefas: ResumoTarefaNoTempo[],
  tempoTotalMs: number,
): ResumoLinhaTempo {
  const tarefasMedidas = tarefas.length
  const tempoMedioMs = tarefasMedidas > 0 ? Math.round(tempoTotalMs / tarefasMedidas) : 0

  const tarefaComMaisTempo = tarefas[0]
    ? {
        titulo: tarefas[0].titulo,
        tempoMs: tarefas[0].tempoTotalMs,
        cor: tarefas[0].categoria?.cor ?? null,
      }
    : undefined

  // "Ignorar sessões abaixo de 1 min para não aparecer '<1 min' como menor."
  const candidatasMenor: { titulo: string; tempoMs: number; cor: string | null }[] = []

  for (const tarefa of tarefas) {
    const sessoesValidas = tarefa.sessoes.filter((s) => s.duracaoNoPeriodoMs >= 60_000)
    if (sessoesValidas.length > 0) {
      const tempoValidoMs = sessoesValidas.reduce((acc, s) => acc + s.duracaoNoPeriodoMs, 0)
      if (tempoValidoMs >= 60_000) {
        candidatasMenor.push({
          titulo: tarefa.titulo,
          tempoMs: tempoValidoMs,
          cor: tarefa.categoria?.cor ?? null,
        })
      }
    }
  }

  candidatasMenor.sort((a, b) => a.tempoMs - b.tempoMs || a.titulo.localeCompare(b.titulo, 'pt-BR'))

  const tarefaComMenosTempo = candidatasMenor[0]

  return {
    tempoMedioMs,
    tarefasMedidas,
    tarefaComMaisTempo,
    tarefaComMenosTempo,
  }
}

/**
 * Prepara fatias para o gráfico de pizza por categoria:
 * - Fatias ordenadas da maior para a menor
 * - Mais de 6 categorias: top 5 mantidas e o resto vira fatia "Outras"
 */
export function montarPizzaPorCategoria(
  porCategoria: TempoPorCategoria[],
  tempoTotalMs: number,
): FatiaGraficoPizza[] {
  const validas = porCategoria.filter((c) => c.tempoMs > 0)
  if (validas.length === 0 || tempoTotalMs <= 0) return []

  if (validas.length <= 6) {
    return validas.map((c) => ({
      id: c.categoryId,
      nome: c.nome,
      cor: c.cor,
      tempoMs: c.tempoMs,
      percentual: (c.tempoMs / tempoTotalMs) * 100,
    }))
  }

  const top5 = validas.slice(0, 5)
  const excedentes = validas.slice(5)
  const somaExcedenteMs = excedentes.reduce((acc, c) => acc + c.tempoMs, 0)

  const resultado: FatiaGraficoPizza[] = top5.map((c) => ({
    id: c.categoryId,
    nome: c.nome,
    cor: c.cor,
    tempoMs: c.tempoMs,
    percentual: (c.tempoMs / tempoTotalMs) * 100,
  }))

  if (somaExcedenteMs > 0) {
    resultado.push({
      id: 'outras',
      nome: 'Outras',
      cor: null,
      tempoMs: somaExcedenteMs,
      percentual: (somaExcedenteMs / tempoTotalMs) * 100,
      isOutras: true,
    })
  }

  return resultado
}

/**
 * Agrupa as tarefas medidas por categoria:
 * - Cada categoria tem seu tempo total e tarefas
 * - Tarefas dentro de cada categoria ordenadas da maior para a menor
 * - Sessões dentro de cada tarefa ordenadas da mais recente para a mais antiga
 * - Categorias ordenadas do maior tempo para o menor (com "Sem categoria" por último se empatar)
 */
export function agruparTarefasPorCategoria(tarefas: ResumoTarefaNoTempo[]): CategoriaComTarefas[] {
  const mapa = new Map<string | null, CategoriaComTarefas>()

  for (const t of tarefas) {
    const id = t.categoria?.id ?? null
    const nome = t.categoria?.nome ?? 'Sem categoria'
    const cor = t.categoria?.cor ?? null

    let cat = mapa.get(id)
    if (!cat) {
      cat = { id, nome, cor, tempoTotalMs: 0, tarefas: [] }
      mapa.set(id, cat)
    }

    cat.tempoTotalMs += t.tempoTotalMs
    cat.tarefas.push({
      chave: t.chave,
      tipo: t.tipo,
      titulo: t.titulo,
      ...(t.nomeGrupo ? { nomeGrupo: t.nomeGrupo } : {}),
      isArquivada: t.isArquivada,
      tempoTotalMs: t.tempoTotalMs,
      diasTrabalhados: t.diasTrabalhados,
      sessoes: [...t.sessoes].sort((a, b) => b.inicio.localeCompare(a.inicio)),
    })
  }

  for (const cat of mapa.values()) {
    cat.tarefas.sort(
      (a, b) => b.tempoTotalMs - a.tempoTotalMs || a.titulo.localeCompare(b.titulo, 'pt-BR'),
    )
  }

  return [...mapa.values()].sort((a, b) => {
    if (b.tempoTotalMs !== a.tempoTotalMs) {
      return b.tempoTotalMs - a.tempoTotalMs
    }
    // "Sem categoria" sempre por último se empatar
    if (a.id === null && b.id !== null) return 1
    if (a.id !== null && b.id === null) return -1
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })
}

/**
 * Filtra a árvore de categorias por busca:
 * Se o nome da categoria bater, inclui todas as tarefas da categoria.
 * Se apenas a tarefa/grupo bater, inclui apenas as tarefas correspondentes na categoria.
 */
export function filtrarCategoriasDeTempo(
  categorias: CategoriaComTarefas[],
  busca: string,
): CategoriaComTarefas[] {
  const termo = normalizar(busca.trim())
  if (!termo) return categorias

  const resultado: CategoriaComTarefas[] = []

  for (const cat of categorias) {
    const catBate = normalizar(cat.nome).includes(termo)
    const tarefasFiltradas = cat.tarefas.filter(
      (t) =>
        catBate ||
        normalizar(t.titulo).includes(termo) ||
        (t.nomeGrupo && normalizar(t.nomeGrupo).includes(termo)),
    )

    if (tarefasFiltradas.length > 0) {
      resultado.push({
        ...cat,
        tarefas: tarefasFiltradas,
      })
    }
  }

  return resultado
}

/** Extrai todos os dias locais que contêm sessões medidas com tempo > 0. */
export function listarDiasComTempo(
  sessoes: Pick<TimeSession, 'inicio' | 'fim'>[],
  agoraIso: string = new Date().toISOString(),
): Set<DataLocal> {
  const dias = new Set<DataLocal>()
  for (const sessao of sessoes) {
    const fatias = fatiarSessaoPorDiaLocal(sessao, agoraIso)
    for (const fatia of fatias) {
      if (fatia.duracaoMs > 0) {
        dias.add(fatia.data)
      }
    }
  }
  return dias
}

/** Filtra a lista de tarefas medidas por título, nome do grupo ou nome da categoria. */
export function filtrarTarefasDeTempo(
  tarefas: ResumoTarefaNoTempo[],
  busca: string,
): ResumoTarefaNoTempo[] {
  const termo = normalizar(busca)
  if (!termo) return tarefas
  return tarefas.filter((tarefa) => {
    const campos = [
      tarefa.titulo,
      tarefa.nomeGrupo ?? '',
      tarefa.categoria?.nome ?? 'Sem categoria',
    ]
    return campos.some((campo) => normalizar(campo).includes(termo))
  })
}

/** Soma todo o tempo gasto numa tarefa solta ou item de grupo (em todos os dias da cadeia). */
export function somarTempoDoAlvo(
  sessoes: TimeSession[],
  alvo: { tipo: 'tarefa'; id: string } | { tipo: 'item'; id: string; cadeiaId: string },
  itens: GroupItem[] = [],
  agoraIso: string = new Date().toISOString(),
): number {
  const itemPorId = new Map(itens.map((i) => [i.id, i]))
  return sessoes.reduce((soma, sessao) => {
    if (alvo.tipo === 'tarefa') {
      const pertence = sessao.tarefaId === alvo.id || sessao.cadeiaId === alvo.id
      return pertence ? soma + duracaoDaSessaoMs(sessao, agoraIso) : soma
    }
    const cadeiaDaSessao =
      sessao.cadeiaId ??
      (sessao.itemId ? resolverCadeiaDoItem(sessao.itemId, itemPorId) : sessao.tarefaId)
    const pertence =
      cadeiaDaSessao === alvo.cadeiaId ||
      sessao.itemId === alvo.id ||
      sessao.tarefaId === alvo.cadeiaId
    return pertence ? soma + duracaoDaSessaoMs(sessao, agoraIso) : soma
  }, 0)
}

export interface AvisoSessaoLonga {
  sessaoId: string
  titulo: string
  inicio: string
  duracaoMs: number
  tempoTexto: string
  mensagem: string
}

/**
 * Encontra sessões abertas que estão ligadas há 4h ou mais, ou que começaram num dia local
 * anterior a `agoraIso` (passaram da meia-noite).
 */
export function encontrarSessoesLongas(
  dados: Pick<DadosDeTempo, 'sessoes' | 'tarefas' | 'itens' | 'cards' | 'series' | 'categorias'>,
  agoraIso: string = new Date().toISOString(),
): AvisoSessaoLonga[] {
  const diaHoje = diaLocalDoMomento(agoraIso)
  const resolverAlvo = criarResolvedorDeAlvo(dados)
  const avisos: AvisoSessaoLonga[] = []

  for (const sessao of dados.sessoes) {
    if (sessao.fim !== undefined) continue
    const duracaoMs = duracaoDaSessaoMs(sessao, agoraIso)
    const diaInicio = diaLocalDoMomento(sessao.inicio)
    const passouDaMeiaNoite =
      diaInicio !== undefined && diaHoje !== undefined && diaInicio < diaHoje
    if (duracaoMs < LIMITE_SESSAO_LONGA_MS && !passouDaMeiaNoite) continue

    const alvo = resolverAlvo(sessao)
    const tempoTexto = formatarDuracaoAviso(duracaoMs)
    avisos.push({
      sessaoId: sessao.id,
      titulo: alvo.titulo,
      inicio: sessao.inicio,
      duracaoMs,
      tempoTexto,
      mensagem: `‘${alvo.titulo}’ está em andamento há ${tempoTexto}`,
    })
  }
  return avisos
}

/**
 * Calcula o momento ISO de fim a partir do momento de início da sessão e de um horário `HH:mm`
 * digitado pelo usuário no diálogo "Ajustar…". Se o horário no mesmo dia ficar antes ou igual ao
 * início (ex.: começou às 23:30 e terminou às 00:15), avança para o dia seguinte.
 */
export function calcularFimAjustado(inicioIso: string, horarioHHmm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(horarioHHmm.trim())
  if (!match) throw new ErroDeValidacao('Informe o horário no formato HH:mm.')
  const horas = Number(match[1])
  const minutos = Number(match[2])
  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
    throw new ErroDeValidacao('Horário inválido.')
  }
  const inicio = new Date(inicioIso)
  if (Number.isNaN(inicio.getTime())) throw new ErroDeValidacao('Início da sessão inválido.')
  const candidato = new Date(inicio)
  candidato.setHours(horas, minutos, inicio.getSeconds(), inicio.getMilliseconds())
  if (candidato.getTime() <= inicio.getTime()) {
    candidato.setDate(candidato.getDate() + 1)
  }
  return candidato.toISOString()
}

function escaparCampoCsv(valor: string): string {
  if (/[",\r\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`
  }
  return valor
}

/**
 * Gera o CSV das sessões que tocam o período escolhido:
 * `data,tarefa,grupo,categoria,início,fim,minutos`
 */
export function gerarCsvDeTempo(
  dados: DadosDeTempo,
  periodo: PeriodoDeDados,
  hoje: DataLocal,
  agoraIso: string = new Date().toISOString(),
): string {
  const intervalo = intervaloDoPeriodoDeDados(periodo, hoje)
  const { inicioMs, fimMs } = limitesDoIntervaloLocal(intervalo.inicio, intervalo.fim)
  const resolverAlvo = criarResolvedorDeAlvo(dados)

  const sessoesNoPeriodo = dados.sessoes
    .map((sessao) => ({
      sessao,
      corte: cortarSessaoNoIntervalo(sessao, inicioMs, fimMs, agoraIso),
    }))
    .filter(
      (item): item is { sessao: TimeSession; corte: TrechoDeSessao } =>
        item.corte !== null && item.corte.duracaoMs > 0,
    )
    .sort((a, b) => a.sessao.inicio.localeCompare(b.sessao.inicio))

  const linhas = ['data,tarefa,grupo,categoria,início,fim,minutos']
  for (const { sessao, corte } of sessoesNoPeriodo) {
    const alvo = resolverAlvo(sessao)
    const inicioData = new Date(corte.inicioMs)
    const fimData = new Date(corte.fimMs)
    const data = paraDataLocal(inicioData)
    const inicioHora = format(inicioData, 'HH:mm')
    const fimHora = format(fimData, 'HH:mm')
    const minutos = String(Math.max(1, Math.round(corte.duracaoMs / 60_000)))
    const campos = [
      data,
      alvo.titulo,
      alvo.nomeGrupo ?? '',
      alvo.categoria?.nome ?? 'Sem categoria',
      inicioHora,
      fimHora,
      minutos,
    ]
    linhas.push(campos.map(escaparCampoCsv).join(','))
  }
  return linhas.join('\n')
}

/* ============================================================================
 * Gravação no banco (Dexie) — chamada nos mesmos pontos que ligam/desligam
 * `emAndamento` para nenhum caminho ficar de fora.
 * ========================================================================== */

/** Abre uma sessão para cada tarefa solta e item de grupo que acabou de entrar em andamento. */
export async function abrirSessoesParaAlvos(
  tarefas: Task[],
  itens: GroupItem[],
  momento: string,
): Promise<TimeSession[]> {
  if (tarefas.length === 0 && itens.length === 0) return []
  const idsCards = [...new Set(itens.map((i) => i.cardId))]
  const cards = idsCards.length > 0 ? await db.groupCards.bulkGet(idsCards) : []
  const cardPorId = new Map(
    cards.filter((c): c is GroupCard => c !== undefined).map((c) => [c.id, c]),
  )
  const idsSeries = [...new Set([...cardPorId.values()].map((c) => c.seriesId))]
  const series = idsSeries.length > 0 ? await db.groupSeries.bulkGet(idsSeries) : []
  const seriePorId = new Map(
    series.filter((s): s is GroupSeries => s !== undefined).map((s) => [s.id, s]),
  )

  const novas: TimeSession[] = [
    ...tarefas.map((tarefa): TimeSession => ({
      id: crypto.randomUUID(),
      tarefaId: tarefa.id,
      ...(tarefa.categoryId ? { categoryId: tarefa.categoryId } : {}),
      inicio: tarefa.emAndamentoDesde ?? momento,
      criadoEm: momento,
      atualizadoEm: momento,
    })),
    ...itens.map((item): TimeSession => {
      const card = cardPorId.get(item.cardId)
      const serie = card ? seriePorId.get(card.seriesId) : undefined
      return {
        id: crypto.randomUUID(),
        itemId: item.id,
        cadeiaId: item.cadeiaId,
        ...(card ? { grupoId: card.seriesId } : {}),
        ...(serie?.categoryId ? { categoryId: serie.categoryId } : {}),
        inicio: item.emAndamentoDesde ?? momento,
        criadoEm: momento,
        atualizadoEm: momento,
      }
    }),
  ]

  await db.sessions.bulkAdd(novas)
  return novas
}

/**
 * Fecha todas as sessões abertas (`fim === undefined`) pertencentes às tarefas ou itens passados.
 * Devolve o estado das sessões ANTES de fechar (para o Desfazer poder reabri-las).
 */
export async function fecharSessoesAbertasDe(
  alvos: { tarefas?: string[]; itens?: string[]; cadeias?: string[] },
  momento: string,
): Promise<TimeSession[]> {
  const setTarefas = new Set(alvos.tarefas ?? [])
  const setItens = new Set(alvos.itens ?? [])
  const setCadeias = new Set(alvos.cadeias ?? [])
  if (setTarefas.size === 0 && setItens.size === 0 && setCadeias.size === 0) return []

  const abertas = await db.sessions
    .filter(
      (s) =>
        s.fim === undefined &&
        ((s.tarefaId !== undefined && setTarefas.has(s.tarefaId)) ||
          (s.itemId !== undefined && setItens.has(s.itemId)) ||
          (s.cadeiaId !== undefined && setCadeias.has(s.cadeiaId))),
    )
    .toArray()

  if (abertas.length === 0) return []
  await db.sessions.bulkPut(
    abertas.map((sessao) => ({
      ...sessao,
      fim: momento,
      atualizadoEm: momento,
    })),
  )
  return abertas
}

/**
 * Reverte a abertura ou o fechamento de sessões ao acionar "Desfazer":
 * apaga as sessões que tinham sido criadas e reabre (ou regrava) as que tinham sido fechadas.
 */
export async function restaurarSessoes(opcoes: {
  criadas?: string[]
  fechadas?: TimeSession[]
}): Promise<void> {
  if (opcoes.criadas && opcoes.criadas.length > 0) {
    await db.sessions.bulkDelete(opcoes.criadas)
  }
  if (opcoes.fechadas && opcoes.fechadas.length > 0) {
    await db.sessions.bulkPut(opcoes.fechadas)
  }
}

/** Apaga todas as sessões de uma tarefa solta excluída definitivamente. */
export async function excluirSessoesDaTarefa(tarefaId: string): Promise<void> {
  const ids = await db.sessions
    .filter((s) => s.tarefaId === tarefaId || s.cadeiaId === tarefaId)
    .primaryKeys()
  if (ids.length > 0) await db.sessions.bulkDelete(ids)
}

/**
 * Ao excluir itens de grupo (um item ou um card inteiro): se não sobrou nenhum exemplar da
 * `cadeiaId` no banco, apaga todas as sessões daquela cadeia; se ainda há exemplares em outros
 * dias, apenas fecha eventual sessão aberta do item apagado.
 */
export async function excluirOuFecharSessoesDosItens(
  itensRemovidos: GroupItem[],
  momento: string,
): Promise<void> {
  if (itensRemovidos.length === 0) return
  await fecharSessoesAbertasDe({ itens: itensRemovidos.map((i) => i.id) }, momento)
  const cadeias = [...new Set(itensRemovidos.map((i) => i.cadeiaId))]
  const restantes = await db.groupItems.where('cadeiaId').anyOf(cadeias).toArray()
  const cadeiasVivas = new Set(restantes.map((i) => i.cadeiaId))
  const cadeiasMortas = new Set(cadeias.filter((c) => !cadeiasVivas.has(c)))
  if (cadeiasMortas.size === 0) return

  const idsSessoes = await db.sessions
    .filter(
      (s) =>
        (s.cadeiaId !== undefined && cadeiasMortas.has(s.cadeiaId)) ||
        (s.itemId !== undefined && cadeiasMortas.has(s.itemId)),
    )
    .primaryKeys()
  if (idsSessoes.length > 0) await db.sessions.bulkDelete(idsSessoes)
}

/** Quando uma tarefa solta entra num grupo no mesmo dia (`colocarNoGrupo`), leva as sessões. */
export async function converterSessoesParaItem(
  tarefaId: string,
  card: GroupCard,
  serie: GroupSeries | undefined,
  momento: string,
): Promise<void> {
  const sessoes = await db.sessions.where('tarefaId').equals(tarefaId).toArray()
  if (sessoes.length === 0) return
  await db.sessions.bulkPut(
    sessoes.map(({ tarefaId: _t, ...resto }) => ({
      ...resto,
      itemId: tarefaId,
      cadeiaId: tarefaId,
      grupoId: card.seriesId,
      categoryId: serie?.categoryId,
      atualizadoEm: momento,
    })),
  )
}

/** Quando um item sai do grupo e vira tarefa solta (`tirarDoGrupo`), leva as sessões da cadeia. */
export async function converterSessoesParaTarefa(item: GroupItem, momento: string): Promise<void> {
  const sessoes = await db.sessions
    .filter((s) => s.cadeiaId === item.cadeiaId || s.itemId === item.id)
    .toArray()
  if (sessoes.length === 0) return
  await db.sessions.bulkPut(
    sessoes.map(({ itemId: _i, cadeiaId: _c, grupoId: _g, ...resto }) => ({
      ...resto,
      tarefaId: item.id,
      atualizadoEm: momento,
    })),
  )
}

/** Quando o item muda de grupo no mesmo dia (`passarItemParaCard`), atualiza o grupo/categoria. */
export async function atualizarGrupoDasSessoesDoItem(
  item: GroupItem,
  card: GroupCard,
  serie: GroupSeries | undefined,
  momento: string,
): Promise<void> {
  const sessoes = await db.sessions
    .filter((s) => s.cadeiaId === item.cadeiaId || s.itemId === item.id)
    .toArray()
  if (sessoes.length === 0) return
  await db.sessions.bulkPut(
    sessoes.map((s) => ({
      ...s,
      grupoId: card.seriesId,
      categoryId: serie?.categoryId,
      atualizadoEm: momento,
    })),
  )
}

/** Mantém `categoryId` das sessões sincronizado quando a categoria da tarefa muda. */
export async function atualizarCategoriaDasSessoesDaTarefa(
  tarefaId: string,
  categoryId: string | undefined,
  momento: string,
): Promise<void> {
  await db.sessions.where('tarefaId').equals(tarefaId).modify({ categoryId, atualizadoEm: momento })
}

/** Mantém `categoryId` das sessões sincronizado quando a categoria do grupo muda. */
export async function atualizarCategoriaDasSessoesDoGrupo(
  grupoId: string,
  categoryId: string | undefined,
  momento: string,
): Promise<void> {
  await db.sessions.where('grupoId').equals(grupoId).modify({ categoryId, atualizadoEm: momento })
}

/** Quando uma categoria é excluída ou muda de tipo, as sessões dela ficam "Sem categoria". */
export async function limparCategoriaDasSessoes(
  categoryId: string,
  momento: string,
): Promise<void> {
  await db.sessions
    .where('categoryId')
    .equals(categoryId)
    .modify({ categoryId: undefined, atualizadoEm: momento })
}

/**
 * Edita o início e/ou fim de uma sessão existente.
 * Se a sessão estava aberta e recebeu um `fim`, também desliga `emAndamento` na tarefa/item.
 */
export async function editarSessao(
  id: string,
  mudancas: { inicio: string; fim?: string },
): Promise<void> {
  const inicioMs = new Date(mudancas.inicio).getTime()
  if (Number.isNaN(inicioMs)) throw new ErroDeValidacao('Horário de início inválido.')
  if (mudancas.fim !== undefined) {
    const fimMs = new Date(mudancas.fim).getTime()
    if (Number.isNaN(fimMs)) throw new ErroDeValidacao('Horário de fim inválido.')
    if (fimMs <= inicioMs) {
      throw new ErroDeValidacao('O horário de fim deve ser depois do início.')
    }
  }

  await db.transaction('rw', [db.sessions, db.tasks, db.groupItems], async () => {
    const atual = await db.sessions.get(id)
    if (!atual) return
    const momento = agora()
    const estavaAberta = atual.fim === undefined
    const continuaAberta = mudancas.fim === undefined

    await db.sessions.put({
      ...atual,
      inicio: mudancas.inicio,
      ...(mudancas.fim !== undefined ? { fim: mudancas.fim } : {}),
      atualizadoEm: momento,
    })

    if (estavaAberta && !continuaAberta) {
      if (atual.tarefaId) {
        await db.tasks.update(atual.tarefaId, { ...SEM_ANDAMENTO, atualizadoEm: momento })
      }
      if (atual.itemId) {
        await db.groupItems.update(atual.itemId, { ...SEM_ANDAMENTO, atualizadoEm: momento })
      }
    } else if (estavaAberta && continuaAberta && mudancas.inicio !== atual.inicio) {
      if (atual.tarefaId) {
        await db.tasks.update(atual.tarefaId, {
          emAndamentoDesde: mudancas.inicio,
          atualizadoEm: momento,
        })
      }
      if (atual.itemId) {
        await db.groupItems.update(atual.itemId, {
          emAndamentoDesde: mudancas.inicio,
          atualizadoEm: momento,
        })
      }
    }
  })
}

/** Atalho do aviso de sessão longa: define o horário de fim da sessão e para o andamento. */
export async function ajustarFimDaSessao(id: string, fimIso: string): Promise<void> {
  const sessao = await db.sessions.get(id)
  if (!sessao) return
  await editarSessao(id, { inicio: sessao.inicio, fim: fimIso })
}

/** Exclui uma sessão individual. Se ela estava aberta, também desliga `emAndamento` do alvo. */
export async function excluirSessao(id: string): Promise<void> {
  await db.transaction('rw', [db.sessions, db.tasks, db.groupItems], async () => {
    const sessao = await db.sessions.get(id)
    if (!sessao) return
    const momento = agora()
    await db.sessions.delete(id)
    if (sessao.fim === undefined) {
      if (sessao.tarefaId) {
        await db.tasks.update(sessao.tarefaId, { ...SEM_ANDAMENTO, atualizadoEm: momento })
      }
      if (sessao.itemId) {
        await db.groupItems.update(sessao.itemId, { ...SEM_ANDAMENTO, atualizadoEm: momento })
      }
    }
  })
}

/** Carrega todas as tabelas necessárias para montar o relatório de tempo. */
export async function carregarDadosDeTempo(): Promise<DadosDeTempo> {
  const [sessoes, tarefas, itens, cards, series, categorias] = await Promise.all([
    db.sessions.toArray(),
    db.tasks.toArray(),
    db.groupItems.toArray(),
    db.groupCards.toArray(),
    db.groupSeries.toArray(),
    db.categories.toArray(),
  ])
  return { sessoes, tarefas, itens, cards, series, categorias }
}
