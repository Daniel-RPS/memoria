import type { Category, Icone, Subcategory, Task, TipoCategoria } from '@/db/types'
import { variacaoCor } from '@/lib/cores'

export interface CategoriaComSubcategorias extends Category {
  /** Na ordem definida pelo usuário. */
  subcategorias: Subcategory[]
}

const porNome = (a: { nome: string }, b: { nome: string }) =>
  a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })

const porCriacao = (a: { criadoEm: string }, b: { criadoEm: string }) =>
  a.criadoEm.localeCompare(b.criadoEm)

/** Pela `ordem`; empate (ex.: dados antigos) desempata pelo nome. */
const porOrdem = (a: Category | Subcategory, b: Category | Subcategory) =>
  a.ordem - b.ordem || porNome(a, b)

/** Nomes iguais sem diferenciar maiúsculas, acentos e espaços nas pontas. */
export function isMesmoNome(a: string, b: string) {
  return a.trim().localeCompare(b.trim(), 'pt-BR', { sensitivity: 'base' }) === 0
}

/** Monta a árvore categoria → subcategorias, as duas na ordem definida pelo usuário. */
export function montarCategorias(
  categorias: Category[],
  subcategorias: Subcategory[],
): CategoriaComSubcategorias[] {
  return [...categorias].sort(porOrdem).map((categoria) => ({
    ...categoria,
    subcategorias: subcategorias
      .filter((subcategoria) => subcategoria.categoryId === categoria.id)
      .sort(porOrdem),
  }))
}

type SemOrdem<T> = Omit<T, 'ordem'> & { ordem?: number }
type SemTipo<T> = Omit<T, 'tipo'> & { tipo?: TipoCategoria }

/**
 * Dá `ordem` a quem não tem (banco antes da v8, backups antes do formato 5): categorias em
 * ordem alfabética e subcategorias pela criação, que era a ordem mostrada antes. Quem já tem
 * `ordem` fica como está; as novas vão para depois delas.
 */
export function preencherOrdem<C extends SemOrdem<SemTipo<Category>>>(
  categorias: C[],
  subcategorias: SemOrdem<Subcategory>[],
): { categorias: (C & { ordem: number })[]; subcategorias: Subcategory[] } {
  function numerar<T extends { ordem?: number }>(itens: T[], comparar: (a: T, b: T) => number) {
    const maior = Math.max(0, ...itens.flatMap((item) => item.ordem ?? []))
    const semOrdem = itens.filter((item) => item.ordem === undefined).sort(comparar)
    return itens.map((item) =>
      item.ordem === undefined ? { ...item, ordem: maior + semOrdem.indexOf(item) + 1 } : item,
    ) as (T & { ordem: number })[]
  }
  const idsCategorias = [...new Set(subcategorias.map((subcategoria) => subcategoria.categoryId))]
  return {
    categorias: numerar(categorias, porNome),
    subcategorias: idsCategorias.flatMap((categoryId) =>
      numerar(
        subcategorias.filter((subcategoria) => subcategoria.categoryId === categoryId),
        porCriacao,
      ),
    ),
  }
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
  subcategoryId?: string
}

/**
 * Dá `tipo` a quem não tem (banco antes da v9, backups antes do formato 6), pelo uso:
 * só em tarefas/grupos ou sem uso → grupo; só em procedimentos → procedimento. Usada pelos
 * dois vira duas com o mesmo nome e cor: a original (mesmo id) fica como grupo e uma cópia,
 * com as subcategorias copiadas, passa a ser a dos procedimentos, que são religados a ela.
 * Quem já tem `tipo` fica como está. Havendo mudança, a `ordem` é renumerada dentro de cada
 * tipo, mantendo a sequência anterior.
 */
export function separarPorTipo<P extends ComCategoria>(dados: {
  categorias: SemTipo<Category>[]
  subcategorias: Subcategory[]
  tarefas: ComCategoria[]
  grupos: ComCategoria[]
  procedimentos: P[]
}): { categorias: Category[]; subcategorias: Subcategory[]; procedimentos: P[] } {
  const semTipo = dados.categorias.filter((categoria) => categoria.tipo === undefined)
  if (semTipo.length === 0) {
    return { ...dados, categorias: dados.categorias as Category[] }
  }
  const idsDeGrupo = new Set(
    [...dados.tarefas, ...dados.grupos].flatMap((item) => item.categoryId ?? []),
  )
  const idsDeProcedimento = new Set(dados.procedimentos.flatMap((item) => item.categoryId ?? []))

  const categorias: Category[] = []
  const subcategoriasNovas: Subcategory[] = []
  /** Categoria (e subcategorias) original → cópia, para religar os procedimentos. */
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
    for (const subcategoria of dados.subcategorias) {
      if (subcategoria.categoryId !== categoria.id) continue
      const subcopia = { ...subcategoria, id: crypto.randomUUID(), categoryId: copia.id }
      subcategoriasNovas.push(subcopia)
      copiaDe.set(subcategoria.id, subcopia.id)
    }
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
    subcategorias: [...dados.subcategorias, ...subcategoriasNovas],
    procedimentos: dados.procedimentos.map((procedimento) => {
      const novaCategoria = procedimento.categoryId && copiaDe.get(procedimento.categoryId)
      if (!novaCategoria) return procedimento
      const novaSubcategoria = procedimento.subcategoryId && copiaDe.get(procedimento.subcategoryId)
      return {
        ...procedimento,
        categoryId: novaCategoria,
        ...(novaSubcategoria ? { subcategoryId: novaSubcategoria } : {}),
      }
    }),
  }
}

/**
 * Cor exibida da subcategoria: a própria ou uma variação da cor da categoria pela ordem de
 * CRIAÇÃO (estável: reordenar não troca os tons).
 */
export function corDaSubcategoria(categoria: CategoriaComSubcategorias, subcategoriaId: string) {
  const porIdade = [...categoria.subcategorias].sort(porCriacao)
  const indice = porIdade.findIndex((item) => item.id === subcategoriaId)
  const subcategoria = porIdade[indice]
  if (!subcategoria) return categoria.cor
  return subcategoria.cor ?? variacaoCor(categoria.cor, indice)
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
  /** Ex.: "Casa" ou "Casa › Jardim". */
  rotulo: string
  /** Ícone da categoria (a subcategoria não tem ícone próprio). */
  icone?: Icone
}

/** Cor e rótulo da categoria de uma tarefa; `null` se não tiver (ou se a categoria sumiu). */
export function classificarTarefa(
  tarefa: Pick<Task, 'categoryId' | 'subcategoryId'>,
  categorias: CategoriaComSubcategorias[],
): Classificacao | null {
  const categoria = categorias.find((item) => item.id === tarefa.categoryId)
  if (!categoria) return null
  const subcategoria = categoria.subcategorias.find((item) => item.id === tarefa.subcategoryId)
  if (!subcategoria) return { cor: categoria.cor, rotulo: categoria.nome, icone: categoria.icone }
  return {
    cor: corDaSubcategoria(categoria, subcategoria.id),
    rotulo: `${categoria.nome} › ${subcategoria.nome}`,
    icone: categoria.icone,
  }
}
