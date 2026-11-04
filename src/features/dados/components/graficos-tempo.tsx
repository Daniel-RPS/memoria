import { useState } from 'react'
import { cn } from 'cn'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  formatarDuracao,
  formatarDuracaoCurta,
  formatarPercentual,
  type DadosGraficoPorTarefa,
  type FatiaGraficoPizza,
  type MetricasJornadaPeriodo,
} from '@/domain/tempo'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'

interface GraficoPorTarefaProps {
  dados: DadosGraficoPorTarefa
  titulo?: string
}

/**
 * Gráfico — tempo por tarefa: uma barra nítida por tarefa na cor da categoria (ou neutra),
 * ordenada do maior para o menor tempo no período, com comprimento proporcional à maior tarefa.
 * Bordas nítidas, altura fixa (7px), cantos arredondados e cor sólida.
 * Em Hoje/Dia: até 8 tarefas + "+N outras".
 * Em Semana/Mês: Top 5 tarefas.
 */
export function GraficoPorTarefa({ dados, titulo = 'Por tarefa' }: GraficoPorTarefaProps) {
  const corNaTela = useCorNaTela()
  const { itens, categoriasLegenda } = dados
  if (itens.length === 0) return null

  return (
    <section aria-label={titulo} data-grafico-por-tarefa="" className="grid gap-2.5">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-xs font-semibold tracking-tight text-grafite">{titulo}</h3>
        {categoriasLegenda.length > 0 && (
          <div
            data-legenda-categorias=""
            className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-grafite"
          >
            {categoriasLegenda.map((cat) => {
              const cor = cat.cor ? corNaTela(cat.cor) : 'var(--grafite)'
              return (
                <span
                  key={cat.id ?? 'sem-categoria'}
                  data-legenda-item={cat.nome}
                  className="inline-flex items-center gap-1.5"
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cor }}
                  />
                  <span className="text-tinta">{cat.nome}</span>
                </span>
              )
            })}
          </div>
        )}
      </div>

      <ul className="grid gap-2.5">
        {itens.map((item) => {
          const cor = item.cor ? corNaTela(item.cor) : 'var(--grafite)'
          const larguraPct = Math.max(3, Math.min(100, item.proporcao))
          const tituloCompleto = item.nomeGrupo ? `${item.titulo} (${item.nomeGrupo})` : item.titulo

          return (
            <li
              key={item.chave}
              data-barra-tarefa={item.titulo}
              data-proporcao={item.proporcao}
              className="grid grid-cols-[minmax(8rem,16rem)_1fr] items-center gap-3 text-sm"
            >
              <span className="truncate text-tinta" title={tituloCompleto}>
                {item.titulo}
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <div className="relative flex-1 min-w-0 max-w-full">
                  <div
                    data-barra-retangulo=""
                    className="h-[7px] rounded-full transition-all duration-300"
                    style={{
                      width: `${larguraPct}%`,
                      backgroundColor: cor,
                      minWidth: '7px',
                    }}
                  />
                </div>
                <span className="shrink-0 text-xs font-medium whitespace-nowrap text-grafite tabular-nums">
                  {formatarDuracao(item.tempoMs)}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

interface GraficoPizzaCategoriaProps {
  fatias: FatiaGraficoPizza[]
  tempoAtivoTotalMs: number
  metricasJornada: MetricasJornadaPeriodo
  isVisaoDeUmDia: boolean
}

function calcularFatiasComOffset(fatias: FatiaGraficoPizza[], circ: number) {
  let acumulado = 0
  return fatias.map((fatia) => {
    const offset = -(acumulado / 100) * circ
    acumulado += fatia.percentual
    return { ...fatia, offset }
  })
}

/**
 * Gráfico de pizza / rosca minimalista por categoria:
 * - Baseado no tempo REAL trabalhado (jornada − pausas)
 * - Fatias divididas por minuto entre categorias ativas simultaneamente
 * - Centro com tempo ativo trabalhado (ou % e nome no hover)
 * - Legenda com tempo e % (ordenada decrescente)
 * - Linha de jornada e pausas abaixo da legenda
 */
export function GraficoPizzaCategoria({
  fatias,
  tempoAtivoTotalMs,
  metricasJornada,
  isVisaoDeUmDia,
}: GraficoPizzaCategoriaProps) {
  const corNaTela = useCorNaTela()
  const [fatiaHoverId, setFatiaHoverId] = useState<string | null>(null)

  if (fatias.length === 0) return null

  const fatiaHover = fatiaHoverId
    ? fatias.find((f) => (f.id ?? 'sem-categoria') === fatiaHoverId)
    : undefined
  const circ = 2 * Math.PI * 58
  const fatiasComOffset = calcularFatiasComOffset(fatias, circ)

  return (
    <section aria-label="Tempo por categoria" data-grafico-pizza="" className="grid gap-2.5">
      <h3 className="text-xs font-semibold tracking-tight text-grafite">Por categoria</h3>

      <div className="flex flex-col sm:flex-row items-center gap-6 rounded-md border border-pauta bg-papel p-4">
        {/* Rosca SVG */}
        <div className="relative size-36 shrink-0">
          <svg viewBox="0 0 160 160" className="size-full">
            {fatiasComOffset.map((fatia) => {
              const chave = fatia.id ?? 'sem-categoria'
              const cor = fatia.cor ? corNaTela(fatia.cor) : 'var(--grafite)'
              const pct = fatia.percentual
              const dash = (pct / 100) * circ
              const isHovered = fatiaHoverId === chave

              return (
                <Tooltip key={chave}>
                  <TooltipTrigger asChild>
                    <circle
                      cx="80"
                      cy="80"
                      r="58"
                      fill="none"
                      stroke={cor}
                      strokeWidth={isHovered ? 17 : 13}
                      strokeDasharray={`${dash} ${circ - dash}`}
                      strokeDashoffset={fatia.offset}
                      transform="rotate(-90 80 80)"
                      data-fatia-pizza={fatia.nome}
                      className="cursor-pointer transition-all duration-150 outline-none"
                      style={{
                        opacity: fatiaHoverId && !isHovered ? 0.45 : 1,
                        pointerEvents: 'stroke',
                      }}
                      onMouseEnter={() => setFatiaHoverId(chave)}
                      onMouseLeave={() => setFatiaHoverId(null)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {fatia.nome} · {formatarDuracaoCurta(fatia.tempoMs)} do tempo ativo (
                      {Math.round(fatia.percentual)}%) · {formatarDuracaoCurta(fatia.tempoBrutoMs)}{' '}
                      somando as tarefas
                    </p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </svg>

          {/* Centro da rosca */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-1">
            <span
              data-centro-valor=""
              className="text-xl font-bold tracking-tight text-tinta tabular-nums"
            >
              {fatiaHover
                ? formatarPercentual(fatiaHover.percentual)
                : formatarDuracaoCurta(tempoAtivoTotalMs)}
            </span>
            <span data-centro-rotulo="" className="max-w-[96px] truncate text-[11px] text-grafite">
              {fatiaHover ? fatiaHover.nome : 'trabalhadas'}
            </span>
          </div>
        </div>

        {/* Legenda ao lado */}
        <div className="flex min-w-0 flex-1 flex-col gap-2 w-full">
          <ul className="flex min-w-0 flex-1 flex-col gap-1 w-full text-xs">
            {fatias.map((fatia) => {
              const chave = fatia.id ?? 'sem-categoria'
              const cor = fatia.cor ? corNaTela(fatia.cor) : 'var(--grafite)'
              const isHovered = fatiaHoverId === chave

              return (
                <li
                  key={chave}
                  data-legenda-pizza={fatia.nome}
                  onMouseEnter={() => setFatiaHoverId(chave)}
                  onMouseLeave={() => setFatiaHoverId(null)}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-md px-2 py-1 transition-colors cursor-pointer',
                    isHovered
                      ? 'bg-accent text-tinta font-medium'
                      : 'text-grafite hover:text-tinta',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: cor }}
                    />
                    <span className="truncate text-tinta">{fatia.nome}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 tabular-nums">
                    <span className="text-grafite">{formatarDuracao(fatia.tempoMs)}</span>
                    <span className="min-w-[2.75rem] text-right font-semibold text-tinta">
                      {formatarPercentual(fatia.percentual)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>

          <div data-linha-jornada="" className="border-t border-pauta/60 pt-2 text-xs text-grafite">
            {isVisaoDeUmDia ? (
              <span>
                Jornada {metricasJornada.primeiroInicio ?? '00:00'}–
                {metricasJornada.ultimoFim ?? '00:00'} · pausas{' '}
                {formatarDuracaoCurta(metricasJornada.pausasTotalMs)}
              </span>
            ) : (
              <span>
                Jornada {formatarDuracaoCurta(metricasJornada.jornadaTotalMs)} · pausas{' '}
                {formatarDuracaoCurta(metricasJornada.pausasTotalMs)} ·{' '}
                {metricasJornada.diasComAtividade}{' '}
                {metricasJornada.diasComAtividade === 1 ? 'dia' : 'dias'}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
