import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import {
  atualizarCategoria,
  atualizarSubcategoria,
  contarUsoDasCategorias,
  criarCategoria,
  criarSubcategoria,
  excluirCategoria,
  excluirSubcategoria,
  listarCategorias,
  reordenarCategoria,
  reordenarSubcategoria,
} from '@/db/repositories/category-repository'
import { criarGrupo } from '@/db/repositories/group-repository'
import { criarProcedimento } from '@/db/repositories/procedure-repository'
import { criarTarefa, definirCategoria } from '@/db/repositories/task-repository'
import { PALETA_CATEGORIAS, proximaCor } from '@/lib/cores'
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
    expect((await contarUsoDasCategorias()).get(casa.id)?.tarefas).toBe(1)

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

  it('recusa nome vazio (só espaços) em categoria e subcategoria', async () => {
    await expect(criarCategoria({ nome: '   ' })).rejects.toThrow('Escreva um nome.')
    const casa = await criarCategoria({ nome: 'Casa' })
    await expect(criarSubcategoria({ categoryId: casa.id, nome: '' })).rejects.toBeInstanceOf(
      ErroDeValidacao,
    )
    await expect(atualizarCategoria(casa.id, { nome: ' ' })).rejects.toBeInstanceOf(ErroDeValidacao)
    expect(await db.categories.count()).toBe(1)
  })

  it('renomear para um nome já usado no mesmo nível é recusado; em outra categoria pode', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const trabalho = await criarCategoria({ nome: 'Trabalho' })
    await expect(atualizarCategoria(trabalho.id, { nome: 'CASA' })).rejects.toThrow(
      'Já existe uma categoria com esse nome.',
    )
    await atualizarCategoria(casa.id, { nome: 'casa' })
    expect((await db.categories.get(casa.id))?.nome).toBe('casa')

    const jardim = await criarSubcategoria({ categoryId: casa.id, nome: 'Jardim' })
    const contas = await criarSubcategoria({ categoryId: casa.id, nome: 'Contas' })
    await expect(atualizarSubcategoria(contas.id, { nome: 'jardim' })).rejects.toBeInstanceOf(
      ErroDeValidacao,
    )
    await criarSubcategoria({ categoryId: trabalho.id, nome: 'Jardim' })
    expect((await db.subcategories.get(jardim.id))?.nome).toBe('Jardim')
  })

  it('cria no fim da lista e com a cor escolhida', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const trabalho = await criarCategoria({ nome: 'Trabalho', cor: '#5b4fbf' })
    const jardim = await criarSubcategoria({ categoryId: casa.id, nome: 'Jardim' })
    const contas = await criarSubcategoria({ categoryId: casa.id, nome: 'Contas', cor: '#2f8a57' })
    expect(trabalho.ordem).toBeGreaterThan(casa.ordem)
    expect(trabalho.cor).toBe('#5b4fbf')
    expect(contas.ordem).toBeGreaterThan(jardim.ordem)
    expect(jardim.cor).toBeUndefined()
    expect(contas.cor).toBe('#2f8a57')
  })

  it('reordenar categorias e subcategorias persiste a ordem', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const saude = await criarCategoria({ nome: 'Saúde' })
    const trabalho = await criarCategoria({ nome: 'Trabalho' })
    await reordenarCategoria([trabalho.id, casa.id, saude.id], trabalho.id)
    expect((await listarCategorias()).map((categoria) => categoria.nome)).toEqual([
      'Trabalho',
      'Casa',
      'Saúde',
    ])

    const jardim = await criarSubcategoria({ categoryId: casa.id, nome: 'Jardim' })
    const contas = await criarSubcategoria({ categoryId: casa.id, nome: 'Contas' })
    await reordenarSubcategoria([contas.id, jardim.id], contas.id)
    const [, deCasa] = await listarCategorias()
    expect(deCasa.subcategorias.map((subcategoria) => subcategoria.nome)).toEqual([
      'Contas',
      'Jardim',
    ])
  })

  it('excluir categoria deixa tarefas, grupos e procedimentos sem categoria', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const jardim = await criarSubcategoria({ categoryId: casa.id, nome: 'Jardim' })
    const daCategoria = { categoryId: casa.id, subcategoryId: jardim.id }
    const tarefa = await criarTarefa({ titulo: 'Podar', data: DIA, ...daCategoria })
    const card = await criarGrupo({ titulo: 'Quintal', data: DIA, ...daCategoria })
    const procedimento = await criarProcedimento({ titulo: 'Adubar', ...daCategoria, etapas: [] })

    await excluirCategoria(casa.id)

    const serie = await db.groupSeries.get(card.seriesId)
    for (const item of [
      await db.tasks.get(tarefa.id),
      serie,
      await db.procedures.get(procedimento.id),
    ]) {
      expect(item).toBeDefined()
      expect(item?.categoryId).toBeUndefined()
      expect(item?.subcategoryId).toBeUndefined()
    }
    expect(await db.groupCards.count()).toBe(1)
    expect(await db.subcategories.count()).toBe(0)
  })

  it('excluir subcategoria tira só a subcategoria de tarefas, grupos e procedimentos', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const jardim = await criarSubcategoria({ categoryId: casa.id, nome: 'Jardim' })
    const contas = await criarSubcategoria({ categoryId: casa.id, nome: 'Contas' })
    const naJardim = { categoryId: casa.id, subcategoryId: jardim.id }
    const tarefa = await criarTarefa({ titulo: 'Podar', data: DIA, ...naJardim })
    const outra = await criarTarefa({
      titulo: 'Pagar luz',
      data: DIA,
      categoryId: casa.id,
      subcategoryId: contas.id,
    })
    const card = await criarGrupo({ titulo: 'Quintal', data: DIA, ...naJardim })
    const procedimento = await criarProcedimento({ titulo: 'Adubar', ...naJardim, etapas: [] })

    await excluirSubcategoria(jardim.id)

    const serie = await db.groupSeries.get(card.seriesId)
    for (const item of [
      await db.tasks.get(tarefa.id),
      serie,
      await db.procedures.get(procedimento.id),
    ]) {
      expect(item?.categoryId).toBe(casa.id)
      expect(item?.subcategoryId).toBeUndefined()
    }
    expect((await db.tasks.get(outra.id))?.subcategoryId).toBe(contas.id)
  })

  it('conta tarefas, grupos e procedimentos de cada categoria', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const trabalho = await criarCategoria({ nome: 'Trabalho' })
    await criarTarefa({ titulo: 'Varrer', data: DIA, categoryId: casa.id })
    await criarTarefa({ titulo: 'Lavar', data: '2026-11-02', categoryId: casa.id })
    await criarTarefa({ titulo: 'Solta', data: DIA })
    await criarGrupo({ titulo: 'Quintal', data: DIA, categoryId: casa.id })
    await criarGrupo({ titulo: 'Reunião', data: DIA, categoryId: trabalho.id })
    await criarProcedimento({ titulo: 'Relatório', categoryId: trabalho.id, etapas: [] })

    const uso = await contarUsoDasCategorias()
    expect(uso.get(casa.id)).toEqual({ tarefas: 2, grupos: 1, procedimentos: 0 })
    expect(uso.get(trabalho.id)).toEqual({ tarefas: 0, grupos: 1, procedimentos: 1 })
  })
})
