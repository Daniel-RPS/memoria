import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import type { DataLocal } from '@/db/types'
import { deDataLocal, diasEntre, somarDias } from '@/lib/datas'

interface CabecalhoDiaProps {
  data: DataLocal
  hoje: DataLocal
}

const NOMES_RELATIVOS: Record<number, string> = { [-1]: 'ontem', 0: 'hoje', 1: 'amanhã' }

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Número do dia em destaque, dia da semana, mês e navegação entre dias. */
export function CabecalhoDia({ data, hoje }: CabecalhoDiaProps) {
  const dia = deDataLocal(data)
  const diaDaSemana = capitalizar(format(dia, 'EEEE', { locale: ptBR }))
  const mesEAno = format(dia, "MMMM 'de' yyyy", { locale: ptBR })
  const nomeRelativo = NOMES_RELATIVOS[diasEntre(hoje, data)]
  const isHoje = data === hoje

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <h1 className="flex items-end gap-4">
        <span
          className="text-[6rem] leading-[0.78] font-extrabold tracking-[-0.04em] tabular-nums [font-stretch:75%]"
          aria-hidden
        >
          {format(dia, 'd')}
        </span>
        <span className="flex flex-col pb-1">
          <span className="text-xl font-semibold">
            {diaDaSemana}
            {nomeRelativo && <span className="font-normal text-grafite">, {nomeRelativo}</span>}
          </span>
          <span className="text-grafite">
            <span className="sr-only">{format(dia, 'd')} de </span>
            {mesEAno}
          </span>
        </span>
      </h1>

      <nav aria-label="Navegar entre dias" className="flex items-center gap-1">
        <Button asChild variant="ghost" size="icon">
          <Link to={`/dia/${somarDias(data, -1)}`} aria-label="Dia anterior">
            <ChevronLeft />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className={isHoje ? 'pointer-events-none opacity-50' : undefined}
        >
          <Link to={`/dia/${hoje}`} aria-disabled={isHoje} tabIndex={isHoje ? -1 : undefined}>
            Hoje
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon">
          <Link to={`/dia/${somarDias(data, 1)}`} aria-label="Próximo dia">
            <ChevronRight />
          </Link>
        </Button>
      </nav>
    </header>
  )
}
