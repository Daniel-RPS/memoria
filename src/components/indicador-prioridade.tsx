import type { ReactNode } from 'react'
import { Flag } from 'lucide-react'
import { cn } from 'cn'

interface IndicadorPrioridadeProps {
  /** Texto para o leitor de tela e a dica; padrão "Prioridade". */
  rotulo?: string
  /** Semana: bandeira menor. */
  isCompacto?: boolean
  className?: string
}

interface ComBandeiraProps {
  isPrioritario: boolean
  isCompacto?: boolean
  /** Reserva a largura da bandeira mesmo sem prioridade (modo Cartões). */
  isReservado?: boolean
  children: ReactNode
}

/**
 * O título com a bandeira à esquerda (só se for prioridade): os dois ficam juntos mesmo quando
 * o título quebra de linha.
 */
export function ComBandeira({
  isPrioritario,
  isCompacto = false,
  isReservado = false,
  children,
}: ComBandeiraProps) {
  if (isReservado) {
    // Cartões: o espaço da bandeira existe SEMPRE, para todos os títulos começarem no mesmo x.
    return (
      <span className="flex min-w-0 items-start gap-1.5">
        <span className="mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center">
          {isPrioritario && <IndicadorPrioridade />}
        </span>
        {children}
      </span>
    )
  }
  if (!isPrioritario) return <>{children}</>
  return (
    <span className="flex min-w-0 items-start gap-1.5">
      <IndicadorPrioridade
        isCompacto={isCompacto}
        className={isCompacto ? 'mt-[3px]' : 'mt-[5px]'}
      />
      {children}
    </span>
  )
}

/** A bandeira pequena e discreta, na cor de alerta do tema, à esquerda do texto prioritário. */
export function IndicadorPrioridade({
  rotulo = 'Prioridade',
  isCompacto = false,
  className,
}: IndicadorPrioridadeProps) {
  return (
    <span
      data-indicador-prioridade=""
      role="img"
      aria-label={rotulo}
      title={rotulo}
      className={cn('inline-flex shrink-0 items-center text-alerta', className)}
    >
      <Flag aria-hidden className={isCompacto ? 'size-3' : 'size-3.5'} />
    </span>
  )
}
