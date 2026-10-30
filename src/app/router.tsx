import { createBrowserRouter } from 'react-router'
import { IrParaHoje } from '@/app/ir-para-hoje'
import { LayoutApp } from '@/app/layout-app'
import { CategoriasPage } from '@/features/categorias/categorias-page'
import { DiaPage } from '@/features/dia/dia-page'

export const router = createBrowserRouter([
  {
    element: <LayoutApp />,
    children: [
      { path: '/', element: <IrParaHoje /> },
      { path: '/dia/:data', element: <DiaPage /> },
      { path: '/categorias', element: <CategoriasPage /> },
      { path: '*', element: <IrParaHoje /> },
    ],
  },
])
