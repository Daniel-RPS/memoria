import { cn } from 'cn'
import { SeletorDiasEPeriodos } from '@/components/seletor-dias-e-periodos'
import type { DataLocal } from '@/db/types'
import { resolverDiasDoPeriodo, type PeriodoDeDados } from '@/domain/periodo'

interface FiltroPeriodoDadosProps {
  periodo: PeriodoDeDados
  hoje: DataLocal
  /** Dias com bolinha no calendário (Tempo: com tempo medido; Números e Visão geral: com tarefas). */
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
 * Hoje · Esta semana · Este mês · Escolher… (vários dias e períodos). O mesmo em Visão geral, Números e Tempo.
 */
export function FiltroPeriodoDados({
  periodo,
  hoje,
  diasComDados,
  onMudar,
}: FiltroPeriodoDadosProps) {
  const isEscolherAtivo = periodo.tipo === 'escolher'
  const diasDoPeriodo = resolverDiasDoPeriodo(periodo, hoje)

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

      <SeletorDiasEPeriodos
        diasSelecionados={isEscolherAtivo ? periodo.dias : diasDoPeriodo}
        hoje={hoje}
        diasComDados={diasComDados}
        isAtivo={isEscolherAtivo}
        onAplicar={(dias) => onMudar({ tipo: 'escolher', dias })}
      />
    </div>
  )
}
