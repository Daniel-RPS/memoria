import { Link, Outlet, useMatch } from 'react-router'
import { cn } from 'cn'
import { hoje } from '@/lib/datas'

interface LinkTelaProps {
  para: string
  isAtiva: boolean
  children: string
}

function LinkTela({ para, isAtiva, children }: LinkTelaProps) {
  return (
    <Link
      to={para}
      aria-current={isAtiva ? 'page' : undefined}
      className={cn(
        'rounded-sm px-1 py-0.5 text-sm text-grafite hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta',
        isAtiva &&
          'font-semibold text-tinta underline decoration-caneta decoration-2 underline-offset-[6px]',
      )}
    >
      {children}
    </Link>
  )
}

/** Moldura comum: nome do app e navegação entre as telas. */
export function LayoutApp() {
  const isNoDia = useMatch('/dia/:data') !== null
  const isNasCategorias = useMatch('/categorias') !== null

  return (
    <div className="min-h-dvh bg-nevoa">
      <div className="mx-auto max-w-2xl px-4 pt-6 pb-16 sm:px-8">
        <header className="mb-10 flex items-baseline justify-between gap-4">
          <span className="text-sm font-semibold text-grafite">MemorIA</span>
          <nav aria-label="Telas" className="flex gap-4">
            <LinkTela para={`/dia/${hoje()}`} isAtiva={isNoDia}>
              Dia
            </LinkTela>
            <LinkTela para="/categorias" isAtiva={isNasCategorias}>
              Categorias
            </LinkTela>
          </nav>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
