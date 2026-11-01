import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router'
import { cn } from 'cn'
import type { DataLocal } from '@/db/types'
import { diaEMes } from '@/lib/captura'
import { deDataLocal } from '@/lib/datas'
import { ResumoLateral } from '@/features/inicio/components/resumo-lateral'

interface ProximosDiasProps {
  dias: { data: DataLocal; pendentes: number }[]
}

function textoPendentes(pendentes: number) {
  if (pendentes === 0) return 'Nada pendente'
  return `${pendentes} ${pendentes === 1 ? 'pendente' : 'pendentes'}`
}

/**
 * Os próximos 7 dias numa faixa discreta da coluna lateral: dia da semana, número e, embaixo,
 * quantos pendentes (dia vazio fica apagado). Clicar abre o Dia.
 */
export function ProximosDias({ dias }: ProximosDiasProps) {
  return (
    <ResumoLateral titulo="Próximos 7 dias">
      <ol className="grid grid-cols-7 pt-1.5">
        {dias.map(({ data, pendentes }) => {
          const dia = deDataLocal(data)
          const isVazio = pendentes === 0
          return (
            <li key={data}>
              <Link
                to={`/dia/${data}`}
                title={`${textoPendentes(pendentes)} em ${diaEMes(data)}`}
                aria-label={`${format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })}: ${textoPendentes(pendentes).toLowerCase()}`}
                className={cn(
                  'flex flex-col items-center rounded-md py-1.5 leading-none outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50',
                  isVazio ? 'text-grafite/70' : 'text-tinta',
                )}
              >
                <span className="text-[0.6875rem] text-grafite">
                  {format(dia, 'EEEEEE', { locale: ptBR })}
                </span>
                <span
                  className={cn(
                    'mt-1 text-sm tabular-nums',
                    isVazio ? 'font-normal' : 'font-semibold',
                  )}
                >
                  {format(dia, 'd')}
                </span>
                <span
                  aria-hidden
                  className="mt-1 h-3 text-[0.6875rem] font-semibold text-caneta tabular-nums"
                >
                  {isVazio ? '' : pendentes}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </ResumoLateral>
  )
}
