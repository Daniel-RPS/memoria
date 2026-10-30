import { createBrowserRouter } from 'react-router'
import { IrParaHoje } from '@/app/ir-para-hoje'
import { DiaPage } from '@/features/dia/dia-page'

export const router = createBrowserRouter([
  { path: '/', element: <IrParaHoje /> },
  { path: '/dia/:data', element: <DiaPage /> },
  { path: '*', element: <IrParaHoje /> },
])
