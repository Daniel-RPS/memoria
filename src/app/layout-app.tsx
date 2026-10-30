import { Link, Outlet, useMatch } from 'react-router'
import { cn } from 'cn'
import { Toaster } from '@/components/ui/sonner'
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
  const rotaDia = useMatch('/dia/:data')
  const rotaSemana = useMatch('/semana/:data')
  const rotaMes = useMatch('/mes/:data')
  const rotaAno = useMatch('/ano/:ano')
  const isNasCategorias = useMatch('/categorias') !== null
  const isNosProcedimentos = useMatch({ path: '/procedimentos', end: false }) !== null
  // "Semana", "Mês" e "Ano" abrem o período da data que está aberta; "Dia" abre hoje.
  const dataAberta =
    rotaDia?.params.data ?? rotaSemana?.params.data ?? rotaMes?.params.data ?? hoje()
  const anoAberto = rotaAno?.params.ano ?? dataAberta.slice(0, 4)
  const largura = rotaSemana
    ? 'max-w-[96rem]'
    : rotaMes || rotaAno
      ? 'max-w-6xl'
      : isNosProcedimentos
        ? 'max-w-3xl'
        : 'max-w-2xl'

  return (
    <div className="min-h-dvh bg-nevoa">
      <div className={cn('mx-auto px-4 pt-6 pb-16 sm:px-8', largura)}>
        <header className="mb-10 flex items-baseline justify-between gap-4">
          <span className="text-sm font-semibold text-grafite">MemorIA</span>
          <nav aria-label="Telas" className="flex flex-wrap justify-end gap-x-4 gap-y-1">
            <LinkTela para={`/dia/${hoje()}`} isAtiva={rotaDia !== null}>
              Dia
            </LinkTela>
            <LinkTela para={`/semana/${dataAberta}`} isAtiva={rotaSemana !== null}>
              Semana
            </LinkTela>
            <LinkTela para={`/mes/${dataAberta}`} isAtiva={rotaMes !== null}>
              Mês
            </LinkTela>
            <LinkTela para={`/ano/${anoAberto}`} isAtiva={rotaAno !== null}>
              Ano
            </LinkTela>
            <LinkTela para="/procedimentos" isAtiva={isNosProcedimentos}>
              Procedimentos
            </LinkTela>
            <LinkTela para="/categorias" isAtiva={isNasCategorias}>
              Categorias
            </LinkTela>
          </nav>
        </header>
        <Outlet />
      </div>
      {/* Tema fixo claro: o app ainda não tem modo escuro. */}
      <Toaster theme="light" position="bottom-center" />
    </div>
  )
}
