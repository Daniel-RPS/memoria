import { createBrowserRouter, type RouteObject } from 'react-router'
import { IrParaHoje } from '@/app/ir-para-hoje'
import { LayoutApp } from '@/app/layout-app'
import { CategoriasPage } from '@/features/categorias/categorias-page'
import { DiaPage } from '@/features/dia/dia-page'
import { SemanaPage } from '@/features/semana/semana-page'

/** Exportadas à parte para os testes montarem o app com um roteador em memória. */
export const rotas: RouteObject[] = [
  {
    element: <LayoutApp />,
    children: [
      { path: '/', element: <IrParaHoje /> },
      { path: '/dia/:data', element: <DiaPage /> },
      { path: '/semana/:data', element: <SemanaPage /> },
      { path: '/categorias', element: <CategoriasPage /> },
      { path: '*', element: <IrParaHoje /> },
    ],
  },
]

export const router = createBrowserRouter(rotas)
