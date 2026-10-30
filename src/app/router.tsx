import { createBrowserRouter, type RouteObject } from 'react-router'
import { IrParaHoje } from '@/app/ir-para-hoje'
import { LayoutApp } from '@/app/layout-app'
import { AnoPage } from '@/features/ano/ano-page'
import { BackupPage } from '@/features/backup/backup-page'
import { CategoriasPage } from '@/features/categorias/categorias-page'
import { DiaPage } from '@/features/dia/dia-page'
import { MesPage } from '@/features/mes/mes-page'
import { EditarProcedimentoPage } from '@/features/procedimentos/editar-procedimento-page'
import { ExecutarProcedimentoPage } from '@/features/procedimentos/executar-procedimento-page'
import { NovoProcedimentoPage } from '@/features/procedimentos/novo-procedimento-page'
import { ProcedimentoPage } from '@/features/procedimentos/procedimento-page'
import { ProcedimentosPage } from '@/features/procedimentos/procedimentos-page'
import { VersaoProcedimentoPage } from '@/features/procedimentos/versao-procedimento-page'
import { SemanaPage } from '@/features/semana/semana-page'

/** Exportadas à parte para os testes montarem o app com um roteador em memória. */
export const rotas: RouteObject[] = [
  {
    element: <LayoutApp />,
    children: [
      { path: '/', element: <IrParaHoje /> },
      { path: '/dia/:data', element: <DiaPage /> },
      { path: '/semana/:data', element: <SemanaPage /> },
      { path: '/mes/:data', element: <MesPage /> },
      { path: '/ano/:ano', element: <AnoPage /> },
      { path: '/procedimentos', element: <ProcedimentosPage /> },
      { path: '/procedimentos/novo', element: <NovoProcedimentoPage /> },
      { path: '/procedimentos/:id', element: <ProcedimentoPage /> },
      { path: '/procedimentos/:id/editar', element: <EditarProcedimentoPage /> },
      { path: '/procedimentos/:id/executar', element: <ExecutarProcedimentoPage /> },
      { path: '/procedimentos/:id/versoes/:versao', element: <VersaoProcedimentoPage /> },
      { path: '/categorias', element: <CategoriasPage /> },
      { path: '/backup', element: <BackupPage /> },
      { path: '*', element: <IrParaHoje /> },
    ],
  },
]

export const router = createBrowserRouter(rotas)
