import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderizarApp } from '@/test/renderizar-app'

describe('barra lateral', () => {
  it('clicar na logo leva ao Início com link acessível', async () => {
    const usuario = userEvent.setup()
    const router = renderizarApp('/notas')
    const linkLogo = screen.getByRole('link', { name: 'MemorIA — ir para o Início' })
    expect(linkLogo).toHaveAttribute('href', '/inicio')

    await usuario.click(linkLogo)
    expect(router.state.location.pathname).toBe('/inicio')
  })

  it('digitar "notas" deixa um único link de nome acessível "Notas" e some o texto dos outros itens; clicar nele navega e limpa o campo', async () => {
    const usuario = userEvent.setup()
    const router = renderizarApp('/inicio')

    const inputBusca = screen.getByRole('searchbox', { name: 'Buscar telas' })
    expect(inputBusca).toBeInTheDocument()

    // Itens padrão visíveis na navegação normal da barra
    const navTelas = screen.getByRole('navigation', { name: 'Telas' })
    expect(within(navTelas).getByText('Início')).toBeInTheDocument()
    expect(within(navTelas).getByText('Notificações')).toBeInTheDocument()

    // Digita "notas"
    await usuario.type(inputBusca, 'notas')

    // Deve sumir o <nav aria-label="Telas"> normal
    expect(screen.queryByRole('navigation', { name: 'Telas' })).not.toBeInTheDocument()

    // Região de resultados deve ter apenas o link "Notas"
    const navResultados = screen.getByRole('navigation', { name: 'Resultados da busca' })
    expect(navResultados).toBeInTheDocument()

    const linksResultados = within(navResultados).getAllByRole('link', { name: 'Notas' })
    expect(linksResultados).toHaveLength(1)
    const linkNotas = linksResultados[0]
    expect(linkNotas).toHaveAttribute('href', '/notas')

    // Clicar nele navega e limpa o campo
    await usuario.click(linkNotas)
    expect(router.state.location.pathname).toBe('/notas')
    expect(inputBusca).toHaveValue('')

    // A barra normal volta
    const navTelasRestaurada = screen.getByRole('navigation', { name: 'Telas' })
    expect(within(navTelasRestaurada).getByText('Início')).toBeInTheDocument()
  })

  it('barra recolhida mostra só o botão da lupa e expande ao clicar', async () => {
    const usuario = userEvent.setup()
    renderizarApp('/inicio')

    // Botão de recolher menu
    const botaoRecolher = screen.getByRole('button', { name: 'Recolher menu' })
    await usuario.click(botaoRecolher)

    // Na barra recolhida, o input não deve existir, apenas o botão Buscar (lupa)
    expect(screen.queryByRole('searchbox', { name: 'Buscar telas' })).not.toBeInTheDocument()
    const botaoLupa = screen.getByRole('button', { name: 'Buscar' })
    expect(botaoLupa).toBeInTheDocument()

    // Ao clicar, expande a barra e foca o input
    await usuario.click(botaoLupa)
    const inputBusca = screen.getByRole('searchbox', { name: 'Buscar telas' })
    expect(inputBusca).toBeInTheDocument()
    expect(inputBusca).toHaveFocus()
  })
})
