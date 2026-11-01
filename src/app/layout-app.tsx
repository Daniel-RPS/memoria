import { Outlet, useMatch } from 'react-router'
import { cn } from 'cn'
import { BarraLateral } from '@/app/barra-lateral'
import { useBarraRecolhida } from '@/app/use-barra-recolhida'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAtalhoCaptura } from '@/app/use-atalho-captura'
import { useAtalhoDesfazer } from '@/hooks/use-mover-tarefas'

/** Moldura comum: barra lateral com as telas e, ao lado, a tela aberta. */
export function LayoutApp() {
  useAtalhoDesfazer()
  useAtalhoCaptura()
  const { isRecolhida, handleAlternar } = useBarraRecolhida()
  const isNaSemana = useMatch('/semana/:data') !== null
  const rotaMes = useMatch('/mes/:data')
  const rotaAno = useMatch('/ano/:ano')
  const isNoMesOuAno = rotaMes !== null || rotaAno !== null
  const isNosProcedimentos = useMatch({ path: '/procedimentos', end: false }) !== null
  const isNoDia = useMatch('/dia/:data') !== null
  const isNoInicio = useMatch('/inicio') !== null
  const largura = isNaSemana
    ? 'max-w-[96rem]'
    : isNoMesOuAno || isNoInicio
      ? 'max-w-6xl'
      : isNosProcedimentos || isNoDia
        ? 'max-w-3xl'
        : 'max-w-2xl'

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-dvh bg-nevoa">
        <BarraLateral isRecolhida={isRecolhida} onAlternarRecolhida={handleAlternar} />
        <main className="min-w-0 flex-1">
          <div className={cn('mx-auto px-4 pt-8 pb-16 sm:px-8', largura)}>
            <Outlet />
          </div>
        </main>
      </div>
      {/* Tema fixo claro: o app ainda não tem modo escuro. */}
      <Toaster theme="light" position="bottom-center" />
    </TooltipProvider>
  )
}
