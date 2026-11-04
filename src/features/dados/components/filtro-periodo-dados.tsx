import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { ptBR } from 'react-day-picker/locale'
import { cn } from 'cn'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DataLocal } from '@/db/types'
import {
  intervaloDoPeriodoDeDados,
  rotuloDoIntervaloPersonalizado,
  type PeriodoDeDados,
} from '@/domain/tempo'
import { deDataLocal, paraDataLocal } from '@/lib/datas'

interface FiltroPeriodoDadosProps {
  periodo: PeriodoDeDados
  hoje: DataLocal
  onMudar: (novo: PeriodoDeDados) => void
}

const OPCOES_FIXAS = [
  { tipo: 'hoje' as const, rotulo: 'Hoje' },
  { tipo: 'semana' as const, rotulo: 'Esta semana' },
  { tipo: 'mes' as const, rotulo: 'Este mês' },
]

const BOTAO_SEGMENTO =
  'inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-caneta'

/**
 * Filtro de período em botões compactos (segmentado):
 * Hoje · Esta semana · Este mês · Escolher… (intervalo de datas).
 */
export function FiltroPeriodoDados({ periodo, hoje, onMudar }: FiltroPeriodoDadosProps) {
  const [isCalendarioAberto, setIsCalendarioAberto] = useState(false)
  const intervalo = intervaloDoPeriodoDeDados(periodo, hoje)
  const rotuloPersonalizado = rotuloDoIntervaloPersonalizado(periodo, hoje)
  const isPersonalizado = periodo.tipo === 'intervalo'

  return (
    <div
      role="group"
      aria-label="Período"
      className="inline-flex flex-wrap items-center gap-0.5 rounded-md border border-pauta bg-papel p-0.5"
    >
      {OPCOES_FIXAS.map((opcao) => {
        const isAtivo = periodo.tipo === opcao.tipo
        return (
          <button
            key={opcao.tipo}
            type="button"
            aria-pressed={isAtivo}
            onClick={() => onMudar({ tipo: opcao.tipo })}
            className={cn(
              BOTAO_SEGMENTO,
              isAtivo
                ? 'bg-caneta text-primary-foreground'
                : 'text-grafite hover:bg-accent hover:text-tinta',
            )}
          >
            {opcao.rotulo}
          </button>
        )
      })}

      <Popover open={isCalendarioAberto} onOpenChange={setIsCalendarioAberto}>
        <PopoverTrigger
          type="button"
          aria-pressed={isPersonalizado}
          aria-label={
            rotuloPersonalizado ? `Escolher período: ${rotuloPersonalizado}` : 'Escolher…'
          }
          className={cn(
            BOTAO_SEGMENTO,
            isPersonalizado
              ? 'bg-caneta text-primary-foreground'
              : 'text-grafite hover:bg-accent hover:text-tinta',
          )}
        >
          <CalendarDays aria-hidden className="size-3.5" />
          <span>{rotuloPersonalizado ? `Escolher… (${rotuloPersonalizado})` : 'Escolher…'}</span>
        </PopoverTrigger>
        <PopoverContent align="start" collisionPadding={8} className="w-auto p-2">
          <p className="px-2 pt-1 pb-1.5 text-xs text-grafite">
            Clique num dia; clique em outro para fechar o intervalo.
          </p>
          <Calendar
            mode="range"
            locale={ptBR}
            weekStartsOn={1}
            defaultMonth={deDataLocal(intervalo.fim)}
            selected={
              isPersonalizado
                ? { from: deDataLocal(intervalo.inicio), to: deDataLocal(intervalo.fim) }
                : undefined
            }
            onSelect={(selecao, diaClicado) => {
              const recomecar = periodo.tipo === 'intervalo' && periodo.inicio !== periodo.fim
              const inicio = recomecar ? diaClicado : (selecao?.from ?? diaClicado)
              const fim = recomecar ? diaClicado : (selecao?.to ?? inicio)
              onMudar({
                tipo: 'intervalo',
                inicio: paraDataLocal(inicio),
                fim: paraDataLocal(fim),
              })
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
