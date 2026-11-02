import type { ReactNode } from 'react'
import { cn } from 'cn'

interface ResumoLateralProps {
  titulo: string
  /** Número ou ação discreta à direita do título. */
  extra?: ReactNode
  /** `alerta`: título em laranja suave (Atrasadas). */
  tom?: 'normal' | 'alerta'
  children: ReactNode
}

/** Bloco discreto da coluna lateral do Início: título pequeno sobre um fio e a lista. */
export function ResumoLateral({ titulo, extra, tom = 'normal', children }: ResumoLateralProps) {
  return (
    <section aria-label={titulo}>
      <header className="flex items-baseline justify-between gap-3 border-b border-pauta pb-1.5">
        <h2 className={cn('text-sm font-semibold', tom === 'alerta' && 'text-alerta')}>{titulo}</h2>
        {extra}
      </header>
      {children}
    </section>
  )
}
