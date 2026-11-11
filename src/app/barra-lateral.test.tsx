import { screen } from '@testing-library/react'
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
})
