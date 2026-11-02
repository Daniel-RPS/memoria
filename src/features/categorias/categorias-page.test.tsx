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

  it('cria uma categoria em cada seção e a subcategoria pelo "+"', async () => {
    const usuario = userEvent.setup()
    renderizarCategorias()

    await usuario.click(await screen.findByRole('button', { name: 'Nova categoria em Grupos' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Nova categoria' }), 'Casa{Enter}')
    const grupos = await screen.findByRole('list', { name: 'Categorias de Grupos' })
    expect(await within(grupos).findByRole('button', { name: 'Casa' })).toBeInTheDocument()
    await usuario.keyboard('{Escape}')

    await usuario.click(screen.getByRole('button', { name: 'Nova categoria em Procedimentos' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Nova categoria' }), 'Receitas{Enter}')
    const procedimentos = await screen.findByRole('list', { name: 'Categorias de Procedimentos' })
    expect(
      await within(procedimentos).findByRole('button', { name: 'Receitas' }),
    ).toBeInTheDocument()
    expect(within(grupos).queryByRole('button', { name: 'Receitas' })).not.toBeInTheDocument()
    await waitFor(async () =>
      expect(
        (await db.categories.toArray()).map(({ nome, tipo }) => `${tipo}:${nome}`).sort(),
      ).toEqual(['grupo:Casa', 'procedimento:Receitas']),
    )

    await usuario.click(screen.getByRole('button', { name: 'Nova subcategoria em Casa' }))
    await usuario.type(
      screen.getByRole('textbox', { name: 'Nova subcategoria de Casa' }),
      'Jardim{Enter}',
    )
    const subcategorias = await screen.findByRole('list', { name: 'Subcategorias de Casa' })
    expect(within(subcategorias).getByRole('button', { name: 'Jardim' })).toBeInTheDocument()
  })

  it('avisa quando o nome já existe no mesmo tipo e aceita no outro', async () => {
    const usuario = userEvent.setup()
    await criarCategoria({ nome: 'Casa' })
    renderizarCategorias()

    await usuario.click(await screen.findByRole('button', { name: 'Nova categoria em Grupos' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Nova categoria' }), 'casa{Enter}')
    expect(await screen.findByText('Já existe uma categoria com esse nome.')).toBeInTheDocument()
    await usuario.keyboard('{Escape}')

    await usuario.click(screen.getByRole('button', { name: 'Nova categoria em Procedimentos' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Nova categoria' }), 'casa{Enter}')
    const procedimentos = await screen.findByRole('list', { name: 'Categorias de Procedimentos' })
    expect(await within(procedimentos).findByRole('button', { name: 'casa' })).toBeInTheDocument()
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

  it('ao excluir pelo menu ⋯, diz quantas tarefas ficam sem categoria e não apaga as tarefas', async () => {
    const usuario = userEvent.setup()
    const casa = await criarCategoria({ nome: 'Casa' })
    await criarTarefa({ titulo: 'Podar', data: '2026-10-30', categoryId: casa.id })
    await criarTarefa({ titulo: 'Varrer', data: '2026-10-31', categoryId: casa.id })
    renderizarCategorias()

    await usuario.click(await screen.findByRole('button', { name: 'Mais ações para Casa' }))
    await usuario.click(await screen.findByRole('menuitem', { name: 'Excluir' }))
    expect(
      await screen.findByText('2 tarefas ficam “Sem categoria”; nada é apagado.'),
    ).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Excluir categoria' }))

    await waitFor(async () => expect(await db.categories.count()).toBe(0))
    expect(await db.tasks.count()).toBe(2)
  })

  it('mover para Procedimentos avisa o que fica sem categoria e muda de seção', async () => {
    const usuario = userEvent.setup()
    const casa = await criarCategoria({ nome: 'Casa' })
    await criarTarefa({ titulo: 'Podar', data: '2026-10-30', categoryId: casa.id })
    renderizarCategorias()

    await usuario.click(await screen.findByRole('button', { name: 'Mais ações para Casa' }))
    await usuario.click(await screen.findByRole('menuitem', { name: 'Mover para Procedimentos' }))
    expect(await screen.findByText(/^1 tarefa ficará “Sem categoria”/)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Mover para Procedimentos' }))

    const procedimentos = await screen.findByRole('list', { name: 'Categorias de Procedimentos' })
    expect(await within(procedimentos).findByRole('button', { name: 'Casa' })).toBeInTheDocument()
    expect((await db.tasks.toArray())[0].categoryId).toBeUndefined()
  })

  it('cria com a cor escolhida e mostra o uso de cada categoria', async () => {
    const usuario = userEvent.setup()
    const casa = await criarCategoria({ nome: 'Casa' })
    await criarTarefa({ titulo: 'Podar', data: '2026-10-30', categoryId: casa.id })
    renderizarCategorias()

    await usuario.click(await screen.findByRole('button', { name: 'Nova categoria em Grupos' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Nova categoria' }), 'Trabalho')
    await usuario.click(screen.getByRole('radio', { name: 'Índigo' }))
    await usuario.click(screen.getByRole('button', { name: 'Criar categoria' }))

    await waitFor(async () =>
      expect(await db.categories.toArray()).toEqual(
        expect.arrayContaining([expect.objectContaining({ nome: 'Trabalho', cor: '#5b4fbf' })]),
      ),
    )
    expect(await screen.findByText('1 tarefa')).toBeInTheDocument()
    expect(screen.getByText('Sem uso')).toBeInTheDocument()
  })

  it('cor personalizada pelo campo hex: grava, marca a bolinha e entra nas recentes', async () => {
    const usuario = userEvent.setup()
    await criarCategoria({ nome: 'Casa', cor: '#c8402f' })
    renderizarCategorias()

    await usuario.click(
      await screen.findByRole('button', { name: 'Cor de Casa: Tomate. Trocar cor' }),
    )
    await usuario.click(await screen.findByRole('radio', { name: 'Cor personalizada' }))
    const hex = screen.getByRole('textbox', { name: 'Código hexadecimal da cor' })
    await usuario.clear(hex)
    await usuario.type(hex, '3B82F')
    expect(screen.getByText('Use 6 dígitos, como #3b82f6.')).toBeInTheDocument()
    await usuario.type(hex, '6{Enter}')

    await waitFor(async () => expect((await db.categories.toArray())[0].cor).toBe('#3b82f6'))
    expect(
      await screen.findByRole('radio', { name: 'Cor personalizada #3B82F6', checked: true }),
    ).toBeInTheDocument()
    const recentes = await screen.findByRole('group', { name: 'Cores personalizadas recentes' })
    expect(within(recentes).getByRole('button', { name: 'Usar #3B82F6' })).toBeInTheDocument()
  })

  it('no misturador, setas mudam a cor e Esc cancela sem gravar', async () => {
    const usuario = userEvent.setup()
    await criarCategoria({ nome: 'Casa', cor: '#c8402f' })
    renderizarCategorias()

    await usuario.click(
      await screen.findByRole('button', { name: 'Cor de Casa: Tomate. Trocar cor' }),
    )
    await usuario.click(await screen.findByRole('radio', { name: 'Cor personalizada' }))
    const hex = screen.getByRole('textbox', { name: 'Código hexadecimal da cor' })
    expect(hex).toHaveValue('#c8402f')

    screen.getByRole('slider', { name: 'Matiz' }).focus()
    await usuario.keyboard('{Shift>}{ArrowRight}{/Shift}')
    expect(hex).not.toHaveValue('#c8402f')
    const area = screen.getByRole('slider', { name: 'Saturação e brilho' })
    area.focus()
    await usuario.keyboard('{ArrowDown}')
    expect(area).toHaveAttribute('aria-valuetext', expect.stringMatching(/brilho 77%$/))
    await usuario.keyboard('{Escape}')

    expect(screen.queryByRole('textbox', { name: 'Código hexadecimal da cor' })).toBeNull()
    expect((await db.categories.toArray())[0].cor).toBe('#c8402f')
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
