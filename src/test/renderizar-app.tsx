import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { rotas } from '@/app/router'

/** Renderiza o app inteiro (layout, avisos e rotas) começando em `caminho`. */
export function renderizarApp(caminho: string) {
  const router = createMemoryRouter(rotas, { initialEntries: [caminho] })
  render(<RouterProvider router={router} />)
  return router
}
