import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  Category,
  DataLocal,
  GroupCard,
  GroupItem,
  GroupSeries,
  Note,
  Procedure,
  Subtask,
  Task,
} from '@/db/types'
import { deDataLocal, diasEntre } from '@/lib/datas'
import { diaDoMomento } from '@/lib/estatisticas'
import {
  donoDaNota,
  indexarVinculos,
  previaDaNota,
  textoDoVinculo,
  tituloDaNota,
  type DadosDosVinculos,
} from '@/lib/notas'
import { normalizar } from '@/lib/procedimentos'

/*
 * Regras da tela Arquivados, sem banco: monta a lista de tudo o que foi arquivado (tarefa solta,
 * grupo, nota, procedimento), filtra, busca, conta e agrupa por período. A gravação (arquivar,
 * desarquivar, excluir) fica em `arquivo-repository`.
 */

export type TipoArquivado = 'tarefa' | 'grupo' | 'nota' | 'procedimento'

/** Ordem dos blocos em "Todos". */
export const TIPOS_ARQUIVADOS: TipoArquivado[] = ['tarefa', 'grupo', 'nota', 'procedimento']

export const NOMES_DOS_TIPOS: Record<TipoArquivado, { singular: string; plural: string }> = {
  tarefa: { singular: 'Tarefa', plural: 'Tarefas' },
  grupo: { singular: 'Grupo de tarefas', plural: 'Grupos de tarefas' },
  nota: { singular: 'Nota', plural: 'Notas' },
  procedimento: { singular: 'Procedimento', plural: 'Procedimentos' },
}

/** Rótulo curto do filtro segmentado. */
export const ROTULOS_DO_FILTRO: Record<TipoArquivado | 'todos', string> = {
  todos: 'Todos',
  tarefa: 'Tarefas',
  grupo: 'Grupos',
  nota: 'Notas',
  procedimento: 'Procedimentos',
}

export type FiltroDeTipo = TipoArquivado | 'todos'

export function isFiltroDeTipo(valor: string | null): valor is FiltroDeTipo {
  return valor === 'todos' || TIPOS_ARQUIVADOS.includes(valor as TipoArquivado)
}

/**
 * Um arquivado na lista. `grupo` é um card inteiro (`variante` `card`) ou os itens que foram
 * arquivados sozinhos num card que continua no calendário (`variante` `itens`).
 */
export interface ItemArquivado {
  /** Chave única da linha (tipo, variante e id). */
  chave: string
  tipo: TipoArquivado
  variante: 'card' | 'itens' | 'unico'
  /** Tarefa, card, nota ou procedimento; na variante `itens`, o card dos itens. */
  id: string
  titulo: string
  /** Texto apagado sob o título (data, progresso, vínculo, categoria…). */
  detalhe: string
  arquivadoEm: string
  categoryId?: string
  /** Cor da categoria; sem categoria = neutra. */
  cor?: string
  categoriaNome?: string
  /** Dia que a tarefa ou o card tinha (base do "Voltar para…"). */
  data?: DataLocal
  /** Itens arquivados sozinhos (variante `itens`). */
  idsItens?: string[]
  /** Texto usado só pela busca. */
  corpo: string
  /** Conteúdo para abrir só para ler (subtarefas, itens, texto da nota, etapas). */
  leitura: string
}

/** Ids a arquivar, desarquivar ou excluir, por tabela. */
export interface Alvos {
  tarefas?: string[]
  cards?: string[]
  itens?: string[]
  notas?: string[]
  procedimentos?: string[]
}

/** Os ids das linhas da tela, separados por tabela (a variante `itens` aponta para itens). */
export function alvosDosItens(itens: ItemArquivado[]): Alvos {
  return {
    tarefas: itens.filter((item) => item.tipo === 'tarefa').map((item) => item.id),
    cards: itens
      .filter((item) => item.tipo === 'grupo' && item.variante === 'card')
      .map((item) => item.id),
    itens: itens.flatMap((item) => item.idsItens ?? []),
    notas: itens.filter((item) => item.tipo === 'nota').map((item) => item.id),
    procedimentos: itens.filter((item) => item.tipo === 'procedimento').map((item) => item.id),
  }
}

/** Registros arquivados e o que é preciso para descrevê-los. */
export interface DadosDoArquivo {
  tarefas: Task[]
  subtarefas: Subtask[]
  series: GroupSeries[]
  /** Cards arquivados e os cards ativos que têm itens arquivados. */
  cards: GroupCard[]
  /** Todos os itens desses cards. */
  itens: GroupItem[]
  notas: Note[]
  procedimentos: Procedure[]
  /** Quem são os donos das notas arquivadas. */
  vinculos: DadosDosVinculos
  categorias: Category[]
  nomesAnexosPorNota?: Map<string, string[]>
}

function textoDoDia(data: DataLocal) {
  return format(deDataLocal(data), 'dd/MM')
}

function plural(quantidade: number, singular: string, pluralDe: string) {
  return `${quantidade} ${quantidade === 1 ? singular : pluralDe}`
}

/** Cor e nome da categoria de um alvo. */
function categoriaDe(categorias: Map<string, Category>, alvo: { categoryId?: string }) {
  const categoria = alvo.categoryId ? categorias.get(alvo.categoryId) : undefined
  if (!categoria) return {}
  return {
    categoryId: categoria.id,
    categoriaNome: categoria.nome,
    cor: categoria.cor,
  }
}

function marcaDoItem(item: GroupItem) {
  if (item.status === 'concluido') return '✓'
  return item.status === 'pendente' ? '○' : '–'
}

/** Itens que contam no progresso do card (os transferidos são só registro). */
function itensDoProgresso(itens: GroupItem[]) {
  return itens.filter((item) => item.status !== 'transferido')
}

/** Todos os arquivados prontos para a tela, sem ordem definida. */
export function montarArquivados(dados: DadosDoArquivo, hoje: DataLocal): ItemArquivado[] {
  const categorias = new Map(dados.categorias.map((categoria) => [categoria.id, categoria]))
  const series = new Map(dados.series.map((serie) => [serie.id, serie]))
  const indice = indexarVinculos(dados.vinculos, hoje)

  const subtarefasPorTarefa = new Map<string, Subtask[]>()
  for (const subtarefa of dados.subtarefas) {
    subtarefasPorTarefa.set(subtarefa.taskId, [
      ...(subtarefasPorTarefa.get(subtarefa.taskId) ?? []),
      subtarefa,
    ])
  }
  const itensPorCard = new Map<string, GroupItem[]>()
  for (const item of dados.itens) {
    itensPorCard.set(item.cardId, [...(itensPorCard.get(item.cardId) ?? []), item])
  }

  const resultado: ItemArquivado[] = []

  for (const tarefa of dados.tarefas) {
    if (tarefa.status !== 'arquivada') continue
    const subtarefas = subtarefasPorTarefa.get(tarefa.id) ?? []
    const feitas = subtarefas.filter((subtarefa) => subtarefa.concluida).length
    const partes = [`era de ${textoDoDia(tarefa.data)}`]
    if (subtarefas.length > 0) partes.push(`${feitas} de ${subtarefas.length} subtarefas`)
    const categoria = categoriaDe(categorias, tarefa)
    resultado.push({
      chave: `tarefa:${tarefa.id}`,
      tipo: 'tarefa',
      variante: 'unico',
      id: tarefa.id,
      titulo: tarefa.titulo,
      detalhe: partes.join(' · '),
      arquivadoEm: tarefa.arquivadoEm ?? tarefa.atualizadoEm,
      data: tarefa.data,
      ...categoria,
      corpo: [tarefa.titulo, ...subtarefas.map((subtarefa) => subtarefa.titulo)].join('\n'),
      leitura: subtarefas
        .map((subtarefa) => `${subtarefa.concluida ? '✓' : '○'} ${subtarefa.titulo}`)
        .join('\n'),
    })
  }

  for (const card of dados.cards) {
    const serie = series.get(card.seriesId)
    if (!serie) continue
    const itens = itensPorCard.get(card.id) ?? []
    const categoria = categoriaDe(categorias, serie)
    if (card.arquivado) {
      const contados = itensDoProgresso(itens)
      const feitos = contados.filter((item) => item.status === 'concluido').length
      const partes = [`era de ${textoDoDia(card.data)}`]
      if (contados.length > 0) partes.push(`${feitos} de ${contados.length} itens`)
      resultado.push({
        chave: `grupo:card:${card.id}`,
        tipo: 'grupo',
        variante: 'card',
        id: card.id,
        titulo: serie.titulo,
        detalhe: partes.join(' · '),
        arquivadoEm: card.arquivadoEm ?? card.atualizadoEm,
        data: card.data,
        ...categoria,
        corpo: [serie.titulo, ...itens.map((item) => item.titulo)].join('\n'),
        leitura: itens.map((item) => `${marcaDoItem(item)} ${item.titulo}`).join('\n'),
      })
      continue
    }
    const sozinhos = itens.filter((item) => item.status === 'arquivado')
    if (sozinhos.length === 0) continue
    resultado.push({
      chave: `grupo:itens:${card.id}`,
      tipo: 'grupo',
      variante: 'itens',
      id: card.id,
      titulo: serie.titulo,
      detalhe: `${plural(sozinhos.length, 'item arquivado', 'itens arquivados')} do dia ${textoDoDia(card.data)}`,
      arquivadoEm: sozinhos
        .map((item) => item.arquivadoEm ?? item.atualizadoEm)
        .reduce((a, b) => (a > b ? a : b)),
      data: card.data,
      idsItens: sozinhos.map((item) => item.id),
      ...categoria,
      corpo: [serie.titulo, ...sozinhos.map((item) => item.titulo)].join('\n'),
      leitura: sozinhos.map((item) => `${marcaDoItem(item)} ${item.titulo}`).join('\n'),
    })
  }

  for (const nota of dados.notas) {
    if (!nota.arquivado) continue
    const dono = donoDaNota(nota.vinculo, indice)
    const previa =
      previaDaNota(nota)
        .split('\n')
        .find((linha) => linha.trim())
        ?.trim() ?? ''
    const vinculo = textoDoVinculo(dono)
    const nomesAnexos = dados.nomesAnexosPorNota?.get(nota.id) ?? []
    resultado.push({
      chave: `nota:${nota.id}`,
      tipo: 'nota',
      variante: 'unico',
      id: nota.id,
      titulo: tituloDaNota(nota),
      detalhe: previa ? `${vinculo} · ${previa}` : vinculo,
      arquivadoEm: nota.arquivadoEm ?? nota.atualizadoEm,
      categoryId: dono.categoria?.id,
      categoriaNome: dono.categoria?.nome,
      cor: dono.cor,
      corpo: [nota.titulo, nota.conteudo, vinculo, ...nomesAnexos].join('\n'),
      leitura: nota.conteudo,
    })
  }

  for (const procedimento of dados.procedimentos) {
    if (!procedimento.arquivado) continue
    const categoria = categoriaDe(categorias, procedimento)
    const etapas = plural(procedimento.etapas.length, 'etapa', 'etapas')
    resultado.push({
      chave: `procedimento:${procedimento.id}`,
      tipo: 'procedimento',
      variante: 'unico',
      id: procedimento.id,
      titulo: procedimento.titulo,
      detalhe: `${categoria.categoriaNome ?? 'Sem categoria'} · ${etapas}`,
      arquivadoEm: procedimento.arquivadoEm ?? procedimento.atualizadoEm,
      ...categoria,
      corpo: [procedimento.titulo, ...procedimento.etapas.map((etapa) => etapa.texto)].join('\n'),
      leitura: [...procedimento.etapas]
        .sort((a, b) => a.ordem - b.ordem)
        .map((etapa, indice) => `${indice + 1}. ${etapa.texto}`)
        .join('\n'),
    })
  }

  return resultado
}

/** Do mais recente para o mais antigo arquivado. */
export function ordenarPorArquivamento(itens: ItemArquivado[]) {
  return [...itens].sort(
    (a, b) =>
      b.arquivadoEm.localeCompare(a.arquivadoEm) || a.titulo.localeCompare(b.titulo, 'pt-BR'),
  )
}

/** Quantos itens há de cada tipo, e no total. */
export function contarPorTipo(itens: Pick<ItemArquivado, 'tipo'>[]): Record<FiltroDeTipo, number> {
  const contagem: Record<FiltroDeTipo, number> = {
    todos: itens.length,
    tarefa: 0,
    grupo: 0,
    nota: 0,
    procedimento: 0,
  }
  for (const item of itens) contagem[item.tipo] += 1
  return contagem
}

/** Busca por título, texto e nome da categoria (sem diferenciar acento e maiúscula). */
export function buscarArquivados(itens: ItemArquivado[], termo: string) {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return itens
  return itens.filter((item) => {
    const texto = normalizar([item.titulo, item.corpo, item.categoriaNome ?? ''].join('\n'))
    return palavras.every((palavra) => texto.includes(palavra))
  })
}

export function filtrarPorTipo(itens: ItemArquivado[], filtro: FiltroDeTipo) {
  return filtro === 'todos' ? itens : itens.filter((item) => item.tipo === filtro)
}

export type PeriodoDeArquivamento = 'semana' | 'mes' | 'antigos'

export const ROTULOS_DOS_PERIODOS: Record<PeriodoDeArquivamento, string> = {
  semana: 'Esta semana',
  mes: 'Este mês',
  antigos: 'Mais antigos',
}

/** Até 6 dias atrás = esta semana; até 29 = este mês; o resto, mais antigos. */
export function periodoDe(arquivadoEm: string, hoje: DataLocal): PeriodoDeArquivamento {
  const dias = diasEntre(diaDoMomento(arquivadoEm), hoje)
  if (dias < 7) return 'semana'
  if (dias < 30) return 'mes'
  return 'antigos'
}

export interface GrupoDePeriodo {
  periodo: PeriodoDeArquivamento
  rotulo: string
  itens: ItemArquivado[]
}

/** Itens do mais recente ao mais antigo, repartidos em períodos (sem os vazios). */
export function agruparPorPeriodo(itens: ItemArquivado[], hoje: DataLocal): GrupoDePeriodo[] {
  const porPeriodo = new Map<PeriodoDeArquivamento, ItemArquivado[]>()
  for (const item of ordenarPorArquivamento(itens)) {
    const periodo = periodoDe(item.arquivadoEm, hoje)
    porPeriodo.set(periodo, [...(porPeriodo.get(periodo) ?? []), item])
  }
  return (['semana', 'mes', 'antigos'] as const).flatMap((periodo) => {
    const doPeriodo = porPeriodo.get(periodo)
    return doPeriodo ? [{ periodo, rotulo: ROTULOS_DOS_PERIODOS[periodo], itens: doPeriodo }] : []
  })
}

/** "arquivado há 3 dias". */
export function rotuloDoArquivamento(arquivadoEm: string) {
  return `arquivado ${formatDistanceToNow(parseISO(arquivadoEm), { addSuffix: true, locale: ptBR })}`
}

/** Tarefa e card de grupo perguntam para que dia voltam; o resto volta direto. */
export function precisaDeDia(item: Pick<ItemArquivado, 'data' | 'variante'>) {
  return item.data !== undefined && item.variante !== 'itens'
}

/** Para onde a tarefa ou o grupo volta por padrão: o dia que tinha, ou hoje se já passou. */
export function destinoPadraoDoDesarquivar(data: DataLocal, hoje: DataLocal) {
  return data >= hoje ? data : hoje
}

/** Frase do aviso depois de arquivar ou desarquivar. */
export function textoDoAviso(
  acao: 'arquivado' | 'desarquivado',
  itens: Pick<ItemArquivado, 'tipo'>[],
) {
  if (itens.length !== 1) return `${itens.length} itens ${acao}s`
  const nome = NOMES_DOS_TIPOS[itens[0]!.tipo].singular
  const feminino = itens[0]!.tipo === 'tarefa' || itens[0]!.tipo === 'nota'
  const final =
    acao === 'arquivado'
      ? feminino
        ? 'arquivada'
        : 'arquivado'
      : feminino
        ? 'desarquivada'
        : 'desarquivado'
  return `${nome} ${final}`
}
