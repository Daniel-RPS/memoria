import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ColunaPorDia } from '@/domain/numeros'

/** Altura da área das colunas, em px (o rótulo do eixo fica abaixo). */
const ALTURA_DAS_COLUNAS = 132

/**
 * Colunas empilhadas finas, uma por dia: concluídas embaixo (cor de destaque) e pendentes em
 * cima (cinza neutro). Dia sem tarefa mostra só um traço na base. A dica diz o dia e os números.
 */
export function GraficoPorDia({ colunas }: { colunas: ColunaPorDia[] }) {
  const maior = Math.max(1, ...colunas.map((coluna) => coluna.concluidas + coluna.pendentes))

  return (
    <section aria-label="Por dia" data-grafico-por-dia="" className="grid content-start gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold tracking-tight text-grafite">Por dia</h3>
        <div aria-hidden className="flex items-center gap-3 text-[0.6875rem] text-grafite">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-caneta" />
            Concluídas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-grafite/35" />
            Pendentes
          </span>
        </div>
      </div>

      <div className="flex items-end gap-px border-b border-pauta">
        {colunas.map((coluna) => {
          const total = coluna.concluidas + coluna.pendentes
          return (
            <Tooltip key={coluna.data}>
              <TooltipTrigger asChild>
                <div
                  tabIndex={0}
                  aria-label={coluna.dica}
                  data-coluna-dia={coluna.data}
                  className="group/coluna flex flex-1 cursor-default justify-center rounded-t-sm outline-none focus-visible:ring-2 focus-visible:ring-caneta"
                >
                  <svg
                    aria-hidden
                    width="100%"
                    height={ALTURA_DAS_COLUNAS}
                    viewBox={`0 0 10 ${ALTURA_DAS_COLUNAS}`}
                    preserveAspectRatio="none"
                    className="block max-w-3"
                  >
                    {total === 0 ? (
                      <rect
                        x={0}
                        y={ALTURA_DAS_COLUNAS - 2}
                        width={10}
                        height={2}
                        className="fill-grafite/30"
                      />
                    ) : (
                      <BarraEmpilhada coluna={coluna} maior={maior} />
                    )}
                  </svg>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{coluna.dica}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>

      <div aria-hidden className="-mt-1 flex gap-px">
        {colunas.map((coluna) => (
          <span
            key={coluna.data}
            className="flex-1 text-center text-[0.625rem] leading-none whitespace-nowrap text-grafite tabular-nums"
          >
            {coluna.rotuloDoEixo}
          </span>
        ))}
      </div>
    </section>
  )
}

function BarraEmpilhada({ coluna, maior }: { coluna: ColunaPorDia; maior: number }) {
  const alturaConcluidas = (coluna.concluidas / maior) * ALTURA_DAS_COLUNAS
  const alturaPendentes = (coluna.pendentes / maior) * ALTURA_DAS_COLUNAS
  return (
    <>
      <rect
        x={0}
        y={ALTURA_DAS_COLUNAS - alturaConcluidas - alturaPendentes}
        width={10}
        height={alturaPendentes}
        className="fill-grafite/35 transition-opacity group-hover/coluna:opacity-80 motion-reduce:transition-none"
      />
      <rect
        x={0}
        y={ALTURA_DAS_COLUNAS - alturaConcluidas}
        width={10}
        height={alturaConcluidas}
        className="fill-caneta transition-opacity group-hover/coluna:opacity-80 motion-reduce:transition-none"
      />
    </>
  )
}
