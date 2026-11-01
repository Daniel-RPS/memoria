import { useState } from 'react'
import { Outlet, useMatch } from 'react-router'
import { cn } from 'cn'
import { BarraLateral } from '@/app/barra-lateral'
import { ContextoAreaLateral } from '@/components/barra-lateral/contexto-area-lateral'
import { Toaster } from '@/components/ui/sonner'
import { useAtalhoDesfazer } from '@/hooks/use-mover-tarefas'

/** Moldura comum: barra lateral com as telas e, ao lado, a tela aberta. */
export function LayoutApp() {
  useAtalhoDesfazer()
  const [areaDaPagina, setAreaDaPagina] = useState<HTMLElement | null>(null)
  const isNaSemana = useMatch('/semana/:data') !== null
  const rotaMes = useMatch('/mes/:data')
  const rotaAno = useMatch('/ano/:ano')
  const isNoMesOuAno = rotaMes !== null || rotaAno !== null
  const isNosProcedimentos = useMatch({ path: '/procedimentos', end: false }) !== null
  const isNoDia = useMatch('/dia/:data') !== null
  const largura = isNaSemana
    ? 'max-w-[96rem]'
    : isNoMesOuAno
      ? 'max-w-6xl'
      : isNosProcedimentos || isNoDia
        ? 'max-w-3xl'
        : 'max-w-2xl'

  return (
    <ContextoAreaLateral.Provider value={areaDaPagina}>
      <div className="flex min-h-dvh bg-nevoa">
        <BarraLateral isRecolhida={isNaSemana} onAreaDaPagina={setAreaDaPagina} />
        <main className="min-w-0 flex-1">
          <div className={cn('mx-auto px-4 pt-8 pb-16 sm:px-8', largura)}>
            <Outlet />
          </div>
        </main>
      </div>
      {/* Tema fixo claro: o app ainda não tem modo escuro. */}
      <Toaster theme="light" position="bottom-center" />
    </ContextoAreaLateral.Provider>
  )
}
