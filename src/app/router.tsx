import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { LayoutApp } from '@/app/layout-app'
import { AnoPage } from '@/features/ano/ano-page'
import { ArquivadosPage } from '@/features/arquivados/arquivados-page'
import { BackupPage } from '@/features/backup/backup-page'
import { CategoriasPage } from '@/features/categorias/categorias-page'
import { NumerosPage } from '@/features/dados/numeros-page'
import { TempoPage } from '@/features/dados/tempo-page'
import { VisaoGeralPage } from '@/features/dados/visao-geral-page'
import { DiaPage } from '@/features/dia/dia-page'
import { GruposPage } from '@/features/grupos/grupos-page'
import { InicioPage } from '@/features/inicio/inicio-page'
import { MesPage } from '@/features/mes/mes-page'
import { NotaPage } from '@/features/notas/nota-page'
import { NotasPage } from '@/features/notas/notas-page'
import { NotificacoesPage } from '@/features/notificacoes/notificacoes-page'
import { NovoProcedimentoPage } from '@/features/procedimentos/novo-procedimento-page'
import { ProcedimentoPage } from '@/features/procedimentos/procedimento-page'
import { ProcedimentosPage } from '@/features/procedimentos/procedimentos-page'
import { SemanaPage } from '@/features/semana/semana-page'

/** Exportadas à parte para os testes montarem o app com um roteador em memória. */
export const rotas: RouteObject[] = [
  {
    element: <LayoutApp />,
    children: [
      { path: '/', element: <Navigate to="/inicio" replace /> },
      { path: '/inicio', element: <InicioPage /> },
      { path: '/dia/:data', element: <DiaPage /> },
      { path: '/semana/:data', element: <SemanaPage /> },
      { path: '/mes/:data', element: <MesPage /> },
      { path: '/ano/:ano', element: <AnoPage /> },
      { path: '/grupos', element: <GruposPage /> },
      { path: '/notificacoes', element: <NotificacoesPage /> },
      { path: '/procedimentos', element: <ProcedimentosPage /> },
      { path: '/procedimentos/novo', element: <NovoProcedimentoPage /> },
      { path: '/procedimentos/:id', element: <ProcedimentoPage /> },
      { path: '/notas', element: <NotasPage /> },
      { path: '/notas/:id', element: <NotaPage /> },
      { path: '/categorias', element: <CategoriasPage /> },
      { path: '/arquivados', element: <ArquivadosPage /> },
      { path: '/dados', element: <Navigate to="/dados/visao-geral" replace /> },
      { path: '/dados/visao-geral', element: <VisaoGeralPage /> },
      { path: '/dados/numeros', element: <NumerosPage /> },
      { path: '/dados/tempo', element: <TempoPage /> },
      { path: '/backup', element: <BackupPage /> },
      { path: '*', element: <Navigate to="/inicio" replace /> },
    ],
  },
]

// No GitHub Pages o app mora em /memoria/ (`base` do Vite); no dev, na raiz.
export const router = createBrowserRouter(rotas, {
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
})
