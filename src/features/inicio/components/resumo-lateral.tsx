import type { ReactNode } from 'react'

interface ResumoLateralProps {
  titulo: string
  /** Número ou ação discreta à direita do título. */
  extra?: ReactNode
  children: ReactNode
}

/** Bloco discreto da coluna lateral do Início: título pequeno sobre um fio e a lista. */
export function ResumoLateral({ titulo, extra, children }: ResumoLateralProps) {
  return (
    <section aria-label={titulo}>
      <header className="flex items-baseline justify-between gap-3 border-b border-pauta pb-1.5">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        {extra}
      </header>
      {children}
    </section>
  )
}
