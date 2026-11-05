import type { ReactNode } from 'react'
import { cn } from 'cn'

interface ResumoLateralProps {
  titulo: ReactNode
  /** Rótulo para acessibilidade caso o título seja um nó complexo (ex.: com ícone/ponto). */
  rotuloAria?: string
  /** Número ou ação discreta à direita do título. */
  extra?: ReactNode
  /** `alerta`: título em laranja suave (Atrasadas). */
  tom?: 'normal' | 'alerta'
  children: ReactNode
}

/** Bloco discreto da coluna lateral do Início: título pequeno sobre um fio e a lista. */
export function ResumoLateral({
  titulo,
  rotuloAria,
  extra,
  tom = 'normal',
  children,
}: ResumoLateralProps) {
  const ariaLabel = rotuloAria ?? (typeof titulo === 'string' ? titulo : undefined)
  return (
    <section aria-label={ariaLabel}>
      <header className="flex items-baseline justify-between gap-3 border-b border-pauta pb-1.5">
        <h2 className={cn('text-sm font-semibold', tom === 'alerta' && 'text-alerta')}>{titulo}</h2>
        {extra}
      </header>
      {children}
    </section>
  )
}
