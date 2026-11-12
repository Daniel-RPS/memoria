import { Outlet, useMatch } from 'react-router'
import { usePreferenciasDoDia } from '@/hooks/use-preferencias-do-dia'
import { cn } from 'cn'
import { BarraLateral } from '@/app/barra-lateral'
import { AplicadorDoTema, AvisosDoApp, FundoDaAparencia } from '@/app/tema-do-layout'
import { useBarraRecolhida } from '@/app/use-barra-recolhida'
import { ProvedorPainelNotas } from '@/components/notas/provedor-painel-notas'
import { AvisoSessaoLonga } from '@/components/aviso-sessao-longa'
import { useViradaDoDia } from '@/hooks/use-virada-do-dia'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAtalhoCaptura } from '@/app/use-atalho-captura'
import { useAtalhoDesfazer } from '@/hooks/use-mover-tarefas'
import { ProvedorDeLembretes } from '@/components/lembretes/provedor-de-lembretes'

/** Moldura comum: barra lateral com as telas e, ao lado, a tela aberta. */
export function LayoutApp() {
  useAtalhoDesfazer()
  useAtalhoCaptura()
  useViradaDoDia()
  const { isRecolhida, handleAlternar } = useBarraRecolhida()
  const isNaSemana = useMatch('/semana/:data') !== null
  const rotaMes = useMatch('/mes/:data')
  const rotaAno = useMatch('/ano/:ano')
  const isNoMesOuAno = rotaMes !== null || rotaAno !== null
  const isNosProcedimentos = useMatch({ path: '/procedimentos', end: false }) !== null
  const isNoDia = useMatch('/dia/:data') !== null
  const isNoInicio = useMatch('/inicio') !== null
  const isNasCategorias = useMatch('/categorias') !== null
  const isNosDados = useMatch({ path: '/dados', end: false }) !== null
  const isNaListaDeNotas = useMatch('/notas') !== null
  // No modo Colunas ou Cartões o Dia precisa de espaço para as colunas/grade.
  const { modo: modoDoDia } = usePreferenciasDoDia()
  const isDiaLargo = isNoDia && (modoDoDia === 'colunas' || modoDoDia === 'cartoes')
  const largura = isNaSemana
    ? 'max-w-[96rem]'
    : isNoMesOuAno || isNoInicio
      ? 'max-w-6xl'
      : isNasCategorias || isNaListaDeNotas || isDiaLargo || isNosDados
        ? 'max-w-5xl'
        : isNosProcedimentos || isNoDia
          ? 'max-w-3xl'
          : 'max-w-2xl'

  return (
    <TooltipProvider delayDuration={300}>
      <ProvedorPainelNotas>
        <ProvedorDeLembretes>
          <AplicadorDoTema />
          <FundoDaAparencia />
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
          <AvisosDoApp />
        </ProvedorDeLembretes>
      </ProvedorPainelNotas>
    </TooltipProvider>
  )
}
