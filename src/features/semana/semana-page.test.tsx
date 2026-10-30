import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/db/database'
import { criarTarefa } from '@/db/repositories/task-repository'
import { renderizarApp } from '@/test/renderizar-app'

// Quinta-feira; a semana vai de segunda 26/10 a domingo 1/11.
const QUINTA = '2026-10-29'

describe('Visão de semana', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('mostra os sete dias de segunda a domingo, com as tarefas em cada dia', async () => {
    await criarTarefa({ titulo: 'Reunião', data: '2026-10-26' })
    await criarTarefa({ titulo: 'Feira', data: '2026-11-01' })
    await criarTarefa({ titulo: 'Fora da semana', data: '2026-11-02' })
    renderizarApp(`/semana/${QUINTA}`)

    expect(await screen.findByRole('heading', { name: /26 de out a 1 de nov/ })).toBeInTheDocument()
    const segunda = await screen.findByRole('list', {
      name: 'Pendentes de segunda-feira, 26 de outubro',
    })
    const domingo = screen.getByRole('list', { name: 'Pendentes de domingo, 1 de novembro' })
    expect(await within(segunda).findByText('Reunião')).toBeInTheDocument()
    expect(within(domingo).getByText('Feira')).toBeInTheDocument()
    expect(screen.queryByText('Fora da semana')).not.toBeInTheDocument()
  })

  it('cria tarefa direto no dia da coluna', async () => {
    const usuario = userEvent.setup()
    renderizarApp(`/semana/${QUINTA}`)

    await usuario.type(
      await screen.findByRole('textbox', { name: 'Nova tarefa em quarta, 28' }),
      'Dentista{Enter}',
    )

    await waitFor(async () => {
      const [tarefa] = await db.tasks.toArray()
      expect(tarefa).toMatchObject({ titulo: 'Dentista', data: '2026-10-28' })
    })
  })

  it('a navegação "Semana" abre a semana do dia que estava aberto', async () => {
    const usuario = userEvent.setup()
    const router = renderizarApp(`/dia/${QUINTA}`)

    await usuario.click(await screen.findByRole('link', { name: 'Semana' }))
    expect(router.state.location.pathname).toBe(`/semana/${QUINTA}`)
    expect(
      await screen.findByRole('list', { name: 'Pendentes de quinta-feira, 29 de outubro' }),
    ).toBeInTheDocument()
  })
})
