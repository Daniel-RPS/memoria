import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import {
  atualizarCategoria,
  contarUsoDasCategorias,
  criarCategoria,
  criarDeCategoriaDeProcedimento,
  definirIconeDaCategoria,
  excluirCategoria,
  listarCategorias,
  moverCategoriaDeTipo,
  reordenarCategoria,
} from '@/db/repositories/category-repository'
import { criarGrupo } from '@/db/repositories/group-repository'
import { criarProcedimento } from '@/db/repositories/procedure-repository'
import { criarTarefa, definirCategoria } from '@/db/repositories/task-repository'
import { PALETA_CATEGORIAS, proximaCor } from '@/lib/cores'
import { ErroDeValidacao } from '@/lib/erros'
import { sugestoesDeProcedimentos } from '@/lib/categorias'

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
  })

  it('excluir categoria mantém as tarefas e só tira a categoria', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const tarefa = await criarTarefa({ titulo: 'Podar', data: DIA, categoryId: casa.id })
    expect((await contarUsoDasCategorias()).get(casa.id)?.tarefas).toBe(1)

    await excluirCategoria(casa.id)

    const depois = await db.tasks.get(tarefa.id)
    expect(depois?.titulo).toBe('Podar')
    expect(depois?.categoryId).toBeUndefined()
    expect(await listarCategorias()).toEqual([])
  })

  it('definirCategoria sem categoria tira a categoria', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const tarefa = await criarTarefa({ titulo: 'Varrer', data: DIA, categoryId: casa.id })

    await definirCategoria(tarefa.id, {})

    expect((await db.tasks.get(tarefa.id))?.categoryId).toBeUndefined()
  })

  it('recusa nome vazio (só espaços)', async () => {
    await expect(criarCategoria({ nome: '   ' })).rejects.toThrow('Escreva um nome.')
    const casa = await criarCategoria({ nome: 'Casa' })
    await expect(atualizarCategoria(casa.id, { nome: ' ' })).rejects.toBeInstanceOf(ErroDeValidacao)
    expect(await db.categories.count()).toBe(1)
  })

  it('renomear para um nome já usado é recusado; só mudar maiúsculas pode', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const trabalho = await criarCategoria({ nome: 'Trabalho' })
    await expect(atualizarCategoria(trabalho.id, { nome: 'CASA' })).rejects.toThrow(
      'Já existe uma categoria com esse nome.',
    )
    await atualizarCategoria(casa.id, { nome: 'casa' })
    expect((await db.categories.get(casa.id))?.nome).toBe('casa')
  })

  it('cria no fim da lista e com a cor escolhida', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const trabalho = await criarCategoria({ nome: 'Trabalho', cor: '#5b4fbf' })
    expect(trabalho.ordem).toBeGreaterThan(casa.ordem)
    expect(trabalho.cor).toBe('#5b4fbf')
  })

  it('reordenar categorias persiste a ordem', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const saude = await criarCategoria({ nome: 'Saúde' })
    const trabalho = await criarCategoria({ nome: 'Trabalho' })
    await reordenarCategoria([trabalho.id, casa.id, saude.id], trabalho.id)
    expect((await listarCategorias()).map((categoria) => categoria.nome)).toEqual([
      'Trabalho',
      'Casa',
      'Saúde',
    ])
  })

  it('excluir categoria deixa tarefas, grupos e procedimentos sem categoria', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const daCategoria = { categoryId: casa.id }
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
    }
    expect(await db.groupCards.count()).toBe(1)
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

  describe('tipos (Grupo e Procedimento)', () => {
    it('cria em cada tipo; sem tipo, nasce grupo', async () => {
      const casa = await criarCategoria({ nome: 'Casa' })
      const receitas = await criarCategoria({ nome: 'Receitas', tipo: 'procedimento' })
      expect(casa).toMatchObject({ tipo: 'grupo', ordem: 1 })
      expect(receitas).toMatchObject({ tipo: 'procedimento', ordem: 1 })
    })

    it('nome repetido é recusado no mesmo tipo e aceito no outro', async () => {
      await criarCategoria({ nome: 'Github', tipo: 'grupo' })
      await expect(criarCategoria({ nome: 'GITHUB', tipo: 'grupo' })).rejects.toBeInstanceOf(
        ErroDeValidacao,
      )
      const outra = await criarCategoria({ nome: 'github', tipo: 'procedimento' })
      expect(outra.tipo).toBe('procedimento')

      const receitas = await criarCategoria({ nome: 'Receitas', tipo: 'procedimento' })
      await expect(atualizarCategoria(receitas.id, { nome: 'Github' })).rejects.toBeInstanceOf(
        ErroDeValidacao,
      )
      const casa = await criarCategoria({ nome: 'Casa', tipo: 'grupo' })
      await atualizarCategoria(casa.id, { nome: 'Receitas' })
      expect((await db.categories.get(casa.id))?.nome).toBe('Receitas')
    })

    it('reordenar dentro de um tipo não mexe na ordem do outro', async () => {
      const a = await criarCategoria({ nome: 'A', tipo: 'grupo' })
      const b = await criarCategoria({ nome: 'B', tipo: 'grupo' })
      const x = await criarCategoria({ nome: 'X', tipo: 'procedimento' })
      const y = await criarCategoria({ nome: 'Y', tipo: 'procedimento' })
      await reordenarCategoria([b.id, a.id], b.id)

      const categorias = await listarCategorias()
      const nomes = (tipo: string) =>
        categorias.filter((item) => item.tipo === tipo).map((item) => item.nome)
      expect(nomes('grupo')).toEqual(['B', 'A'])
      expect(nomes('procedimento')).toEqual(['X', 'Y'])
      expect((await db.categories.get(x.id))?.ordem).toBe(1)
      expect((await db.categories.get(y.id))?.ordem).toBe(2)
    })

    it('mover de tipo deixa sem categoria os itens que a usavam e vai para o fim do outro tipo', async () => {
      await criarCategoria({ nome: 'Receitas', tipo: 'procedimento' })
      const casa = await criarCategoria({ nome: 'Casa', tipo: 'grupo' })
      const tarefa = await criarTarefa({ titulo: 'Varrer', data: DIA })
      await definirCategoria(tarefa.id, { categoryId: casa.id })
      const card = await criarGrupo({ titulo: 'Mercado', data: DIA, categoryId: casa.id })

      await moverCategoriaDeTipo(casa.id)

      expect(await db.categories.get(casa.id)).toMatchObject({ tipo: 'procedimento', ordem: 2 })
      expect((await db.tasks.get(tarefa.id))?.categoryId).toBeUndefined()
      expect((await db.groupSeries.get(card.seriesId))?.categoryId).toBeUndefined()
    })

    it('mover de volta limpa os procedimentos e recusa nome que já existe no destino', async () => {
      const github = await criarCategoria({ nome: 'Github', tipo: 'procedimento' })
      const procedimento = await criarProcedimento({
        titulo: 'Publicar',
        categoryId: github.id,
        etapas: [],
      })
      await moverCategoriaDeTipo(github.id)
      expect((await db.procedures.get(procedimento.id))?.categoryId).toBeUndefined()
      expect((await db.categories.get(github.id))?.tipo).toBe('grupo')

      const outra = await criarCategoria({ nome: 'github', tipo: 'procedimento' })
      await expect(moverCategoriaDeTipo(outra.id)).rejects.toBeInstanceOf(ErroDeValidacao)
      expect((await db.categories.get(outra.id))?.tipo).toBe('procedimento')
    })
  })

  describe('criarDeCategoriaDeProcedimento', () => {
    it('copia nome, cor e ícone, independente da original', async () => {
      const origem = await criarCategoria({
        nome: 'Cloudflare',
        cor: '#F38020',
        tipo: 'procedimento',
      })
      await definirIconeDaCategoria(origem.id, { tipo: 'marca', valor: 'cloudflare' })

      const copia = await criarDeCategoriaDeProcedimento(origem.id)
      expect(copia).toMatchObject({
        nome: 'Cloudflare',
        cor: '#F38020',
        tipo: 'grupo',
        icone: { tipo: 'marca', valor: 'cloudflare' },
      })
      expect(copia.id).not.toBe(origem.id)
      expect((await db.categories.get(origem.id))?.tipo).toBe('procedimento')
    })

    it('nome já usado em Grupos é recusado; o chip aparece como "já existe"', async () => {
      const origem = await criarCategoria({ nome: 'Automação', tipo: 'procedimento' })
      await criarCategoria({ nome: 'automacao', tipo: 'grupo' })
      await expect(criarDeCategoriaDeProcedimento(origem.id)).rejects.toThrow(ErroDeValidacao)

      const todas = await listarCategorias()
      expect(sugestoesDeProcedimentos(todas, '')).toEqual([
        expect.objectContaining({ isExistente: true }),
      ])
      expect(sugestoesDeProcedimentos(todas, 'auto')).toHaveLength(1)
      expect(sugestoesDeProcedimentos(todas, 'deploy')).toEqual([])
    })
  })
})
