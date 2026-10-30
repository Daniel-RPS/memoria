import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { db } from '@/db/database'
import { criarTarefa } from '@/db/repositories/task-repository'
import { DiaPage } from '@/features/dia/dia-page'
import { hoje, somarDias } from '@/lib/datas'

function renderizarDia(data: string) {
  const router = createMemoryRouter([{ path: '/dia/:data', element: <DiaPage /> }], {
    initialEntries: [`/dia/${data}`],
  })
  render(<RouterProvider router={router} />)
  return router
}

describe('Visão do dia', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    window.localStorage.clear()
  })

  it('cria tarefa pela linha "Nova tarefa" e mantém o campo pronto para a próxima', async () => {
    const usuario = userEvent.setup()
    renderizarDia(hoje())

    const campo = screen.getByRole('textbox', { name: 'Nova tarefa' })
    await usuario.type(campo, 'Comprar café{Enter}')

    const pendentes = await screen.findByRole('list', { name: 'Pendentes' })
    expect(within(pendentes).getByText('Comprar café')).toBeInTheDocument()
    await waitFor(() => expect(campo).toHaveValue(''))
  })

  it('não perde tarefas digitadas em sequência rápida', async () => {
    const usuario = userEvent.setup()
    renderizarDia(hoje())

    const campo = screen.getByRole('textbox', { name: 'Nova tarefa' })
    await usuario.type(campo, 'Primeira{Enter}Segunda{Enter}Terceira{Enter}')

    const pendentes = await screen.findByRole('list', { name: 'Pendentes' })
    await waitFor(() =>
      expect(
        within(pendentes)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(['Primeira', 'Segunda', 'Terceira']),
    )
  })

  it('concluir move a tarefa para o grupo "Concluídas", que começa recolhido', async () => {
    const usuario = userEvent.setup()
    await criarTarefa({ titulo: 'Regar plantas', data: hoje() })
    renderizarDia(hoje())

    await usuario.click(await screen.findByRole('checkbox', { name: 'Concluir Regar plantas' }))

    const grupo = await screen.findByRole('button', { name: 'Concluídas (1)' })
    expect(grupo).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list', { name: 'Pendentes' })).not.toBeInTheDocument()

    await usuario.click(grupo)
    const concluidas = screen.getByRole('list', { name: 'Concluídas' })
    expect(
      within(concluidas).getByRole('checkbox', { name: 'Desmarcar Regar plantas' }),
    ).toBeChecked()
  })

  it('mostra há quantos dias a tarefa está pendente', async () => {
    await criarTarefa({ titulo: 'Ligar para o banco', data: somarDias(hoje(), -3) })
    renderizarDia(somarDias(hoje(), -3))

    expect(await screen.findByText('pendente há 3 dias')).toBeInTheDocument()
  })

  it('volta para hoje quando a data da URL é inválida', async () => {
    const router = renderizarDia('2026-02-31')
    await waitFor(() => expect(router.state.location.pathname).toBe(`/dia/${hoje()}`))
  })
})
