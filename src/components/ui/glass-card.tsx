import * as React from 'react'
import { cn } from 'cn'

export type GlassCardBorda = 'padrao' | 'accent' | 'warning'

export interface GlassCardProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Cor da borda fina de 1px:
   * - `accent`: roxo (Em andamento)
   * - `warning`: laranja (Atrasadas com itens)
   * - `padrao`: borda neutra translúcida
   */
  borda?: GlassCardBorda
  /** Tag HTML raiz do cartão (padrão: 'div'). Use 'section' para regiões semânticas. */
  as?: 'div' | 'section' | 'article' | 'aside'
  ref?: React.Ref<HTMLElement>
}

/**
 * Cartão de vidro (glassmorphism) translúcido neutro com reflexo chanfrado superior,
 * sombra suave e opção de borda fina colorida de 1px (accent / warning / padrao).
 */
export function GlassCard({
  borda = 'padrao',
  as: Component = 'div',
  className,
  children,
  ref,
  ...props
}: GlassCardProps) {
  return (
    <Component
      ref={ref as React.Ref<HTMLDivElement>}
      data-borda={borda}
      className={cn(
        'relative rounded-lg border transition-all duration-200',
        borda === 'accent' && 'border-caneta/35 dark:border-caneta/45',
        borda === 'warning' && 'border-alerta/35 dark:border-alerta/45',
        borda === 'padrao' && 'border-black/[0.08] dark:border-white/[0.08]',
        'glass-surface',
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-[inherit]',
        'before:bg-gradient-to-r before:from-transparent before:via-white/80 dark:before:via-white/25 before:to-transparent',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
