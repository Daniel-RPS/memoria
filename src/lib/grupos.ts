import { format } from 'date-fns'
import type { Category, DataLocal, GroupCard, GroupItem, GroupSeries, Task } from '@/db/types'
import { sortForDisplay } from '@/domain/ordem-de-exibicao'
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

/**
 * Pendentes no alto, em ordem de exibição (prioridade e em andamento sobem, ver
 * `sortForDisplay`); feitos e transferidos ficam embaixo, na posição que tinham.
 */
export function ordenarItens(itens: GroupItem[]) {
  const visiveis = itens.filter((item) => item.status !== 'arquivado')
  return [
    ...sortForDisplay(visiveis.filter((item) => item.status === 'pendente')),
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

/**
 * Junta tarefas soltas e cards numa lista só, pela `ordem` do dia, e põe no alto as tarefas
 * soltas com prioridade ou em andamento (`sortForDisplay`); os cards ficam entre os demais.
 */
export function intercalarNoDia(tarefas: Task[], grupos: GrupoDoDia[]): EntradaDoDia[] {
  const pelaOrdem = [
    ...tarefas.map((tarefa) => ({ tipo: 'tarefa' as const, tarefa })),
    ...grupos.map((grupo) => ({ tipo: 'grupo' as const, grupo })),
  ].sort((a, b) => ordemDaEntrada(a) - ordemDaEntrada(b))
  return sortForDisplay(pelaOrdem, (entrada) =>
    entrada.tipo === 'tarefa' ? entrada.tarefa : { ordem: ordemDaEntrada(entrada) },
  )
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

/** Uma série no seletor de grupo da captura: quando foi usada por último e se tem card no dia. */
export interface SerieParaEscolher {
  serie: GroupSeries
  ultimoUso: string
  /** Card visível da série no dia escolhido (os itens entram nele). */
  temCardNoDia: boolean
}

/**
 * Séries da mais usada recentemente (card ou item mexido por último) para a menos; empate
 * pelo nome. Marca se a série já tem card visível em `data`.
 */
export function ordenarParaEscolher(
  series: GroupSeries[],
  cards: Pick<GroupCard, 'id' | 'seriesId' | 'data' | 'arquivado' | 'atualizadoEm'>[],
  itens: Pick<GroupItem, 'cardId' | 'atualizadoEm'>[],
  data: DataLocal,
): SerieParaEscolher[] {
  const serieDoCard = new Map(cards.map((card) => [card.id, card.seriesId]))
  const ultimoUso = new Map(series.map((serie) => [serie.id, serie.atualizadoEm]))
  const usar = (seriesId: string | undefined, momento: string) => {
    if (seriesId && momento > (ultimoUso.get(seriesId) ?? '')) ultimoUso.set(seriesId, momento)
  }
  for (const card of cards) usar(card.seriesId, card.atualizadoEm)
  for (const item of itens) usar(serieDoCard.get(item.cardId), item.atualizadoEm)
  const comCardNoDia = new Set(
    cards.filter((card) => card.data === data && !card.arquivado).map((card) => card.seriesId),
  )
  return series
    .map((serie) => ({
      serie,
      ultimoUso: ultimoUso.get(serie.id) ?? '',
      temCardNoDia: comCardNoDia.has(serie.id),
    }))
    .sort(
      (a, b) =>
        b.ultimoUso.localeCompare(a.ultimoUso) || a.serie.titulo.localeCompare(b.serie.titulo),
    )
}

/** Busca pelo nome da série, sem diferenciar acento e maiúscula. */
export function filtrarSeries(lista: SerieParaEscolher[], termo: string) {
  const busca = normalizar(termo)
  if (!busca) return lista
  return lista.filter(({ serie }) => normalizar(serie.titulo).includes(busca))
}

/**
 * Preenche `cadeiaId` de quem não tem: o id do ancestral mais antigo que ainda existe na
 * cadeia `origemItemId` (o próprio id quando não há). Quem já tem fica como está.
 * Usada na migração do banco (v10) e ao ler backup antigo.
 */
export function preencherCadeias<T extends Pick<GroupItem, 'id' | 'origemItemId'>>(
  itens: (T & { cadeiaId?: string })[],
): (T & { cadeiaId: string })[] {
  const porId = new Map(itens.map((item) => [item.id, item]))
  const cadeiaDe = (item: T & { cadeiaId?: string }): string => {
    const vistos = new Set<string>()
    let atual = item
    while (!atual.cadeiaId && atual.origemItemId && !vistos.has(atual.id)) {
      vistos.add(atual.id)
      const pai = porId.get(atual.origemItemId)
      if (!pai) break
      atual = pai
    }
    return atual.cadeiaId ?? atual.id
  }
  return itens.map((item) => ({ ...item, cadeiaId: item.cadeiaId ?? cadeiaDe(item) }))
}

/** Um grupo (série) na aba Grupos, com as contagens dos cards que estão no calendário. */
export interface GrupoNaLista {
  serie: GroupSeries
  pendentes: number
  feitos: number
  /** Quantos dias têm card do grupo (não arquivado). */
  dias: number
  /** Dia que a linha abre: hoje, senão o próximo com card, senão o mais recente. */
  destino: DataLocal
}

/** Um bloco da aba Grupos: uma categoria (ou "Sem categoria", `categoria` nula). */
export interface BlocoDeGrupos {
  categoria: Category | null
  grupos: GrupoNaLista[]
}

export interface ListaDeGrupos {
  /** Total de grupos, sem a busca (o mesmo número da barra lateral). */
  total: number
  /** Só os blocos com grupos (com a busca, só os que têm resultado). */
  blocos: BlocoDeGrupos[]
}

export interface DadosDaListaDeGrupos {
  series: GroupSeries[]
  cards: Pick<GroupCard, 'id' | 'seriesId' | 'data' | 'arquivado'>[]
  itens: Pick<GroupItem, 'cardId' | 'status'>[]
  /** Categorias de grupo na ordem definida pelo usuário (`montarCategorias`). */
  categorias: Category[]
}

/** Hoje, se há card hoje; senão o próximo dia com card; senão o mais recente. */
export function diaDeDestinoDoGrupo(datas: DataLocal[], hoje: DataLocal): DataLocal | undefined {
  if (datas.includes(hoje)) return hoje
  const futuras = datas.filter((data) => data > hoje).sort()
  if (futuras.length > 0) return futuras[0]
  return [...datas].sort().at(-1)
}

const porTituloDaSerie = (a: GrupoNaLista, b: GrupoNaLista) =>
  a.serie.titulo.localeCompare(b.serie.titulo, 'pt-BR', { sensitivity: 'base' })

/** Séries com pelo menos um card no calendário (não arquivado), com contagens e destino. */
function gruposAtivos(
  { series, cards, itens }: Omit<DadosDaListaDeGrupos, 'categorias'>,
  hoje: DataLocal,
): GrupoNaLista[] {
  const cardsAtivos = cards.filter((card) => !card.arquivado)
  const serieDoCard = new Map(cardsAtivos.map((card) => [card.id, card.seriesId]))
  const datasDaSerie = new Map<string, DataLocal[]>()
  for (const card of cardsAtivos) {
    const datas = datasDaSerie.get(card.seriesId) ?? []
    if (!datas.includes(card.data)) datas.push(card.data)
    datasDaSerie.set(card.seriesId, datas)
  }
  const contagem = new Map<string, { pendentes: number; feitos: number }>()
  for (const item of itens) {
    const seriesId = serieDoCard.get(item.cardId)
    if (!seriesId || (item.status !== 'pendente' && item.status !== 'concluido')) continue
    const atual = contagem.get(seriesId) ?? { pendentes: 0, feitos: 0 }
    if (item.status === 'pendente') atual.pendentes++
    else atual.feitos++
    contagem.set(seriesId, atual)
  }
  return series.flatMap((serie) => {
    const datas = datasDaSerie.get(serie.id)
    const destino = datas && diaDeDestinoDoGrupo(datas, hoje)
    if (!datas || !destino) return []
    const { pendentes, feitos } = contagem.get(serie.id) ?? { pendentes: 0, feitos: 0 }
    return [{ serie, pendentes, feitos, dias: datas.length, destino }]
  })
}

/** Quantos grupos existem no app (séries com algum card fora de Arquivados). */
export function contarGrupos(dados: Omit<DadosDaListaDeGrupos, 'categorias'>, hoje: DataLocal) {
  return gruposAtivos(dados, hoje).length
}

/**
 * A aba Grupos: um bloco por categoria, na ordem das categorias, e "Sem categoria" por último
 * (só se tiver grupos); dentro do bloco, ordem alfabética. A busca olha o nome do grupo e o da
 * categoria, sem diferenciar acento e maiúscula.
 */
export function montarListaDeGrupos(
  dados: DadosDaListaDeGrupos,
  hoje: DataLocal,
  termo = '',
): ListaDeGrupos {
  const grupos = gruposAtivos(dados, hoje)
  const busca = normalizar(termo)
  const idsDasCategorias = new Set(dados.categorias.map((categoria) => categoria.id))
  const encontra = (grupo: GrupoNaLista, categoria: Category | null) =>
    !busca ||
    normalizar(grupo.serie.titulo).includes(busca) ||
    (categoria !== null && normalizar(categoria.nome).includes(busca))
  const blocoDe = (categoria: Category | null, doBloco: GrupoNaLista[]): BlocoDeGrupos => ({
    categoria,
    grupos: doBloco.filter((grupo) => encontra(grupo, categoria)).sort(porTituloDaSerie),
  })
  const blocos = [
    ...dados.categorias.map((categoria) =>
      blocoDe(
        categoria,
        grupos.filter((grupo) => grupo.serie.categoryId === categoria.id),
      ),
    ),
    blocoDe(
      null,
      grupos.filter(
        (grupo) => !grupo.serie.categoryId || !idsDasCategorias.has(grupo.serie.categoryId),
      ),
    ),
  ]
  return { total: grupos.length, blocos: blocos.filter((bloco) => bloco.grupos.length > 0) }
}

/** "1 grupo", "12 grupos". */
export function textoTotalDeGrupos(total: number) {
  return `${total} ${total === 1 ? 'grupo' : 'grupos'}`
}

/** "3 pendentes · 5 feitos · 4 dias"; sem pendentes, "tudo feito"; sem itens, "nenhum item". */
export function textoResumoDoGrupo({
  pendentes,
  feitos,
  dias,
}: Pick<GrupoNaLista, 'pendentes' | 'feitos' | 'dias'>) {
  const partes: string[] = []
  if (pendentes === 0 && feitos === 0) partes.push('nenhum item')
  else if (pendentes === 0) partes.push('tudo feito')
  else {
    partes.push(`${pendentes} ${pendentes === 1 ? 'pendente' : 'pendentes'}`)
    if (feitos > 0) partes.push(`${feitos} ${feitos === 1 ? 'feito' : 'feitos'}`)
  }
  partes.push(`${dias} ${dias === 1 ? 'dia' : 'dias'}`)
  return partes.join(' · ')
}
