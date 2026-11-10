import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface SetasLateraisSemanaProps {
  /** Rota da semana anterior. */
  anterior: string
  /** Rota da próxima semana. */
  proxima: string
  /** A folha da semana, entre as duas calhas das setas. */
  children: ReactNode
}

/**
 * Envolve a folha da Semana com duas calhas finas nas laterais, cada uma com uma seta que
 * acompanha a rolagem (no meio da janela). Em largura estreita as calhas somem e ficam só
 * as setas do cabeçalho.
 */
export function SetasLateraisSemana({ anterior, proxima, children }: SetasLateraisSemanaProps) {
  return (
    <div className="@container/semana relative">
      <div className="@min-[56rem]/semana:px-11">{children}</div>
      <SetaLateral lado="esquerda" para={anterior} rotulo="Semana anterior" />
      <SetaLateral lado="direita" para={proxima} rotulo="Próxima semana" />
    </div>
  )
}

interface SetaLateralProps {
  lado: 'esquerda' | 'direita'
  para: string
  rotulo: string
}

function SetaLateral({ lado, para, rotulo }: SetaLateralProps) {
  const isEsquerda = lado === 'esquerda'
  const Icone = isEsquerda ? ChevronLeft : ChevronRight
  return (
    <div
      className={`absolute inset-y-0 hidden w-11 @min-[56rem]/semana:block ${isEsquerda ? 'left-0' : 'right-0'}`}
    >
      <div className="sticky top-[calc(50dvh-1.125rem)] flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={para}
              aria-label={rotulo}
              className="flex size-9 items-center justify-center rounded-full border border-pauta bg-papel/70 text-grafite opacity-60 shadow-sm backdrop-blur-sm transition-[opacity,color,background-color] hover:bg-papel hover:text-tinta hover:opacity-100 focus-visible:bg-papel focus-visible:text-tinta focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none"
            >
              <Icone className="size-5" aria-hidden />
            </Link>
          </TooltipTrigger>
          <TooltipContent side={isEsquerda ? 'right' : 'left'}>{rotulo}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
