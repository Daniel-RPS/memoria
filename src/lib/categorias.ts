import type { Category, Subcategory, Task } from '@/db/types'
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

/**
 * Dá `ordem` a quem não tem (banco antes da v8, backups antes do formato 5): categorias em
 * ordem alfabética e subcategorias pela criação, que era a ordem mostrada antes. Quem já tem
 * `ordem` fica como está; as novas vão para depois delas.
 */
export function preencherOrdem(
  categorias: SemOrdem<Category>[],
  subcategorias: SemOrdem<Subcategory>[],
): { categorias: Category[]; subcategorias: Subcategory[] } {
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
}

/** Cor e rótulo da categoria de uma tarefa; `null` se não tiver (ou se a categoria sumiu). */
export function classificarTarefa(
  tarefa: Pick<Task, 'categoryId' | 'subcategoryId'>,
  categorias: CategoriaComSubcategorias[],
): Classificacao | null {
  const categoria = categorias.find((item) => item.id === tarefa.categoryId)
  if (!categoria) return null
  const subcategoria = categoria.subcategorias.find((item) => item.id === tarefa.subcategoryId)
  if (!subcategoria) return { cor: categoria.cor, rotulo: categoria.nome }
  return {
    cor: corDaSubcategoria(categoria, subcategoria.id),
    rotulo: `${categoria.nome} › ${subcategoria.nome}`,
  }
}
