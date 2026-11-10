import type { Category, Icone, Task, TipoCategoria } from '@/db/types'

const porNome = (a: { nome: string }, b: { nome: string }) =>
  a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })

/** Pela `ordem`; empate (ex.: dados antigos) desempata pelo nome. */
const porOrdem = (a: Category, b: Category) => a.ordem - b.ordem || porNome(a, b)

/** Nomes iguais sem diferenciar maiúsculas, acentos e espaços nas pontas. */
export function isMesmoNome(a: string, b: string) {
  return a.trim().localeCompare(b.trim(), 'pt-BR', { sensitivity: 'base' }) === 0
}

/** Categorias na ordem definida pelo usuário. */
export function montarCategorias(categorias: Category[]): Category[] {
  return [...categorias].sort(porOrdem)
}

interface ComSubcategoriaAntiga {
  categoryId?: string
  subcategoryId?: string
}

/** Subcategoria antiga → categoria-mãe (banco antes da v13, backups antes do formato 14). */
export function maesDasSubcategorias(subcategorias: { id: string; categoryId: string }[]) {
  return new Map(subcategorias.map((subcategoria) => [subcategoria.id, subcategoria.categoryId]))
}

/**
 * Tira a subcategoria antiga do item. Quem a usava fica na categoria-mãe (que já é a sua
 * `categoryId`; se faltar, vem da subcategoria). Item só com categoria ou sem categoria fica igual.
 */
export function religarACategoriaMae<T extends ComSubcategoriaAntiga>(
  item: T,
  maeDe: ReadonlyMap<string, string>,
): Omit<T, 'subcategoryId'> {
  const { subcategoryId, ...resto } = item
  const mae = subcategoryId === undefined ? undefined : maeDe.get(subcategoryId)
  if (resto.categoryId || !mae) return resto
  return { ...resto, categoryId: mae }
}

type SemOrdem<T> = Omit<T, 'ordem'> & { ordem?: number }
type SemTipo<T> = Omit<T, 'tipo'> & { tipo?: TipoCategoria }

/**
 * Dá `ordem` a quem não tem (banco antes da v8, backups antes do formato 5): em ordem
 * alfabética, que era a ordem mostrada antes. Quem já tem `ordem` fica como está; as novas vão
 * para depois delas.
 */
export function preencherOrdem<C extends SemOrdem<SemTipo<Category>>>(
  categorias: C[],
): (C & { ordem: number })[] {
  const maior = Math.max(0, ...categorias.flatMap((categoria) => categoria.ordem ?? []))
  const semOrdem = categorias.filter((categoria) => categoria.ordem === undefined).sort(porNome)
  return categorias.map((categoria) =>
    categoria.ordem === undefined
      ? { ...categoria, ordem: maior + semOrdem.indexOf(categoria) + 1 }
      : categoria,
  ) as (C & { ordem: number })[]
}

/** Rótulos de cada tipo, para seções, avisos e menus. */
export const NOMES_DO_TIPO: Record<TipoCategoria, { singular: string; plural: string }> = {
  grupo: { singular: 'Grupo', plural: 'Grupos' },
  procedimento: { singular: 'Procedimento', plural: 'Procedimentos' },
}

export function outroTipo(tipo: TipoCategoria): TipoCategoria {
  return tipo === 'grupo' ? 'procedimento' : 'grupo'
}

/** Só as categorias do tipo, mantendo a ordem recebida. */
export function categoriasDoTipo<T extends { tipo: TipoCategoria }>(
  categorias: T[],
  tipo: TipoCategoria,
) {
  return categorias.filter((categoria) => categoria.tipo === tipo)
}

interface ComCategoria {
  categoryId?: string
}

/**
 * Dá `tipo` a quem não tem (banco antes da v9, backups antes do formato 6), pelo uso:
 * só em tarefas/grupos ou sem uso → grupo; só em procedimentos → procedimento. Usada pelos
 * dois vira duas com o mesmo nome e cor: a original (mesmo id) fica como grupo e uma cópia
 * passa a ser a dos procedimentos, que são religados a ela.
 * Quem já tem `tipo` fica como está. Havendo mudança, a `ordem` é renumerada dentro de cada
 * tipo, mantendo a sequência anterior.
 */
export function separarPorTipo<P extends ComCategoria>(dados: {
  categorias: SemTipo<Category>[]
  tarefas: ComCategoria[]
  grupos: ComCategoria[]
  procedimentos: P[]
}): { categorias: Category[]; procedimentos: P[] } {
  const semTipo = dados.categorias.filter((categoria) => categoria.tipo === undefined)
  if (semTipo.length === 0) {
    return { categorias: dados.categorias as Category[], procedimentos: dados.procedimentos }
  }
  const idsDeGrupo = new Set(
    [...dados.tarefas, ...dados.grupos].flatMap((item) => item.categoryId ?? []),
  )
  const idsDeProcedimento = new Set(dados.procedimentos.flatMap((item) => item.categoryId ?? []))

  const categorias: Category[] = []
  /** Categoria original → cópia, para religar os procedimentos. */
  const copiaDe = new Map<string, string>()
  for (const categoria of dados.categorias) {
    if (categoria.tipo !== undefined) {
      categorias.push(categoria as Category)
      continue
    }
    const isDeGrupo = idsDeGrupo.has(categoria.id)
    const isDeProcedimento = idsDeProcedimento.has(categoria.id)
    if (!isDeGrupo || !isDeProcedimento) {
      categorias.push({ ...categoria, tipo: isDeProcedimento ? 'procedimento' : 'grupo' })
      continue
    }
    const copia: Category = { ...categoria, id: crypto.randomUUID(), tipo: 'procedimento' }
    categorias.push({ ...categoria, tipo: 'grupo' }, copia)
    copiaDe.set(categoria.id, copia.id)
  }

  const ordemNoTipo = new Map<string, number>()
  for (const tipo of ['grupo', 'procedimento'] as const) {
    categoriasDoTipo(categorias, tipo)
      .sort(porOrdem)
      .forEach((categoria, indice) => ordemNoTipo.set(categoria.id, indice + 1))
  }

  return {
    categorias: categorias.map((categoria) => ({
      ...categoria,
      ordem: ordemNoTipo.get(categoria.id) ?? categoria.ordem,
    })),
    procedimentos: dados.procedimentos.map((procedimento) => {
      const novaCategoria = procedimento.categoryId && copiaDe.get(procedimento.categoryId)
      return novaCategoria ? { ...procedimento, categoryId: novaCategoria } : procedimento
    }),
  }
}

/** Quantos itens usam cada categoria. */
export interface UsoDaCategoria {
  tarefas: number
  grupos: number
  procedimentos: number
}

export const SEM_USO: UsoDaCategoria = { tarefas: 0, grupos: 0, procedimentos: 0 }

/** Soma o uso por categoria a partir dos `categoryId` de cada tipo de item. */
export function somarUso(chaves: {
  tarefas: string[]
  grupos: string[]
  procedimentos: string[]
}): Map<string, UsoDaCategoria> {
  const uso = new Map<string, UsoDaCategoria>()
  for (const tipo of ['tarefas', 'grupos', 'procedimentos'] as const) {
    for (const categoryId of chaves[tipo]) {
      const atual = uso.get(categoryId) ?? { ...SEM_USO }
      uso.set(categoryId, { ...atual, [tipo]: atual[tipo] + 1 })
    }
  }
  return uso
}

/** Só o uso que conta para o tipo: tarefas e grupos, ou procedimentos. */
export function usoNoTipo(uso: UsoDaCategoria, tipo: TipoCategoria): UsoDaCategoria {
  return tipo === 'grupo'
    ? { ...uso, procedimentos: 0 }
    : { ...SEM_USO, procedimentos: uso.procedimentos }
}

/** Quantos itens usam a categoria no próprio tipo. */
export function totalDoUso(uso: UsoDaCategoria) {
  return uso.tarefas + uso.grupos + uso.procedimentos
}

/** "4 tarefas · 2 grupos · 1 procedimento"; "Sem uso" quando nada usa. */
export function textoDoUso(uso: UsoDaCategoria) {
  const partes = [
    [uso.tarefas, 'tarefa', 'tarefas'],
    [uso.grupos, 'grupo', 'grupos'],
    [uso.procedimentos, 'procedimento', 'procedimentos'],
  ] as const
  const texto = partes
    .filter(([quantidade]) => quantidade > 0)
    .map(
      ([quantidade, singular, plural]) => `${quantidade} ${quantidade === 1 ? singular : plural}`,
    )
    .join(' · ')
  return texto || 'Sem uso'
}

export interface Classificacao {
  cor: string
  /** Nome da categoria. */
  rotulo: string
  icone?: Icone
}

/** Cor e rótulo da categoria de uma tarefa; `null` se não tiver (ou se a categoria sumiu). */
export function classificarTarefa(
  tarefa: Pick<Task, 'categoryId'>,
  categorias: Category[],
): Classificacao | null {
  const categoria = categorias.find((item) => item.id === tarefa.categoryId)
  if (!categoria) return null
  return { cor: categoria.cor, rotulo: categoria.nome, icone: categoria.icone }
}

/** Uma categoria de Procedimentos oferecida ao criar categoria de Grupo ("Usar de Procedimentos"). */
export interface SugestaoDeProcedimento {
  categoria: Category
  /** Já há categoria de Grupo com o mesmo nome: o chip fica desabilitado ("já existe"). */
  isExistente: boolean
}

/**
 * Categorias de Procedimentos para reaproveitar num Grupo, na ordem do usuário, filtradas pelo
 * nome digitado (sem acento nem maiúscula). Sem categoria de Procedimento, lista vazia.
 */
export function sugestoesDeProcedimentos(
  categorias: Category[],
  termo: string,
): SugestaoDeProcedimento[] {
  const deGrupo = categoriasDoTipo(categorias, 'grupo')
  const busca = semAcento(termo.trim())
  return categoriasDoTipo(categorias, 'procedimento')
    .filter((categoria) => semAcento(categoria.nome).includes(busca))
    .map((categoria) => ({
      categoria,
      isExistente: deGrupo.some((grupo) => isMesmoNome(grupo.nome, categoria.nome)),
    }))
}

function semAcento(texto: string) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}
