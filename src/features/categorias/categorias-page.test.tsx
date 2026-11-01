import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/db/database'
import { criarCategoria, criarSubcategoria } from '@/db/repositories/category-repository'
import { criarTarefa } from '@/db/repositories/task-repository'
import { renderizarApp } from '@/test/renderizar-app'

function renderizarCategorias() {
  renderizarApp('/categorias')
}

describe('Página de categorias', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('cria categoria e subcategoria digitando o nome', async () => {
    const usuario = userEvent.setup()
    renderizarCategorias()

    await usuario.type(
      await screen.findByRole('textbox', { name: 'Nova categoria' }),
      'Casa{Enter}',
    )
    const lista = await screen.findByRole('list', { name: 'Categorias' })
    expect(await within(lista).findByRole('button', { name: 'Casa' })).toBeInTheDocument()

    await usuario.type(
      screen.getByRole('textbox', { name: 'Nova subcategoria de Casa' }),
      'Jardim{Enter}',
    )
    const subcategorias = await screen.findByRole('list', { name: 'Subcategorias de Casa' })
    expect(within(subcategorias).getByRole('button', { name: 'Jardim' })).toBeInTheDocument()
  })

  it('avisa quando o nome já existe', async () => {
    const usuario = userEvent.setup()
    await criarCategoria({ nome: 'Casa' })
    renderizarCategorias()

    await usuario.type(
      await screen.findByRole('textbox', { name: 'Nova categoria' }),
      'casa{Enter}',
    )
    expect(await screen.findByText('Já existe uma categoria com esse nome.')).toBeInTheDocument()
  })

  it('troca a cor pela paleta', async () => {
    const usuario = userEvent.setup()
    await criarCategoria({ nome: 'Casa', cor: '#c8402f' })
    renderizarCategorias()

    await usuario.click(
      await screen.findByRole('button', { name: 'Cor de Casa: Tomate. Trocar cor' }),
    )
    const paleta = await screen.findByRole('radiogroup', { name: 'Cor de Casa' })
    await usuario.click(within(paleta).getByRole('radio', { name: 'Verde' }))

    await waitFor(async () => {
      const [casa] = await db.categories.toArray()
      expect(casa.cor).toBe('#2f8a57')
    })
  })

  it('ao excluir, diz quantas tarefas ficam sem categoria e não apaga as tarefas', async () => {
    const usuario = userEvent.setup()
    const casa = await criarCategoria({ nome: 'Casa' })
    await criarTarefa({ titulo: 'Podar', data: '2026-10-30', categoryId: casa.id })
    await criarTarefa({ titulo: 'Varrer', data: '2026-10-31', categoryId: casa.id })
    renderizarCategorias()

    await usuario.click(await screen.findByRole('button', { name: 'Excluir Casa' }))
    expect(
      await screen.findByText('2 tarefas ficam “Sem categoria”; nada é apagado.'),
    ).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Excluir categoria' }))

    await waitFor(async () => expect(await db.categories.count()).toBe(0))
    expect(await db.tasks.count()).toBe(2)
  })

  it('cria no topo com a cor escolhida e mostra o uso de cada categoria', async () => {
    const usuario = userEvent.setup()
    const casa = await criarCategoria({ nome: 'Casa' })
    await criarTarefa({ titulo: 'Podar', data: '2026-10-30', categoryId: casa.id })
    renderizarCategorias()

    const criar = await screen.findByRole('region', { name: 'Criar categoria' })
    await usuario.type(within(criar).getByRole('textbox', { name: 'Nova categoria' }), 'Trabalho')
    await usuario.click(within(criar).getByRole('radio', { name: 'Índigo' }))
    await usuario.click(within(criar).getByRole('button', { name: 'Criar categoria' }))

    await waitFor(async () =>
      expect(await db.categories.toArray()).toEqual(
        expect.arrayContaining([expect.objectContaining({ nome: 'Trabalho', cor: '#5b4fbf' })]),
      ),
    )
    expect(await screen.findByText('1 tarefa')).toBeInTheDocument()
    expect(screen.getByText('Sem uso')).toBeInTheDocument()
  })

  it('excluir subcategoria pede confirmação e a tarefa fica na categoria-mãe', async () => {
    const usuario = userEvent.setup()
    const casa = await criarCategoria({ nome: 'Casa' })
    const jardim = await criarSubcategoria({ categoryId: casa.id, nome: 'Jardim' })
    const tarefa = await criarTarefa({
      titulo: 'Podar',
      data: '2026-10-30',
      categoryId: casa.id,
      subcategoryId: jardim.id,
    })
    renderizarCategorias()

    await usuario.click(await screen.findByRole('button', { name: 'Excluir Jardim' }))
    await usuario.click(await screen.findByRole('button', { name: 'Excluir subcategoria' }))

    await waitFor(async () => expect(await db.subcategories.count()).toBe(0))
    const depois = await db.tasks.get(tarefa.id)
    expect(depois?.categoryId).toBe(casa.id)
    expect(depois?.subcategoryId).toBeUndefined()
  })
})
