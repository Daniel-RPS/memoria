import { useState, useRef, useEffect, useId, type KeyboardEvent } from 'react'
import { cn } from 'cn'
import type { PontoEvolucaoPorDia } from '@/domain/visaoGeral'
import {
  calcularEixosEvolucao,
  calcularRotulosX,
  calcularSegmentosEvolucao,
  formatarDataTooltipEvolucao,
  gerarAriaLabelEvolucao,
} from './grafico-evolucao-tarefas-calculos'

interface GraficoEvolucaoTarefasProps {
  pontos: PontoEvolucaoPorDia[]
  totalTarefas: number
}

const PADDING_ESQUERDA = 28
const PADDING_DIREITA = 14
const PADDING_SUPERIOR = 16
const PADDING_INFERIOR = 26

export function GraficoEvolucaoTarefas({ pontos, totalTarefas }: GraficoEvolucaoTarefasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [larguraContainer, setLarguraContainer] = useState(300)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [focoTecladoIdx, setFocoTecladoIdx] = useState<number | null>(null)
  const idSvg = useId()
  const gradienteId = `gradiente-area-${idSvg.replace(/:/g, '')}`

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width
        if (w > 0) setLarguraContainer(w)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = pontos.length
  const isVazio = totalTarefas === 0
  const isUmDia = n === 1

  // Determina se cruza anos
  const cruzaAnos =
    n > 1 && pontos[0].dia.slice(0, 4) !== pontos[n - 1].dia.slice(0, 4)

  const escala = calcularEixosEvolucao(pontos)
  const alturaTotal = 208 // Altura do conteúdo interno para igualar ao cartão da rosca
  const alturaUtil = alturaTotal - PADDING_SUPERIOR - PADDING_INFERIOR
  const larguraUtil = Math.max(10, larguraContainer - PADDING_ESQUERDA - PADDING_DIREITA)

  const getX = (idx: number) => {
    if (n <= 1) return PADDING_ESQUERDA + larguraUtil / 2
    return PADDING_ESQUERDA + (idx / (n - 1)) * larguraUtil
  }

  const getY = (val: number) => {
    const frac = escala.tetoY > 0 ? val / escala.tetoY : 0
    return PADDING_SUPERIOR + (1 - frac) * alturaUtil
  }

  const yBase = PADDING_SUPERIOR + alturaUtil

  // Segmentos contínuos (quebrados quando há lacuna entre dias)
  const segmentos = calcularSegmentosEvolucao(pontos)

  // Mapear pontos para seus índices globais
  const indiceGlobalPorDia = new Map<string, number>()
  pontos.forEach((p, idx) => indiceGlobalPorDia.set(p.dia, idx))

  // Gerar caminhos (linha e área) para cada segmento
  const caminhosSegmentos = segmentos.map((seg) => {
    if (seg.length === 0) return { dLinha: '', dArea: '' }
    const coords = seg.map((p) => {
      const idx = indiceGlobalPorDia.get(p.dia) ?? 0
      return { x: getX(idx), y: getY(p.total) }
    })

    const dLinha = coords.reduce((acc, c, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`, '')
    const xInicio = coords[0].x.toFixed(1)
    const xFim = coords[coords.length - 1].x.toFixed(1)
    const dArea = `${dLinha} L ${xFim} ${yBase.toFixed(1)} L ${xInicio} ${yBase.toFixed(1)} Z`

    return { dLinha, dArea, coords }
  })

  // Rótulos do eixo X
  const rotulosX = calcularRotulosX(pontos, larguraUtil, PADDING_ESQUERDA, cruzaAnos)

  // Ponto ativo para hover ou navegação por teclado
  const pontoAtivoIdx = focoTecladoIdx !== null ? focoTecladoIdx : hoverIdx
  const pontoAtivo = pontoAtivoIdx !== null && pontoAtivoIdx >= 0 && pontoAtivoIdx < n ? pontos[pontoAtivoIdx] : null
  const xAtivo = pontoAtivoIdx !== null ? getX(pontoAtivoIdx) : null
  const yAtivo = pontoAtivo !== null ? getY(pontoAtivo.total) : null

  // Navegação por teclado
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (isVazio || isUmDia || n === 0) return
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setFocoTecladoIdx((prev) => (prev === null ? 0 : Math.min(n - 1, prev + 1)))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setFocoTecladoIdx((prev) => (prev === null ? 0 : Math.max(0, prev - 1)))
    } else if (e.key === 'Escape') {
      setFocoTecladoIdx(null)
      setHoverIdx(null)
      containerRef.current?.blur()
    }
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (n === 0 || isVazio) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left

    // Encontra o ponto com X mais próximo
    let melhorIdx = 0
    let menorDist = Infinity
    for (let i = 0; i < n; i++) {
      const px = getX(i)
      const dist = Math.abs(mouseX - px)
      if (dist < menorDist) {
        menorDist = dist
        melhorIdx = i
      }
    }
    setHoverIdx(melhorIdx)
  }

  const ariaLabel = gerarAriaLabelEvolucao(pontos, cruzaAnos)

  return (
    <section aria-labelledby="titulo-evolucao-tarefas" className="flex flex-col gap-3">
      <h3 id="titulo-evolucao-tarefas" className="text-sm font-semibold tracking-tight text-tinta">
        Evolução das tarefas
      </h3>

      <div
        ref={containerRef}
        tabIndex={!isVazio && !isUmDia ? 0 : -1}
        role="img"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        onBlur={() => setFocoTecladoIdx(null)}
        className={cn(
          'relative flex flex-col justify-between rounded-lg border border-pauta bg-papel/50 p-6 outline-none transition-shadow',
          'focus-visible:ring-2 focus-visible:ring-caneta',
          'h-[258px]', // Mesma altura do cartão da rosca (p-6 em cima e embaixo + conteúdo ~208px = 258px)
        )}
      >
        {/* SVG do gráfico */}
        <div className="relative size-full">
          <svg
            className="size-full overflow-visible select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id={gradienteId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--tinta)" stopOpacity="0.12" />
                <stop offset="100%" stopColor="var(--tinta)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Linhas de grade horizontais e rótulos do eixo Y */}
            {escala.ticksY.map((val) => {
              const y = getY(val)
              return (
                <g key={`tick-${val}`}>
                  <line
                    x1={PADDING_ESQUERDA}
                    y1={y}
                    x2={PADDING_ESQUERDA + larguraUtil}
                    y2={y}
                    stroke="var(--grafite)"
                    strokeOpacity="0.15"
                    strokeDasharray={val === 0 ? undefined : '2 2'}
                    strokeWidth={1}
                  />
                  <text
                    x={PADDING_ESQUERDA - 6}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[0.625rem] font-normal fill-grafite/70 select-none tabular-nums"
                  >
                    {val}
                  </text>
                </g>
              )
            })}

            {/* Se total 0: sem linhas, apenas grade e mensagem centralizada */}
            {isVazio ? (
              <text
                x={PADDING_ESQUERDA + larguraUtil / 2}
                y={PADDING_SUPERIOR + alturaUtil / 2}
                textAnchor="middle"
                className="text-sm fill-grafite select-none"
              >
                Nenhuma tarefa neste período.
              </text>
            ) : isUmDia ? (
              /* Período de 1 dia: ponto único */
              <g>
                <circle
                  cx={getX(0)}
                  cy={getY(pontos[0].total)}
                  r={4}
                  className="fill-tinta"
                />
                <text
                  x={PADDING_ESQUERDA + larguraUtil / 2}
                  y={PADDING_SUPERIOR + alturaUtil / 2 + 24}
                  textAnchor="middle"
                  className="text-xs fill-grafite select-none"
                >
                  Escolha 2 ou mais dias para ver a evolução
                </text>
              </g>
            ) : (
              /* Linhas e áreas dos segmentos */
              <>
                {caminhosSegmentos.map((cam, sIdx) => (
                  <g key={`seg-${sIdx}`}>
                    {/* Área sob a linha */}
                    <path d={cam.dArea} fill={`url(#${gradienteId})`} />
                    {/* Linha da série */}
                    <path
                      d={cam.dLinha}
                      fill="none"
                      stroke="var(--tinta)"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                ))}

                {/* Bolinhas nos pontos (até 31 dias) */}
                {n <= 31 &&
                  pontos.map((p, idx) => (
                    <circle
                      key={p.dia}
                      cx={getX(idx)}
                      cy={getY(p.total)}
                      r={3}
                      className="fill-tinta transition-transform duration-75"
                    />
                  ))}

                {/* Guia vertical e ponto destacado no hover / foco */}
                {xAtivo !== null && yAtivo !== null && pontoAtivo !== null && (
                  <g className="pointer-events-none">
                    <line
                      x1={xAtivo}
                      y1={PADDING_SUPERIOR}
                      x2={xAtivo}
                      y2={yBase}
                      stroke="var(--tinta)"
                      strokeOpacity="0.3"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <circle
                      cx={xAtivo}
                      cy={yAtivo}
                      r={5}
                      className="fill-tinta stroke-papel stroke-2"
                    />
                  </g>
                )}
              </>
            )}

            {/* Rótulos do eixo X */}
            {rotulosX.map((rot) => (
              <text
                key={`rot-x-${rot.dia}`}
                x={rot.x}
                y={alturaTotal - 4}
                textAnchor="middle"
                className="text-[0.625rem] font-normal fill-grafite/70 select-none tabular-nums"
              >
                {rot.texto}
              </text>
            ))}
          </svg>

          {/* Tooltip flutuante puro em HTML/CSS para o ponto ativo */}
          {pontoAtivo !== null && xAtivo !== null && yAtivo !== null && !isVazio && (
            <div
              className={cn(
                'pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full px-2.5 py-1.5',
                'rounded-md bg-popover text-popover-foreground text-xs shadow-md border border-pauta',
                'whitespace-nowrap transition-all duration-75',
              )}
              style={{
                left: `${xAtivo}px`,
                top: `${Math.max(18, yAtivo - 8)}px`,
              }}
            >
              {formatarDataTooltipEvolucao(pontoAtivo.dia, pontoAtivo.total)}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
