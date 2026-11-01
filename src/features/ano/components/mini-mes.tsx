import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router'
import { cn } from 'cn'
import type { DataLocal } from '@/db/types'
import {
  iniciaisDosDias,
  intensidade,
  isMesmoMes,
  semanasDoMes,
  type ResumoDoDia,
} from '@/lib/calendario'
import { deDataLocal } from '@/lib/datas'
import { TONS } from '@/features/ano/tons'

interface MiniMesProps {
  inicio: DataLocal
  hoje: DataLocal
  resumo: Map<DataLocal, ResumoDoDia>
}

function descrever(resumo: ResumoDoDia | undefined) {
  if (!resumo) return 'nada marcado'
  const partes = []
  if (resumo.pendentes) {
    partes.push(resumo.pendentes === 1 ? '1 pendente' : `${resumo.pendentes} pendentes`)
  }
  if (resumo.atrasadas) {
    partes.push(resumo.atrasadas === 1 ? '1 atrasada' : `${resumo.atrasadas} atrasadas`)
  }
  if (resumo.concluidas) {
    partes.push(resumo.concluidas === 1 ? '1 concluída' : `${resumo.concluidas} concluídas`)
  }
  return partes.join(', ')
}

/** Mês pequeno da visão de ano: tom pela quantidade de tarefas e marca nos dias com atraso. */
export function MiniMes({ inicio, hoje, resumo }: MiniMesProps) {
  const nome = format(deDataLocal(inicio), 'MMMM', { locale: ptBR })

  return (
    <section aria-label={nome}>
      <h2>
        <Link
          to={`/mes/${inicio}`}
          className="text-lg font-bold capitalize hover:text-caneta focus-visible:outline-2 focus-visible:outline-caneta"
        >
          {nome}
        </Link>
      </h2>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-xs">
        {iniciaisDosDias().map((dia) => (
          <span key={dia.completa} aria-hidden className="pb-1 text-grafite capitalize">
            {dia.curta.charAt(0)}
          </span>
        ))}
        {semanasDoMes(inicio)
          .flat()
          .map((data) => {
            if (!isMesmoMes(data, inicio)) return <span key={data} aria-hidden />
            const doDia = resumo.get(data)
            const tom = intensidade((doDia?.pendentes ?? 0) + (doDia?.concluidas ?? 0))
            const isHoje = data === hoje
            return (
              <Link
                key={data}
                to={`/dia/${data}`}
                aria-label={`${format(deDataLocal(data), "d 'de' MMMM", { locale: ptBR })}: ${descrever(doDia)}`}
                className={cn(
                  'relative flex aspect-square items-center justify-center rounded-sm tabular-nums hover:ring-1 hover:ring-tinta focus-visible:outline-2 focus-visible:outline-caneta',
                  TONS[tom],
                  isHoje && 'font-bold ring-2 ring-tinta',
                )}
              >
                {Number(data.slice(8))}
                {(doDia?.atrasadas ?? 0) > 0 && (
                  <span
                    aria-hidden
                    className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-tinta ring-1 ring-papel"
                  />
                )}
              </Link>
            )
          })}
      </div>
    </section>
  )
}
