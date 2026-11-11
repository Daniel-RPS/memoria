import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { ptBR } from 'react-day-picker/locale'
import { cn } from 'cn'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DataLocal } from '@/db/types'
import { rotuloDoDiaEscolhido, type PeriodoDeDados } from '@/domain/tempo'
import { deDataLocal, paraDataLocal } from '@/lib/datas'

interface FiltroPeriodoDadosProps {
  periodo: PeriodoDeDados
  hoje: DataLocal
  /** Dias com bolinha no calendário (Tempo: com tempo medido; Números: com tarefas). */
  diasComDados?: Set<DataLocal>
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
 * Hoje · Esta semana · Este mês · Escolher… (dia único). O mesmo nas telas Tempo e Números.
 */
export function FiltroPeriodoDados({
  periodo,
  hoje,
  diasComDados,
  onMudar,
}: FiltroPeriodoDadosProps) {
  const [isCalendarioAberto, setIsCalendarioAberto] = useState(false)
  const isDiaEscolhido = periodo.tipo === 'dia'
  const rotuloDia = rotuloDoDiaEscolhido(periodo)
  const diaSelecionado = periodo.tipo === 'dia' ? periodo.dia : undefined

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
          aria-pressed={isDiaEscolhido}
          aria-label={
            isDiaEscolhido && rotuloDia ? `Dia selecionado: ${rotuloDia}` : 'Escolher um dia'
          }
          className={cn(
            BOTAO_SEGMENTO,
            isDiaEscolhido
              ? 'bg-caneta text-primary-foreground'
              : 'text-grafite hover:bg-accent hover:text-tinta',
          )}
        >
          <CalendarDays aria-hidden className="size-3.5" />
          <span>{rotuloDia ?? 'Escolher…'}</span>
        </PopoverTrigger>
        <PopoverContent align="start" collisionPadding={8} className="w-auto p-2">
          <p className="px-2 pt-1 pb-1.5 text-xs text-grafite">Escolha um dia</p>
          <Calendar
            mode="single"
            locale={ptBR}
            weekStartsOn={1}
            defaultMonth={diaSelecionado ? deDataLocal(diaSelecionado) : deDataLocal(hoje)}
            selected={diaSelecionado ? deDataLocal(diaSelecionado) : undefined}
            disabled={{ after: deDataLocal(hoje) }}
            modifiers={{
              comTempo: (data) => (diasComDados ? diasComDados.has(paraDataLocal(data)) : false),
            }}
            onSelect={(data) => {
              if (!data) return
              const diaFormatado = paraDataLocal(data)
              if (diaFormatado === hoje) {
                onMudar({ tipo: 'hoje' })
              } else {
                onMudar({ tipo: 'dia', dia: diaFormatado })
              }
              setIsCalendarioAberto(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
