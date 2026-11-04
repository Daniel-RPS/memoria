import { Outlet, useMatch } from 'react-router'
import { usePreferenciasDoDia } from '@/hooks/use-preferencias-do-dia'
import { cn } from 'cn'
import { BarraLateral } from '@/app/barra-lateral'
import { FundoDoApp } from '@/app/fundo-do-app'
import { useAparencia } from '@/app/use-aparencia'
import { useAplicarTema } from '@/app/use-aplicar-tema'
import { useBarraRecolhida } from '@/app/use-barra-recolhida'
import { ProvedorPainelNotas } from '@/components/notas/provedor-painel-notas'
import { AvisoSessaoLonga } from '@/components/aviso-sessao-longa'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAtalhoCaptura } from '@/app/use-atalho-captura'
import { useAtalhoDesfazer } from '@/hooks/use-mover-tarefas'

/** Moldura comum: barra lateral com as telas e, ao lado, a tela aberta. */
export function LayoutApp() {
  useAtalhoDesfazer()
  useAtalhoCaptura()
  useAplicarTema()
  const { tema, fundo } = useAparencia()
  const { isRecolhida, handleAlternar } = useBarraRecolhida()
  const isNaSemana = useMatch('/semana/:data') !== null
  const rotaMes = useMatch('/mes/:data')
  const rotaAno = useMatch('/ano/:ano')
  const isNoMesOuAno = rotaMes !== null || rotaAno !== null
  const isNosProcedimentos = useMatch({ path: '/procedimentos', end: false }) !== null
  const isNoDia = useMatch('/dia/:data') !== null
  const isNoInicio = useMatch('/inicio') !== null
  const isNasCategorias = useMatch('/categorias') !== null
  const isNosDados = useMatch('/dados') !== null
  const isNaListaDeNotas = useMatch('/notas') !== null
  // No modo Colunas o Dia precisa de espaço para as duas seções lado a lado.
  const { modo: modoDoDia } = usePreferenciasDoDia()
  const isDiaEmColunas = isNoDia && modoDoDia === 'colunas'
  const largura = isNaSemana
    ? 'max-w-[96rem]'
    : isNoMesOuAno || isNoInicio
      ? 'max-w-6xl'
      : isNasCategorias || isNaListaDeNotas || isDiaEmColunas || isNosDados
        ? 'max-w-5xl'
        : isNosProcedimentos || isNoDia
          ? 'max-w-3xl'
          : 'max-w-2xl'

  return (
    <TooltipProvider delayDuration={300}>
      <ProvedorPainelNotas>
        <FundoDoApp fundo={fundo} />
        {/* Sem cor de fundo própria: a névoa fica no <html>, com o fundo decorativo por cima. */}
        <div className="flex min-h-dvh">
          <BarraLateral isRecolhida={isRecolhida} onAlternarRecolhida={handleAlternar} />
          <main className="min-w-0 flex-1">
            <div className={cn('mx-auto px-4 pt-8 pb-16 sm:px-8', largura)}>
              <Outlet />
            </div>
          </main>
        </div>
        <AvisoSessaoLonga />
        <Toaster theme={tema === 'escuro' ? 'dark' : 'light'} position="bottom-center" />
      </ProvedorPainelNotas>
    </TooltipProvider>
  )
}
