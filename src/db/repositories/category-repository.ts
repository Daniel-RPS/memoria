import { db } from '@/db/database'
import type { Category, Subcategory } from '@/db/types'
import { agora, gravarNovaPosicao } from '@/db/repositories/ordenacao'
import { isMesmoNome, montarCategorias, somarUso } from '@/lib/categorias'
import { proximaCor } from '@/lib/cores'
import { ErroDeValidacao } from '@/lib/erros'
import { esquemaNomeCategoria } from '@/lib/esquemas'

/** Nome limpo e válido; senão lança `ErroDeValidacao` com a mensagem para o campo. */
function nomeValido(nome: string) {
  const resultado = esquemaNomeCategoria.safeParse(nome)
  if (!resultado.success) throw new ErroDeValidacao(resultado.error.issues[0].message)
  return resultado.data
}

function maiorOrdem(itens: { ordem: number }[]) {
  return Math.max(0, ...itens.map((item) => item.ordem))
}

/** Todas as categorias com suas subcategorias, na ordem do usuário. */
export async function listarCategorias() {
  const [categorias, subcategorias] = await Promise.all([
    db.categories.toArray(),
    db.subcategories.toArray(),
  ])
  return montarCategorias(categorias, subcategorias)
}

/**
 * Quantas tarefas (de qualquer dia e status), grupos e procedimentos usam cada categoria.
 * Lê só as chaves dos índices, sem carregar os registros.
 */
export async function contarUsoDasCategorias() {
  const [tarefas, grupos, procedimentos] = await Promise.all([
    db.tasks.orderBy('categoryId').keys(),
    db.groupSeries.orderBy('categoryId').keys(),
    db.procedures.orderBy('categoryId').keys(),
  ])
  return somarUso({
    tarefas: tarefas.map(String),
    grupos: grupos.map(String),
    procedimentos: procedimentos.map(String),
  })
}

/** Cria a categoria no fim da lista; sem `cor`, usa a próxima cor livre da paleta. */
export async function criarCategoria(dados: { nome: string; cor?: string }): Promise<Category> {
  const nome = nomeValido(dados.nome)
  return db.transaction('rw', db.categories, async () => {
    const existentes = await db.categories.toArray()
    if (existentes.some((categoria) => isMesmoNome(categoria.nome, nome))) {
      throw new ErroDeValidacao('Já existe uma categoria com esse nome.')
    }
    const momento = agora()
    const categoria: Category = {
      id: crypto.randomUUID(),
      nome,
      cor: dados.cor ?? proximaCor(existentes),
      ordem: maiorOrdem(existentes) + 1,
      criadoEm: momento,
      atualizadoEm: momento,
    }
    await db.categories.add(categoria)
    return categoria
  })
}

export async function atualizarCategoria(id: string, mudancas: { nome?: string; cor?: string }) {
  const nome = mudancas.nome === undefined ? undefined : nomeValido(mudancas.nome)
  await db.transaction('rw', db.categories, async () => {
    if (nome !== undefined) {
      const outras = await db.categories.filter((categoria) => categoria.id !== id).toArray()
      if (outras.some((categoria) => isMesmoNome(categoria.nome, nome))) {
        throw new ErroDeValidacao('Já existe uma categoria com esse nome.')
      }
    }
    await db.categories.update(id, {
      ...(nome !== undefined && { nome }),
      ...(mudancas.cor !== undefined && { cor: mudancas.cor }),
      atualizadoEm: agora(),
    })
  })
}

/** Grava a nova posição de `idMovido` entre as categorias (`idsEmOrdem` já reordenado). */
export async function reordenarCategoria(idsEmOrdem: string[], idMovido: string) {
  await db.transaction('rw', db.categories, () =>
    gravarNovaPosicao(db.categories, idsEmOrdem, idMovido),
  )
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
      await db.procedures.where('categoryId').equals(id).modify(semCategoria)
      await db.subcategories.where('categoryId').equals(id).delete()
      await db.categories.delete(id)
    },
  )
}

/** Cria a subcategoria no fim da categoria. Sem `cor`, usa o tom automático da categoria. */
export async function criarSubcategoria(dados: {
  categoryId: string
  nome: string
  cor?: string
}): Promise<Subcategory> {
  const nome = nomeValido(dados.nome)
  return db.transaction('rw', db.subcategories, async () => {
    const irmas = await db.subcategories.where('categoryId').equals(dados.categoryId).toArray()
    if (irmas.some((subcategoria) => isMesmoNome(subcategoria.nome, nome))) {
      throw new ErroDeValidacao('Já existe uma subcategoria com esse nome nesta categoria.')
    }
    const momento = agora()
    const subcategoria: Subcategory = {
      id: crypto.randomUUID(),
      categoryId: dados.categoryId,
      nome,
      ...(dados.cor ? { cor: dados.cor } : {}),
      ordem: maiorOrdem(irmas) + 1,
      criadoEm: momento,
      atualizadoEm: momento,
    }
    await db.subcategories.add(subcategoria)
    return subcategoria
  })
}

/** `cor: null` volta a usar a variação automática da cor da categoria. */
export async function atualizarSubcategoria(
  id: string,
  mudancas: { nome?: string; cor?: string | null },
) {
  const nome = mudancas.nome === undefined ? undefined : nomeValido(mudancas.nome)
  const { cor } = mudancas
  await db.transaction('rw', db.subcategories, async () => {
    const atual = await db.subcategories.get(id)
    if (!atual) return
    if (nome !== undefined) {
      const irmas = await db.subcategories.where('categoryId').equals(atual.categoryId).toArray()
      if (irmas.some((irma) => irma.id !== id && isMesmoNome(irma.nome, nome))) {
        throw new ErroDeValidacao('Já existe uma subcategoria com esse nome nesta categoria.')
      }
    }
    await db.subcategories.update(id, {
      ...(nome !== undefined && { nome }),
      ...(cor !== undefined && { cor: cor ?? undefined }),
      atualizadoEm: agora(),
    })
  })
}

/** Grava a nova posição de `idMovido` entre as subcategorias de uma categoria. */
export async function reordenarSubcategoria(idsEmOrdem: string[], idMovido: string) {
  await db.transaction('rw', db.subcategories, () =>
    gravarNovaPosicao(db.subcategories, idsEmOrdem, idMovido),
  )
}

/** Exclui a subcategoria; tarefas, grupos e procedimentos continuam na categoria-mãe. */
export async function excluirSubcategoria(id: string) {
  await db.transaction(
    'rw',
    [db.subcategories, db.tasks, db.groupSeries, db.procedures],
    async () => {
      const subcategoria = await db.subcategories.get(id)
      if (!subcategoria) return
      const semSubcategoria = { subcategoryId: undefined, atualizadoEm: agora() }
      const daSubcategoria = (item: { subcategoryId?: string }) => item.subcategoryId === id
      for (const tabela of [db.tasks, db.groupSeries, db.procedures] as const) {
        await tabela
          .where('categoryId')
          .equals(subcategoria.categoryId)
          .filter(daSubcategoria)
          .modify(semSubcategoria)
      }
      await db.subcategories.delete(id)
    },
  )
}
