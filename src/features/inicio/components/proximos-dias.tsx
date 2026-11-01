import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router'
import { cn } from 'cn'
import type { DataLocal } from '@/db/types'
import { deDataLocal } from '@/lib/datas'

interface ProximosDiasProps {
  dias: { data: DataLocal; pendentes: number }[]
}

/** Os próximos 7 dias numa faixa: dia da semana, número e quantos pendentes; abre o Dia. */
export function ProximosDias({ dias }: ProximosDiasProps) {
  return (
    <section
      aria-labelledby="titulo-proximos"
      className="rounded-lg border border-pauta bg-papel px-5 pt-4 pb-4"
    >
      <h2
        id="titulo-proximos"
        className="mb-2 border-b border-tinta pb-2 text-lg font-bold tracking-[-0.01em] [font-stretch:85%]"
      >
        Próximos 7 dias
      </h2>
      <ol className="grid grid-cols-7 gap-1">
        {dias.map(({ data, pendentes }) => {
          const dia = deDataLocal(data)
          const descricao = `${format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })}: ${
            pendentes === 0
              ? 'nada pendente'
              : `${pendentes} ${pendentes === 1 ? 'pendente' : 'pendentes'}`
          }`
          return (
            <li key={data}>
              <Link
                to={`/dia/${data}`}
                aria-label={descricao}
                className="flex flex-col items-center rounded-md py-2 outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="text-xs text-grafite">
                  {format(dia, 'EEEEEE', { locale: ptBR })}
                </span>
                <span className="text-xl leading-tight font-extrabold tabular-nums [font-stretch:80%]">
                  {format(dia, 'd')}
                </span>
                <span
                  className={cn(
                    'mt-1 min-w-6 rounded-full px-1.5 text-center text-xs tabular-nums',
                    pendentes > 0
                      ? 'bg-marca-texto font-semibold text-violeta-profundo'
                      : 'text-grafite',
                  )}
                >
                  {pendentes || '–'}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
