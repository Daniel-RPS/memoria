import { useState, useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from 'cn'
import type { ContagemPorClasse } from '@/domain/numeros'
import {
  COR_CONCLUIDAS,
  COR_EM_ABERTO,
  COR_NAO_CONCLUIDAS,
} from '@/features/dados/components/cores-dos-numeros'

interface GraficoRoscaConcluidasProps {
  contagem: ContagemPorClasse
  totalTarefas: number
  percentualConcluidas: number
  percentualNaoConcluidas: number
  percentualEmAberto: number
}

interface FatiaRosca {
  id: 'concluidas' | 'naoConcluidas' | 'emAberto'
  nome: string
  quantidade: number
  percentual: number
  corSvg: string
  corBolinha: string
  dica: string
}

export function GraficoRoscaConcluidas({
  contagem,
  totalTarefas,
  percentualConcluidas,
  percentualNaoConcluidas,
  percentualEmAberto,
}: GraficoRoscaConcluidasProps) {
  const [fatiaHoverId, setFatiaHoverId] = useState<string | null>(null)

  // Diâmetro ~160px: viewBox 0 0 160 160.
  // Raio r = 72, espessura strokeWidth = 16.
  // Circunferência = 2 * PI * 72 ≈ 452.3893421169302
  const r = 72
  const circ = 2 * Math.PI * r

  const fatias: FatiaRosca[] = useMemo(() => {
    return [
      {
        id: 'concluidas',
        nome: 'Concluídas',
        quantidade: contagem.concluidas,
        percentual: percentualConcluidas,
        corSvg: 'var(--caneta)',
        corBolinha: COR_CONCLUIDAS.fundo,
        dica: `${contagem.concluidas} concluídas · ${percentualConcluidas}%`,
      },
      {
        id: 'naoConcluidas',
        nome: 'Não concluídas',
        quantidade: contagem.naoConcluidas,
        percentual: percentualNaoConcluidas,
        corSvg: 'color-mix(in srgb, var(--alerta) 70%, transparent)',
        corBolinha: COR_NAO_CONCLUIDAS.fundo,
        dica: `${contagem.naoConcluidas} não concluídas · ${percentualNaoConcluidas}%`,
      },
      {
        id: 'emAberto',
        nome: 'Em aberto',
        quantidade: contagem.emAberto,
        percentual: percentualEmAberto,
        corSvg: 'color-mix(in srgb, var(--grafite) 25%, transparent)',
        corBolinha: COR_EM_ABERTO.fundo,
        dica: `${contagem.emAberto} em aberto · ${percentualEmAberto}%`,
      },
    ]
  }, [contagem, percentualConcluidas, percentualNaoConcluidas, percentualEmAberto])

  // Se período sem tarefas: rosca vazia (só trilho neutro)
  const isVazio = totalTarefas === 0

  // Cálculo dos segmentos com vão pequeno
  // Vão pequeno: ex.: 3 px por corte entre segmentos existentes
  const fatiasAtivas = fatias.filter((f) => f.quantidade > 0)
  const qtdFatiasAtivas = fatiasAtivas.length
  const gapPx = qtdFatiasAtivas > 1 ? 3 : 0
  const totalGapPx = qtdFatiasAtivas * gapPx
  const circUtil = circ - totalGapPx

  let acumuladoOffset = 0
  const fatiasComOffset = fatiasAtivas.map((f) => {
    const fracao = f.quantidade / totalTarefas
    const dashLength = Math.max(0, fracao * circUtil)
    const offset = -acumuladoOffset
    acumuladoOffset += dashLength + gapPx
    return {
      ...f,
      dashLength,
      offset,
    }
  })

  return (
    <section aria-labelledby="titulo-concluidas-vs-nao" className="grid gap-3">
      <h3 id="titulo-concluidas-vs-nao" className="text-sm font-semibold tracking-tight text-tinta">
        Concluídas × não concluídas
      </h3>

      <div className="flex flex-col sm:flex-row items-center gap-8 rounded-lg border border-pauta bg-papel/50 p-6">
        {/* Rosca SVG */}
        <div className="relative size-40 shrink-0">
          <svg viewBox="0 0 160 160" className="size-full">
            {/* Trilho neutro de fundo */}
            <circle
              cx="80"
              cy="80"
              r={r}
              fill="none"
              strokeWidth={16}
              className="stroke-grafite/15"
            />

            {!isVazio &&
              fatiasComOffset.map((fatia) => {
                const isHovered = fatiaHoverId === fatia.id
                return (
                  <Tooltip key={fatia.id}>
                    <TooltipTrigger asChild>
                      <circle
                        cx="80"
                        cy="80"
                        r={r}
                        fill="none"
                        stroke={fatia.corSvg}
                        strokeWidth={isHovered ? 18 : 16}
                        strokeDasharray={`${fatia.dashLength} ${circ - fatia.dashLength}`}
                        strokeDashoffset={fatia.offset}
                        transform="rotate(-90 80 80)"
                        className="cursor-pointer transition-all duration-150 outline-none"
                        style={{
                          opacity: fatiaHoverId && !isHovered ? 0.5 : 1,
                          pointerEvents: 'stroke',
                        }}
                        onMouseEnter={() => setFatiaHoverId(fatia.id)}
                        onMouseLeave={() => setFatiaHoverId(null)}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{fatia.dica}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
          </svg>

          {/* Centro da rosca */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-1">
            <span className="text-2xl font-bold tracking-tight text-tinta tabular-nums">
              {isVazio ? '—' : `${percentualConcluidas}%`}
            </span>
            <span className="text-xs text-grafite">concluídas</span>
          </div>
        </div>

        {/* Legenda à direita */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          {isVazio ? (
            <p className="text-sm text-grafite">Nenhuma tarefa neste período.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-xs">
              {fatias.map((fatia) => {
                const isHovered = fatiaHoverId === fatia.id
                return (
                  <li
                    key={fatia.id}
                    onMouseEnter={() => setFatiaHoverId(fatia.id)}
                    onMouseLeave={() => setFatiaHoverId(null)}
                    className={cn(
                      'flex items-center justify-between gap-4 rounded-md px-2.5 py-1.5 transition-colors cursor-pointer',
                      isHovered
                        ? 'bg-accent text-tinta font-medium'
                        : 'text-grafite hover:text-tinta',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden
                        className={cn('size-2.5 shrink-0 rounded-full', fatia.corBolinha)}
                      />
                      <span className="truncate text-tinta">{fatia.nome}</span>
                    </div>
                    <span className="shrink-0 tabular-nums font-semibold text-tinta">
                      {fatia.quantidade} · {fatia.percentual}%
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
