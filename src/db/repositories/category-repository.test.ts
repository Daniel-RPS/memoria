import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import {
  atualizarSubcategoria,
  contarTarefasDaCategoria,
  criarCategoria,
  criarSubcategoria,
  excluirCategoria,
  excluirSubcategoria,
  listarCategorias,
  proximaCor,
} from '@/db/repositories/category-repository'
import { criarTarefa, definirCategoria } from '@/db/repositories/task-repository'
import { PALETA_CATEGORIAS } from '@/lib/cores'
import { ErroDeValidacao } from '@/lib/erros'

const DIA = '2026-10-30'

describe('category-repository', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('dá a próxima cor livre da paleta a cada categoria nova', async () => {
    const primeira = await criarCategoria({ nome: 'Casa' })
    const segunda = await criarCategoria({ nome: 'Trabalho' })
    expect(primeira.cor).toBe(PALETA_CATEGORIAS[0].hex)
    expect(segunda.cor).toBe(PALETA_CATEGORIAS[1].hex)
    expect(proximaCor(PALETA_CATEGORIAS.map((cor) => ({ cor: cor.hex })))).toBe(
      PALETA_CATEGORIAS[0].hex,
    )
  })

  it('recusa nome repetido, sem diferenciar maiúsculas e acentos', async () => {
    await criarCategoria({ nome: 'Saúde' })
    await expect(criarCategoria({ nome: ' saude ' })).rejects.toBeInstanceOf(ErroDeValidacao)

    const casa = await criarCategoria({ nome: 'Casa' })
    await criarSubcategoria({ categoryId: casa.id, nome: 'Jardim' })
    await expect(criarSubcategoria({ categoryId: casa.id, nome: 'jardim' })).rejects.toThrow(
      'Já existe uma subcategoria com esse nome nesta categoria.',
    )
  })

  it('excluir categoria mantém as tarefas, só tira a categoria, e apaga as subcategorias', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const jardim = await criarSubcategoria({ categoryId: casa.id, nome: 'Jardim' })
    const tarefa = await criarTarefa({
      titulo: 'Podar',
      data: DIA,
      categoryId: casa.id,
      subcategoryId: jardim.id,
    })
    expect(await contarTarefasDaCategoria(casa.id)).toBe(1)

    await excluirCategoria(casa.id)

    const depois = await db.tasks.get(tarefa.id)
    expect(depois?.titulo).toBe('Podar')
    expect(depois?.categoryId).toBeUndefined()
    expect(depois?.subcategoryId).toBeUndefined()
    expect(await db.subcategories.count()).toBe(0)
    expect(await listarCategorias()).toEqual([])
  })

  it('excluir subcategoria deixa a tarefa na categoria-mãe', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const jardim = await criarSubcategoria({ categoryId: casa.id, nome: 'Jardim' })
    const tarefa = await criarTarefa({ titulo: 'Regar', data: DIA })
    await definirCategoria(tarefa.id, { categoryId: casa.id, subcategoryId: jardim.id })

    await excluirSubcategoria(jardim.id)

    const depois = await db.tasks.get(tarefa.id)
    expect(depois?.categoryId).toBe(casa.id)
    expect(depois?.subcategoryId).toBeUndefined()
  })

  it('subcategoria volta ao tom automático com cor null', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const jardim = await criarSubcategoria({ categoryId: casa.id, nome: 'Jardim' })
    await atualizarSubcategoria(jardim.id, { cor: '#2f8a57' })
    expect((await db.subcategories.get(jardim.id))?.cor).toBe('#2f8a57')

    await atualizarSubcategoria(jardim.id, { cor: null })
    expect((await db.subcategories.get(jardim.id))?.cor).toBeUndefined()
  })

  it('definirCategoria sem categoria limpa também a subcategoria', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const jardim = await criarSubcategoria({ categoryId: casa.id, nome: 'Jardim' })
    const tarefa = await criarTarefa({
      titulo: 'Varrer',
      data: DIA,
      categoryId: casa.id,
      subcategoryId: jardim.id,
    })

    await definirCategoria(tarefa.id, {})

    const depois = await db.tasks.get(tarefa.id)
    expect(depois?.categoryId).toBeUndefined()
    expect(depois?.subcategoryId).toBeUndefined()
  })
})
