import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/db/database'
import { criarCategoria } from '@/db/repositories/category-repository'
import { criarTarefa, definirConclusao } from '@/db/repositories/task-repository'
import { renderizarApp } from '@/test/renderizar-app'

describe('Visão de mês', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('mostra o mês de segunda a domingo, com as tarefas no dia certo', async () => {
    await criarTarefa({ titulo: 'Dentista', data: '2026-10-14' })
    await criarTarefa({ titulo: 'Vizinho de setembro', data: '2026-09-28' })
    renderizarApp('/mes/2026-10-20')

    expect(await screen.findByRole('heading', { name: /outubro\s*2026/i })).toBeInTheDocument()
    const dias = await screen.findByRole('list', { name: 'Dias do mês' })
    expect(within(dias).getAllByRole('listitem')).toHaveLength(35)

    const dia14 = within(dias).getByRole('listitem', { name: /^quarta-feira, 14 de outubro/ })
    expect(await within(dia14).findByText('Dentista')).toBeInTheDocument()
    const dia28 = within(dias).getByRole('listitem', { name: /^segunda-feira, 28 de setembro/ })
    expect(within(dia28).getByText('Vizinho de setembro')).toBeInTheDocument()
  })

  it('mostra até 3 tarefas e resume o resto e as concluídas', async () => {
    for (const titulo of ['A', 'B', 'C', 'D', 'E']) {
      await criarTarefa({ titulo, data: '2026-10-08' })
    }
    const feita = await criarTarefa({ titulo: 'Feita', data: '2026-10-08' })
    await definirConclusao(feita.id, true)
    renderizarApp('/mes/2026-10-08')

    const dia = await screen.findByRole('listitem', {
      name: 'quinta-feira, 8 de outubro: 5 pendentes, 1 concluída',
    })
    expect(within(dia).getByText('A')).toBeInTheDocument()
    expect(within(dia).queryByText('D')).not.toBeInTheDocument()
    expect(within(dia).getByText('+2')).toBeInTheDocument()
  })

  it('a faixa do chip usa a cor da categoria', async () => {
    const casa = await criarCategoria({ nome: 'Casa', cor: '#2f8a57' })
    await criarTarefa({ titulo: 'Regar', data: '2026-10-02', categoryId: casa.id })
    renderizarApp('/mes/2026-10-02')

    const chip = await screen.findByText('Regar')
    expect(chip.parentElement).toHaveStyle({ borderLeftColor: '#2f8a57' })
  })

  it('o número do dia abre a visão do dia', async () => {
    const usuario = userEvent.setup()
    const router = renderizarApp('/mes/2026-10-01')

    await usuario.click(
      await screen.findByRole('link', { name: 'Abrir sexta-feira, 30 de outubro' }),
    )
    expect(router.state.location.pathname).toBe('/dia/2026-10-30')
  })

  it('navega para o mês seguinte atravessando o ano', async () => {
    const usuario = userEvent.setup()
    const router = renderizarApp('/mes/2026-12-10')

    await usuario.click(await screen.findByRole('link', { name: 'Próximo mês' }))
    expect(router.state.location.pathname).toBe('/mes/2027-01-01')
    expect(await screen.findByRole('heading', { name: /janeiro\s*2027/i })).toBeInTheDocument()
  })
})

describe('Visão de ano', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('mostra os 12 meses e descreve cada dia com tarefas', async () => {
    await criarTarefa({ titulo: 'A', data: '2026-03-10' })
    await criarTarefa({ titulo: 'B', data: '2026-03-10' })
    renderizarApp('/ano/2026')

    expect(await screen.findByRole('heading', { name: '2026' })).toBeInTheDocument()
    const marco = await screen.findByRole('region', { name: 'março' })
    // Só as regiões de mês (a área de avisos do Sonner também é uma região).
    const nomesDeMes =
      /^(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)$/
    expect(screen.getAllByRole('region', { name: nomesDeMes })).toHaveLength(12)
    expect(
      await within(marco).findByRole('link', { name: /^10 de março: 2 pendentes/ }),
    ).toBeInTheDocument()
    expect(
      within(marco).getByRole('link', { name: '11 de março: nada marcado' }),
    ).toBeInTheDocument()
  })

  it('o nome do mês abre a visão de mês; ano inválido volta para o atual', async () => {
    const usuario = userEvent.setup()
    const router = renderizarApp('/ano/2026')

    await usuario.click(await screen.findByRole('link', { name: 'julho' }))
    expect(router.state.location.pathname).toBe('/mes/2026-07-01')

    await router.navigate('/ano/abc')
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/ano\/\d{4}$/))
  })

  it('"Mês" e "Ano" na navegação abrem o período do dia aberto', async () => {
    const usuario = userEvent.setup()
    const router = renderizarApp('/dia/2025-06-15')

    await usuario.click(await screen.findByRole('link', { name: 'Mês' }))
    expect(router.state.location.pathname).toBe('/mes/2025-06-15')
    await usuario.click(await screen.findByRole('link', { name: 'Ano' }))
    expect(router.state.location.pathname).toBe('/ano/2025')
  })
})
