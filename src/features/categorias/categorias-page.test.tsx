import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/db/database'
import { criarCategoria } from '@/db/repositories/category-repository'
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
    await usuario.click(await screen.findByRole('radio', { name: 'Verde' }))

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
      await screen.findByText('2 tarefas continuam no calendário, só que sem categoria.'),
    ).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Excluir categoria' }))

    await waitFor(async () => expect(await db.categories.count()).toBe(0))
    expect(await db.tasks.count()).toBe(2)
  })
})
