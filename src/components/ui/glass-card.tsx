import * as React from 'react'
import { cn } from 'cn'

export type GlassCardGlow = 'accent' | 'warning' | 'none'

export interface GlassCardProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Tipo de brilho suave atrás/em volta do cartão:
   * - `accent`: violeta difuso que respira lentamente (Em andamento)
   * - `warning`: laranja difuso de atenção (Atrasadas com itens)
   * - `none`: neutro, apenas a superfície de vidro
   */
  glow?: GlassCardGlow
  /** Tag HTML raiz do cartão (padrão: 'div'). Use 'section' para regiões semânticas. */
  as?: 'div' | 'section' | 'article' | 'aside'
  ref?: React.Ref<HTMLElement>
}

/**
 * Cartão de vidro (glassmorphism) translúcido com reflexo chanfrado superior
 * e suporte a brilho difuso de destaque (accent / warning / none).
 */
export function GlassCard({
  glow = 'none',
  as: Component = 'div',
  className,
  children,
  ref,
  ...props
}: GlassCardProps) {
  return (
    <Component
      ref={ref as React.Ref<HTMLDivElement>}
      data-glow={glow}
      className={cn(
        'relative rounded-lg border border-black/[0.08] dark:border-white/[0.08]',
        'glass-surface transition-all duration-300',
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-[inherit]',
        'before:bg-gradient-to-r before:from-transparent before:via-white/80 dark:before:via-white/25 before:to-transparent',
        glow === 'accent' && 'glow-accent',
        glow === 'warning' && 'glow-warning',
        glow === 'none' && 'glow-none',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
