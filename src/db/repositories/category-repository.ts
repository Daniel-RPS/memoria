import { db } from '@/db/database'
import type { Category, Subcategory } from '@/db/types'
import { agora } from '@/db/repositories/ordenacao'
import { montarCategorias } from '@/lib/categorias'
import { PALETA_CATEGORIAS } from '@/lib/cores'
import { ErroDeValidacao } from '@/lib/erros'

function mesmoNome(a: string, b: string) {
  return a.trim().localeCompare(b.trim(), 'pt-BR', { sensitivity: 'base' }) === 0
}

/** Todas as categorias com suas subcategorias. */
export async function listarCategorias() {
  const [categorias, subcategorias] = await Promise.all([
    db.categories.toArray(),
    db.subcategories.toArray(),
  ])
  return montarCategorias(categorias, subcategorias)
}

/** Quantas tarefas (de qualquer dia e status) usam a categoria. */
export function contarTarefasDaCategoria(categoryId: string) {
  return db.tasks.where('categoryId').equals(categoryId).count()
}

/** Primeira cor da paleta ainda não usada; se todas estiverem em uso, recomeça. */
export function proximaCor(categoriasExistentes: Pick<Category, 'cor'>[]) {
  const usadas = new Set(categoriasExistentes.map((categoria) => categoria.cor))
  const livre = PALETA_CATEGORIAS.find((cor) => !usadas.has(cor.hex))
  return (livre ?? PALETA_CATEGORIAS[categoriasExistentes.length % PALETA_CATEGORIAS.length]).hex
}

/** Cria a categoria; sem `cor`, usa a próxima cor livre da paleta. */
export async function criarCategoria(dados: { nome: string; cor?: string }): Promise<Category> {
  const existentes = await db.categories.toArray()
  if (existentes.some((categoria) => mesmoNome(categoria.nome, dados.nome))) {
    throw new ErroDeValidacao('Já existe uma categoria com esse nome.')
  }
  const momento = agora()
  const categoria: Category = {
    id: crypto.randomUUID(),
    nome: dados.nome.trim(),
    cor: dados.cor ?? proximaCor(existentes),
    criadoEm: momento,
    atualizadoEm: momento,
  }
  await db.categories.add(categoria)
  return categoria
}

export async function atualizarCategoria(id: string, mudancas: { nome?: string; cor?: string }) {
  await db.categories.update(id, {
    ...mudancas,
    ...(mudancas.nome !== undefined && { nome: mudancas.nome.trim() }),
    atualizadoEm: agora(),
  })
}

/**
 * Exclui a categoria e as subcategorias dela. Tarefas, grupos e procedimentos NÃO são apagados:
 * só ficam sem categoria.
 */
export async function excluirCategoria(id: string) {
  await db.transaction(
    'rw',
    [db.categories, db.subcategories, db.tasks, db.procedures, db.groupSeries],
    async () => {
      const momento = agora()
      const semCategoria = {
        categoryId: undefined,
        subcategoryId: undefined,
        atualizadoEm: momento,
      }
      await db.tasks.where('categoryId').equals(id).modify(semCategoria)
      await db.groupSeries.where('categoryId').equals(id).modify(semCategoria)
      await db.procedures
        .where('categoryId')
        .equals(id)
        .modify((procedimento) => {
          // Forma de callback: a de objeto não tipa com o `Step` recursivo.
          delete procedimento.categoryId
          procedimento.atualizadoEm = momento
        })
      await db.subcategories.where('categoryId').equals(id).delete()
      await db.categories.delete(id)
    },
  )
}

export async function criarSubcategoria(dados: {
  categoryId: string
  nome: string
}): Promise<Subcategory> {
  const irmas = await db.subcategories.where('categoryId').equals(dados.categoryId).toArray()
  if (irmas.some((subcategoria) => mesmoNome(subcategoria.nome, dados.nome))) {
    throw new ErroDeValidacao('Já existe uma subcategoria com esse nome nesta categoria.')
  }
  const momento = agora()
  const subcategoria: Subcategory = {
    id: crypto.randomUUID(),
    categoryId: dados.categoryId,
    nome: dados.nome.trim(),
    criadoEm: momento,
    atualizadoEm: momento,
  }
  await db.subcategories.add(subcategoria)
  return subcategoria
}

/** `cor: null` volta a usar a variação automática da cor da categoria. */
export async function atualizarSubcategoria(
  id: string,
  mudancas: { nome?: string; cor?: string | null },
) {
  const { cor, nome } = mudancas
  await db.subcategories.update(id, {
    ...(nome !== undefined && { nome: nome.trim() }),
    ...(cor !== undefined && { cor: cor ?? undefined }),
    atualizadoEm: agora(),
  })
}

/** Exclui a subcategoria; as tarefas continuam na categoria-mãe. */
export async function excluirSubcategoria(id: string) {
  await db.transaction('rw', db.subcategories, db.tasks, db.groupSeries, async () => {
    const subcategoria = await db.subcategories.get(id)
    if (!subcategoria) return
    const semSubcategoria = { subcategoryId: undefined, atualizadoEm: agora() }
    await db.tasks
      .where('categoryId')
      .equals(subcategoria.categoryId)
      .filter((tarefa) => tarefa.subcategoryId === id)
      .modify(semSubcategoria)
    await db.groupSeries
      .where('categoryId')
      .equals(subcategoria.categoryId)
      .filter((serie) => serie.subcategoryId === id)
      .modify(semSubcategoria)
    await db.subcategories.delete(id)
  })
}
