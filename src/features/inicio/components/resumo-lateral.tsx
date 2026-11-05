import type { ReactNode } from 'react'
import { cn } from 'cn'
import { GlassCard, type GlassCardGlow } from '@/components/ui/glass-card'

interface ResumoLateralProps {
  titulo: ReactNode
  /** Rótulo para acessibilidade caso o título seja um nó complexo (ex.: com ícone/ponto). */
  rotuloAria?: string
  /** Número ou ação discreta à direita do título. */
  extra?: ReactNode
  /** `alerta`: título em laranja suave (Atrasadas). */
  tom?: 'normal' | 'alerta'
  /** Destaque visual com brilho suave ao fundo ('accent', 'warning' ou 'none'). */
  glow?: GlassCardGlow
  className?: string
  children: ReactNode
}

/** Bloco em cartão de vidro da coluna lateral do Início: título sobre um fio e o conteúdo. */
export function ResumoLateral({
  titulo,
  rotuloAria,
  extra,
  tom = 'normal',
  glow = 'none',
  className,
  children,
}: ResumoLateralProps) {
  const ariaLabel = rotuloAria ?? (typeof titulo === 'string' ? titulo : undefined)
  return (
    <GlassCard as="section" aria-label={ariaLabel} glow={glow} className={cn('p-4', className)}>
      <header className="flex items-baseline justify-between gap-3 border-b border-pauta/60 pb-1.5">
        <h2
          className={cn(
            'text-sm font-semibold tracking-[-0.01em]',
            tom === 'alerta' && 'text-alerta',
          )}
        >
          {titulo}
        </h2>
        {extra}
      </header>
      {children}
    </GlassCard>
  )
}
