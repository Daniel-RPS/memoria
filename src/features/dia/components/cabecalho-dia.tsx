import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import type { DataLocal } from '@/db/types'
import { deDataLocal, nomeRelativo, somarDias } from '@/lib/datas'

interface CabecalhoDiaProps {
  data: DataLocal
  hoje: DataLocal
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Número do dia em destaque, dia da semana, mês e navegação entre dias. */
export function CabecalhoDia({ data, hoje }: CabecalhoDiaProps) {
  const dia = deDataLocal(data)
  const diaDaSemana = capitalizar(format(dia, 'EEEE', { locale: ptBR }))
  const mesEAno = format(dia, "MMMM 'de' yyyy", { locale: ptBR })
  const relativo = nomeRelativo(data, hoje)
  const isHoje = data === hoje
  // Mantém o filtro (`?categoria=...`) ao trocar de dia.
  const { search } = useLocation()
  const paraDia = (destino: DataLocal) => ({ pathname: `/dia/${destino}`, search })

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b-2 border-tinta pb-4">
      <h1 className="flex items-end gap-4">
        <span
          className={cn(
            'text-[6rem] leading-[0.78] font-extrabold tracking-[-0.04em] tabular-nums [font-stretch:75%]',
            isHoje && 'text-caneta',
          )}
          aria-hidden
        >
          {format(dia, 'd')}
        </span>
        <span className="flex flex-col pb-1">
          <span className="text-xl font-semibold">
            {diaDaSemana}
            {relativo && <span className="font-normal text-grafite">, {relativo}</span>}
          </span>
          <span className="text-grafite">
            <span className="sr-only">{format(dia, 'd')} de </span>
            {mesEAno}
          </span>
        </span>
      </h1>

      <nav aria-label="Navegar entre dias" className="flex items-center gap-1">
        <Button asChild variant="ghost" size="icon">
          <Link to={paraDia(somarDias(data, -1))} aria-label="Dia anterior">
            <ChevronLeft />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className={isHoje ? 'pointer-events-none opacity-50' : undefined}
        >
          <Link to={paraDia(hoje)} aria-disabled={isHoje} tabIndex={isHoje ? -1 : undefined}>
            Hoje
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon">
          <Link to={paraDia(somarDias(data, 1))} aria-label="Próximo dia">
            <ChevronRight />
          </Link>
        </Button>
      </nav>
    </header>
  )
}
