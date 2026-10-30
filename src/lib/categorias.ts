import type { Category, Subcategory, Task } from '@/db/types'
import { variacaoCor } from '@/lib/cores'

export interface CategoriaComSubcategorias extends Category {
  /** Em ordem de criação; a posição define a variação de cor das que não têm cor própria. */
  subcategorias: Subcategory[]
}

const porNome = (a: { nome: string }, b: { nome: string }) =>
  a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })

/** Monta a árvore categoria → subcategorias, categorias em ordem alfabética. */
export function montarCategorias(
  categorias: Category[],
  subcategorias: Subcategory[],
): CategoriaComSubcategorias[] {
  return [...categorias].sort(porNome).map((categoria) => ({
    ...categoria,
    subcategorias: subcategorias
      .filter((subcategoria) => subcategoria.categoryId === categoria.id)
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm)),
  }))
}

/** Cor exibida da subcategoria: a própria ou uma variação estável da cor da categoria. */
export function corDaSubcategoria(categoria: CategoriaComSubcategorias, subcategoriaId: string) {
  const indice = categoria.subcategorias.findIndex((item) => item.id === subcategoriaId)
  const subcategoria = categoria.subcategorias[indice]
  if (!subcategoria) return categoria.cor
  return subcategoria.cor ?? variacaoCor(categoria.cor, indice)
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

export interface FiltroCategoria {
  categoriaId?: string
  subcategoriaId?: string
}

/** Filtra por categoria (inclui todas as subcategorias dela) ou por uma subcategoria. */
export function filtrarPorCategoria<T extends Pick<Task, 'categoryId' | 'subcategoryId'>>(
  tarefas: T[],
  filtro: FiltroCategoria,
) {
  if (!filtro.categoriaId) return tarefas
  return tarefas.filter(
    (tarefa) =>
      tarefa.categoryId === filtro.categoriaId &&
      (!filtro.subcategoriaId || tarefa.subcategoryId === filtro.subcategoriaId),
  )
}
