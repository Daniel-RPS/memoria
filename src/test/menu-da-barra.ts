import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/** Setores da barra lateral que abrem a meia-roda de destinos. */
export type SetorDaBarra = 'Calendário' | 'Organização' | 'Ajustes' | 'Dados'

/**
 * Passa o mouse no setor da barra lateral e devolve o menu (meia-roda) que ele abre. Os destinos são
 * `menuitem` com o nome da tela (ex.: "Semana"); o menu fica num portal, fora da `nav`.
 */
export async function abrirMenuDaBarra(usuario: UserEvent, setor: SetorDaBarra) {
  const navegacao = screen.getByRole('navigation', { name: 'Telas' })
  await usuario.hover(within(navegacao).getByRole('button', { name: setor }))
  return screen.findByRole('menu', { name: setor })
}

/** Abre o setor pela barra lateral e escolhe o destino (ex.: Calendário › Semana). */
export async function escolherNaBarra(usuario: UserEvent, setor: SetorDaBarra, destino: string) {
  const menu = await abrirMenuDaBarra(usuario, setor)
  await usuario.click(within(menu).getByRole('menuitem', { name: destino }))
}
