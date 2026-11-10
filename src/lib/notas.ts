import type {
  Category,
  DataLocal,
  GroupCard,
  GroupItem,
  GroupSeries,
  Icone,
  Note,
  Task,
  TipoVinculo,
  Vinculo,
} from '@/db/types'
import { format, isSameYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { deDataLocal, diasEntre, nomeRelativo } from '@/lib/datas'
import { diaLocalDoMomento } from '@/lib/filtro-de-data'
import { normalizar } from '@/lib/procedimentos'

/**
 * Regras das notas ligadas a tarefa solta, grupo (série) ou item (cadeia de cópias), sem banco:
 * quem é o dono de cada nota, o caminho "Categoria › Grupo › Item", os blocos da aba Notas,
 * filtros e busca. O repositório só carrega os registros e grava.
 */

/** Tamanho máximo do título tirado da primeira linha do texto. */
const TAMANHO_TITULO_AUTOMATICO = 80

/** Título mostrado: o próprio, a primeira linha do texto ou "Sem título". */
export function tituloDaNota(nota: Pick<Note, 'titulo' | 'conteudo'>) {
  if (nota.titulo.trim()) return nota.titulo.trim()
  const primeiraLinha = nota.conteudo.split('\n').find((linha) => linha.trim())
  return primeiraLinha?.trim().slice(0, TAMANHO_TITULO_AUTOMATICO) || 'Sem título'
}

/** Texto da prévia: sem a linha que já virou título (quando a nota não tem título próprio). */
export function previaDaNota(nota: Pick<Note, 'titulo' | 'conteudo'>) {
  if (nota.titulo.trim()) return nota.conteudo.trim()
  const linhas = nota.conteudo.split('\n')
  const indice = linhas.findIndex((linha) => linha.trim())
  return indice < 0
    ? ''
    : linhas
        .slice(indice + 1)
        .join('\n')
        .trim()
}

/** Chave de mapa de um vínculo ("item:abc"). */
export function chaveDoVinculo(vinculo: Vinculo) {
  return `${vinculo.tipo}:${vinculo.id}`
}

export function mesmoVinculo(a: Vinculo | undefined, b: Vinculo | undefined) {
  return a?.tipo === b?.tipo && a?.id === b?.id
}

/** Vínculo das notas de um item: a cadeia toda, não só a cópia daquele dia. */
export function vinculoDoItem(item: Pick<GroupItem, 'cadeiaId'>): Vinculo {
  return { tipo: 'item', id: item.cadeiaId }
}

/** "1 nota", "3 notas". */
export function textoQuantasNotas(quantidade: number) {
  return `${quantidade} ${quantidade === 1 ? 'nota' : 'notas'}`
}

/** Aviso da confirmação de excluir quando notas vão ficar avulsas (vazio se nenhuma). */
export function avisoNotasAvulsas(quantidade: number, de: 'tarefa' | 'grupo' | 'item') {
  if (quantidade === 0) return ''
  const sujeito = { tarefa: 'Esta tarefa', grupo: 'Este grupo', item: 'Este item' }[de]
  return quantidade === 1
    ? `${sujeito} tem 1 nota. Ela ficará como nota avulsa.`
    : `${sujeito} tem ${quantidade} notas. Elas ficarão como notas avulsas.`
}

// ---------------------------------------------------------------- migração e backup antigo

/** Nota como era até o banco v9 / backup formato 6: a anotação da tarefa usava `dono`. */
export type NotaAntiga = Omit<Note, 'vinculo'> & {
  vinculo?: Vinculo
  dono?: { tipo: string; id: string }
}

/**
 * Anotação de tarefa que ainda existe vira nota ligada a ela; o resto fica avulsa.
 * Nada do texto, título ou datas muda.
 */
export function converterNotaAntiga(nota: NotaAntiga, idsTarefas: Set<string>): Note {
  const { dono, ...resto } = nota
  if (resto.vinculo) return resto
  if (dono?.tipo === 'task' && idsTarefas.has(dono.id)) {
    return { ...resto, vinculo: { tipo: 'tarefa', id: dono.id } }
  }
  return resto
}

// ---------------------------------------------------------------- quem é o dono

/** Registros que dizem a quem as notas pertencem (o repositório lê só os necessários). */
export interface DadosDosVinculos {
  tarefas: Task[]
  series: GroupSeries[]
  /** Cards das séries ligadas e dos itens ligados. */
  cards: GroupCard[]
  /** Itens das cadeias ligadas. */
  itens: GroupItem[]
  /** Na ordem do usuário. */
  categorias: Category[]
}

/** Um trecho do caminho "Categoria › Grupo › Item"; `data` = dia que o link abre. */
export interface TrechoDoCaminho {
  tipo: 'categoria' | TipoVinculo
  texto: string
  data?: DataLocal
}

export interface DonoDaNota {
  /** `avulsa` também quando o alvo não existe mais. */
  tipo: TipoVinculo | 'avulsa'
  /** Categoria do alvo (a do grupo, para o item). */
  categoria?: Pick<Category, 'id' | 'nome' | 'cor' | 'icone'>
  /** Cor da faixa: a da categoria. */
  cor?: string
  /** Série do grupo (grupo e item). */
  serie?: Pick<GroupSeries, 'id' | 'titulo'>
  caminho: TrechoDoCaminho[]
}

const AVULSA: DonoDaNota = { tipo: 'avulsa', caminho: [] }

/**
 * Dia que o link abre: hoje, se estiver entre os dias; senão o mais recente que já passou;
 * senão o primeiro que vem.
 */
export function diaMaisPerto(datas: DataLocal[], hoje: DataLocal) {
  if (datas.length === 0) return undefined
  if (datas.includes(hoje)) return hoje
  const passados = datas.filter((data) => data < hoje).sort()
  if (passados.length > 0) return passados.at(-1)
  return [...datas].sort()[0]
}

const isItemAtivo = (item: GroupItem) => item.status === 'pendente' || item.status === 'concluido'

/**
 * O item que representa a cadeia agora: o pendente ou feito (o fim da cadeia), senão o do dia
 * mais recente. Dá o título e o dia do link.
 */
export function itemAtualDaCadeia(itensDaCadeia: GroupItem[], cards: Map<string, GroupCard>) {
  const dataDe = (item: GroupItem) => cards.get(item.cardId)?.data ?? ''
  const porDia = [...itensDaCadeia].sort((a, b) => dataDe(b).localeCompare(dataDe(a)))
  return porDia.find(isItemAtivo) ?? porDia[0]
}

/** Prepara os registros para resolver muitos vínculos de uma vez. */
export function indexarVinculos(dados: DadosDosVinculos, hoje: DataLocal) {
  const tarefas = new Map(dados.tarefas.map((tarefa) => [tarefa.id, tarefa]))
  const series = new Map(dados.series.map((serie) => [serie.id, serie]))
  const cards = new Map(dados.cards.map((card) => [card.id, card]))
  const categorias = new Map(dados.categorias.map((categoria) => [categoria.id, categoria]))
  const cadeias = new Map<string, GroupItem[]>()
  for (const item of dados.itens) {
    cadeias.set(item.cadeiaId, [...(cadeias.get(item.cadeiaId) ?? []), item])
  }
  const diasDaSerie = new Map<string, DataLocal[]>()
  for (const card of dados.cards) {
    if (card.arquivado) continue
    diasDaSerie.set(card.seriesId, [...(diasDaSerie.get(card.seriesId) ?? []), card.data])
  }
  return { tarefas, series, cards, categorias, cadeias, diasDaSerie, hoje }
}

export type IndiceDosVinculos = ReturnType<typeof indexarVinculos>

function categoriaECor(indice: IndiceDosVinculos, alvo: { categoryId?: string }) {
  const categoria = alvo.categoryId ? indice.categorias.get(alvo.categoryId) : undefined
  if (!categoria) return {}
  const { cor } = categoria
  return {
    categoria: {
      id: categoria.id,
      nome: categoria.nome,
      cor: categoria.cor,
      ...(categoria.icone && { icone: categoria.icone }),
    },
    cor,
  }
}

/** A quem a nota pertence, com o caminho para mostrar. Alvo que sumiu = avulsa. */
export function donoDaNota(vinculo: Vinculo | undefined, indice: IndiceDosVinculos): DonoDaNota {
  if (!vinculo) return AVULSA
  const trechoCategoria = (categoria?: { nome: string }): TrechoDoCaminho[] =>
    categoria ? [{ tipo: 'categoria', texto: categoria.nome }] : []

  if (vinculo.tipo === 'tarefa') {
    const tarefa = indice.tarefas.get(vinculo.id)
    if (!tarefa) return AVULSA
    const cor = categoriaECor(indice, tarefa)
    return {
      tipo: 'tarefa',
      ...cor,
      caminho: [
        ...trechoCategoria(cor.categoria),
        { tipo: 'tarefa', texto: tarefa.titulo, data: tarefa.data },
      ],
    }
  }

  const trechoDoGrupo = (serie: GroupSeries): TrechoDoCaminho => ({
    tipo: 'grupo',
    texto: serie.titulo,
    data: diaMaisPerto(indice.diasDaSerie.get(serie.id) ?? [], indice.hoje),
  })

  if (vinculo.tipo === 'grupo') {
    const serie = indice.series.get(vinculo.id)
    if (!serie) return AVULSA
    const cor = categoriaECor(indice, serie)
    return {
      tipo: 'grupo',
      ...cor,
      serie: { id: serie.id, titulo: serie.titulo },
      caminho: [...trechoCategoria(cor.categoria), trechoDoGrupo(serie)],
    }
  }

  const item = itemAtualDaCadeia(indice.cadeias.get(vinculo.id) ?? [], indice.cards)
  const card = item && indice.cards.get(item.cardId)
  const serie = card && indice.series.get(card.seriesId)
  if (!item || !card || !serie) return AVULSA
  const cor = categoriaECor(indice, serie)
  return {
    tipo: 'item',
    ...cor,
    serie: { id: serie.id, titulo: serie.titulo },
    caminho: [
      ...trechoCategoria(cor.categoria),
      trechoDoGrupo(serie),
      { tipo: 'item', texto: item.titulo, data: card.data },
    ],
  }
}

/** "Hostinger › Fazer Deploy" (sem a categoria) ou "Nota avulsa". */
export function textoDoVinculo(dono: DonoDaNota) {
  const partes = dono.caminho.filter((trecho) => trecho.tipo !== 'categoria')
  return partes.length > 0 ? partes.map((trecho) => trecho.texto).join(' › ') : 'Nota avulsa'
}

// ---------------------------------------------------------------- aba Notas

export interface NotaComDono {
  nota: Note
  dono: DonoDaNota
}

export type ModoDasNotas = 'categoria' | 'grupo' | 'recentes'
export const MODOS_DAS_NOTAS: ModoDasNotas[] = ['categoria', 'grupo', 'recentes']

export type FiltroDeTipo = 'todas' | TipoVinculo | 'avulsa'

export interface BlocoDeNotas {
  /** Chave estável do bloco (também a do estado aberto/recolhido guardado). */
  id: string
  titulo: string
  cor?: string
  /** Ícone da categoria do bloco ("Por categoria") ou do grupo ("Por grupo"). */
  icone?: Icone
  notas: NotaComDono[]
}

const maisRecentePrimeiro = (a: NotaComDono, b: NotaComDono) =>
  b.nota.atualizadoEm.localeCompare(a.nota.atualizadoEm)

/** Nome do alvo direto (grupo ou tarefa) para ordenar dentro do bloco. */
const nomeDoAlvo = (item: NotaComDono) =>
  item.dono.caminho.find((trecho) => trecho.tipo === 'grupo' || trecho.tipo === 'tarefa')?.texto ??
  ''

const porAlvoERecencia = (a: NotaComDono, b: NotaComDono) =>
  nomeDoAlvo(a).localeCompare(nomeDoAlvo(b), 'pt-BR', { sensitivity: 'base' }) ||
  maisRecentePrimeiro(a, b)

/**
 * Blocos da aba Notas:
 * - `categoria`: um por categoria (ordem do usuário; vem só quem tem nota), dentro dele por
 *   grupo/tarefa; depois "Sem categoria" e "Notas avulsas".
 * - `grupo`: um por grupo (notas do grupo e dos itens), por nome; depois "Tarefas soltas" e
 *   "Notas avulsas".
 * - `recentes`: um bloco por dia da última edição (`agruparPorDia`).
 * Blocos vazios não aparecem.
 */
export function agruparNotas(
  notas: NotaComDono[],
  modo: ModoDasNotas,
  categorias: Pick<Category, 'id' | 'nome' | 'cor' | 'icone'>[],
  hoje: DataLocal,
): BlocoDeNotas[] {
  const avulsas = notas.filter((item) => item.dono.tipo === 'avulsa').sort(maisRecentePrimeiro)
  const ligadas = notas.filter((item) => item.dono.tipo !== 'avulsa')
  const blocoAvulsas: BlocoDeNotas = { id: 'avulsas', titulo: 'Notas avulsas', notas: avulsas }

  if (modo === 'recentes') return agruparPorDia(notas, hoje)

  if (modo === 'categoria') {
    const blocos: BlocoDeNotas[] = categorias.map((categoria) => ({
      id: `categoria:${categoria.id}`,
      titulo: categoria.nome,
      cor: categoria.cor,
      icone: categoria.icone,
      notas: ligadas
        .filter((item) => item.dono.categoria?.id === categoria.id)
        .sort(porAlvoERecencia),
    }))
    const idsCategorias = new Set(categorias.map((categoria) => categoria.id))
    blocos.push({
      id: 'sem-categoria',
      titulo: 'Sem categoria',
      notas: ligadas
        .filter((item) => !item.dono.categoria || !idsCategorias.has(item.dono.categoria.id))
        .sort(porAlvoERecencia),
    })
    blocos.push(blocoAvulsas)
    return blocos.filter((bloco) => bloco.notas.length > 0)
  }

  const porSerie = new Map<string, BlocoDeNotas>()
  for (const item of ligadas) {
    if (!item.dono.serie) continue
    const bloco = porSerie.get(item.dono.serie.id) ?? {
      id: `grupo:${item.dono.serie.id}`,
      titulo: item.dono.serie.titulo,
      cor: item.dono.categoria?.cor,
      icone: item.dono.categoria?.icone,
      notas: [],
    }
    bloco.notas.push(item)
    porSerie.set(item.dono.serie.id, bloco)
  }
  // No bloco do grupo: as notas do próprio grupo primeiro, depois as dos itens.
  const doGrupoPrimeiro = (a: NotaComDono, b: NotaComDono) =>
    Number(a.dono.tipo === 'item') - Number(b.dono.tipo === 'item') || porAlvoERecencia(a, b)
  const blocosDeGrupo = [...porSerie.values()]
    .map((bloco) => ({ ...bloco, notas: bloco.notas.sort(doGrupoPrimeiro) }))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
  return [
    ...blocosDeGrupo,
    {
      id: 'tarefas',
      titulo: 'Tarefas soltas',
      notas: ligadas.filter((item) => item.dono.tipo === 'tarefa').sort(porAlvoERecencia),
    },
    blocoAvulsas,
  ].filter((bloco) => bloco.notas.length > 0)
}

/**
 * Cabeçalho de um dia em Recentes: "Hoje", "Ontem", "sexta, 30/10"; de outro ano, "30/10/2025".
 */
export function rotuloDoDia(dia: DataLocal, hoje: DataLocal) {
  const relativo = nomeRelativo(dia, hoje)
  if (relativo === 'hoje') return 'Hoje'
  if (relativo === 'ontem') return 'Ontem'
  const data = deDataLocal(dia)
  if (!isSameYear(data, deDataLocal(hoje))) return format(data, 'dd/MM/yyyy')
  // pt-BR do date-fns 4: `EEE` = "sexta" (sem "-feira" e sem ponto).
  return format(data, "EEE', 'dd/MM", { locale: ptBR })
}

/** Modo Recentes: um bloco por dia local da última edição, dias e notas mais recentes primeiro. */
export function agruparPorDia(notas: NotaComDono[], hoje: DataLocal): BlocoDeNotas[] {
  const porDia = new Map<string, NotaComDono[]>()
  for (const item of [...notas].sort(maisRecentePrimeiro)) {
    const dia = diaLocalDoMomento(item.nota.atualizadoEm) ?? ''
    porDia.set(dia, [...(porDia.get(dia) ?? []), item])
  }
  // A ordem de inserção já é do dia mais recente para o mais antigo.
  return [...porDia].map(([dia, doDia]) => ({
    id: `dia:${dia || 'sem-data'}`,
    titulo: dia ? rotuloDoDia(dia, hoje) : 'Sem data',
    notas: doDia,
  }))
}

/** Filtros do topo da aba: tipo de vínculo e categoria (sem categoria = todas). */
export function filtrarNotas(
  notas: NotaComDono[],
  filtro: { tipo: FiltroDeTipo; categoryId?: string },
) {
  return notas.filter(
    (item) =>
      (filtro.tipo === 'todas' || item.dono.tipo === filtro.tipo) &&
      (!filtro.categoryId || item.dono.categoria?.id === filtro.categoryId),
  )
}

function palavrasDe(termo: string) {
  return normalizar(termo).split(/\s+/).filter(Boolean)
}

/** Notas que contêm todas as palavras do termo no título ou no texto (sem acentos). */
export function buscarNotas<T extends Pick<Note, 'titulo' | 'conteudo'>>(
  notas: T[],
  termo: string,
) {
  const palavras = palavrasDe(termo)
  if (palavras.length === 0) return notas
  return notas.filter((nota) => {
    const texto = normalizar(`${nota.titulo}\n${nota.conteudo}`)
    return palavras.every((palavra) => texto.includes(palavra))
  })
}

/** Busca no título, no texto e nos nomes do vínculo (categoria, grupo, tarefa, item). */
export function buscarNotasComDono(notas: NotaComDono[], termo: string) {
  const palavras = palavrasDe(termo)
  if (palavras.length === 0) return notas
  return notas.filter(({ nota, dono }) => {
    const texto = normalizar(
      [nota.titulo, nota.conteudo, ...dono.caminho.map((trecho) => trecho.texto)].join('\n'),
    )
    return palavras.every((palavra) => texto.includes(palavra))
  })
}

// ---------------------------------------------------------------- "Vincular a…"

/** Um alvo possível para ligar a nota. */
export interface AlvoParaVincular {
  vinculo: Vinculo
  titulo: string
  /** "Hostinger" (grupo do item), "Casa" (categoria)… ou vazio. */
  contexto: string
  data?: DataLocal
}

/** Quantos alvos a busca mostra. */
export const LIMITE_DE_ALVOS = 30

/**
 * Tarefas soltas (não arquivadas), grupos e itens (um por cadeia, o atual) que casam com o
 * termo; os mais perto de hoje primeiro. Sem termo, os mais perto de hoje.
 */
export function alvosParaVincular(dados: DadosDosVinculos, termo: string, hoje: DataLocal) {
  const indice = indexarVinculos(dados, hoje)
  const alvos: AlvoParaVincular[] = []
  for (const tarefa of dados.tarefas) {
    if (tarefa.status === 'arquivada') continue
    const categoria = tarefa.categoryId ? indice.categorias.get(tarefa.categoryId) : undefined
    alvos.push({
      vinculo: { tipo: 'tarefa', id: tarefa.id },
      titulo: tarefa.titulo,
      contexto: categoria?.nome ?? '',
      data: tarefa.data,
    })
  }
  for (const serie of dados.series) {
    const categoria = serie.categoryId ? indice.categorias.get(serie.categoryId) : undefined
    alvos.push({
      vinculo: { tipo: 'grupo', id: serie.id },
      titulo: serie.titulo,
      contexto: categoria?.nome ?? '',
      data: diaMaisPerto(indice.diasDaSerie.get(serie.id) ?? [], hoje),
    })
  }
  for (const [cadeiaId, itens] of indice.cadeias) {
    const item = itemAtualDaCadeia(itens, indice.cards)
    const card = item && indice.cards.get(item.cardId)
    const serie = card && indice.series.get(card.seriesId)
    if (!item || !card || !serie || item.status === 'arquivado') continue
    alvos.push({
      vinculo: { tipo: 'item', id: cadeiaId },
      titulo: item.titulo,
      contexto: serie.titulo,
      data: card.data,
    })
  }
  const palavras = palavrasDe(termo)
  const distancia = (alvo: AlvoParaVincular) =>
    alvo.data ? Math.abs(diasEntre(hoje, alvo.data)) : Number.MAX_SAFE_INTEGER
  return alvos
    .filter((alvo) => {
      const texto = normalizar(`${alvo.titulo}\n${alvo.contexto}`)
      return palavras.every((palavra) => texto.includes(palavra))
    })
    .sort((a, b) => distancia(a) - distancia(b) || a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .slice(0, LIMITE_DE_ALVOS)
}
