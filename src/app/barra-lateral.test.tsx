import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { CHAVE_GRUPO_CALENDARIO } from '@/app/use-grupo-calendario-aberto'
import { renderizarApp } from '@/test/renderizar-app'

function navegacao() {
  return screen.getByRole('navigation', { name: 'Telas' })
}

describe('grupo Calendário na barra lateral', () => {
  beforeEach(() => localStorage.clear())

  it('numa visão do calendário, abre com a visão marcada', async () => {
    renderizarApp('/mes/2026-11-01')
    const grupo = await within(navegacao()).findByRole('button', { name: /^Calendário/ })
    expect(grupo).toHaveAttribute('aria-expanded', 'true')
    expect(within(navegacao()).getByRole('link', { name: 'Mês' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(navegacao()).getByRole('link', { name: 'Dia' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('o cabeçalho só abre e fecha; fechado, diz qual visão está aberta', async () => {
    const usuario = userEvent.setup()
    const router = renderizarApp('/mes/2026-11-01')
    const grupo = await within(navegacao()).findByRole('button', { name: /^Calendário/ })

    await usuario.click(grupo)
    expect(grupo).toHaveAttribute('aria-expanded', 'false')
    expect(grupo).toHaveAccessibleName('Calendário · Mês')
    expect(router.state.location.pathname).toBe('/mes/2026-11-01')

    await usuario.keyboard('{Enter}')
    expect(grupo).toHaveAttribute('aria-expanded', 'true')
    expect(grupo).toHaveAccessibleName('Calendário')
  })

  it('fora do calendário vale o estado salvo e abre ao entrar numa visão', async () => {
    localStorage.setItem(CHAVE_GRUPO_CALENDARIO, 'false')
    const router = renderizarApp('/notas')
    const grupo = await within(navegacao()).findByRole('button', { name: /^Calendário/ })
    expect(grupo).toHaveAttribute('aria-expanded', 'false')

    await router.navigate('/dia/2026-11-01')
    await waitFor(() => expect(grupo).toHaveAttribute('aria-expanded', 'true'))
  })

  it('setas andam entre o cabeçalho e as visões', async () => {
    const usuario = userEvent.setup()
    renderizarApp('/dia/2026-11-01')
    const grupo = await within(navegacao()).findByRole('button', { name: /^Calendário/ })
    grupo.focus()

    await usuario.keyboard('{ArrowDown}{ArrowDown}')
    expect(within(navegacao()).getByRole('link', { name: 'Semana' })).toHaveFocus()
    await usuario.keyboard('{End}')
    expect(within(navegacao()).getByRole('link', { name: 'Ano' })).toHaveFocus()
    await usuario.keyboard('{Home}')
    expect(grupo).toHaveFocus()
  })
})
