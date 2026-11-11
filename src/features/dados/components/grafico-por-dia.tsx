import { cn } from 'cn'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ColunaPorDia } from '@/domain/numeros'
import {
  COR_CONCLUIDAS,
  COR_EM_ABERTO,
  COR_NAO_CONCLUIDAS,
} from '@/features/dados/components/cores-dos-numeros'

/** Altura da área das colunas, em px (o rótulo do eixo fica abaixo). */
const ALTURA_DAS_COLUNAS = 132

const LEGENDA = [
  { rotulo: 'Concluídas', cor: COR_CONCLUIDAS.fundo },
  { rotulo: 'Não concluídas', cor: COR_NAO_CONCLUIDAS.fundo },
  { rotulo: 'Em aberto', cor: COR_EM_ABERTO.fundo },
]

function totalDa(coluna: ColunaPorDia) {
  return coluna.concluidas + coluna.naoConcluidas + coluna.emAberto
}

/**
 * Colunas empilhadas finas, uma por dia: concluídas embaixo (destaque), não concluídas no meio
 * (âmbar) e em aberto em cima (cinza neutro). Dia sem tarefa mostra só um traço na base. A dica
 * diz o dia e os números.
 */
export function GraficoPorDia({ colunas }: { colunas: ColunaPorDia[] }) {
  const maior = Math.max(1, ...colunas.map(totalDa))

  return (
    <section aria-label="Por dia" data-grafico-por-dia="" className="grid content-start gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 className="text-xs font-semibold tracking-tight text-grafite">Por dia</h3>
        <div
          aria-hidden
          className="flex flex-wrap items-center gap-3 text-[0.6875rem] text-grafite"
        >
          {LEGENDA.map((item) => (
            <span key={item.rotulo} className="inline-flex items-center gap-1.5">
              <span className={cn('size-2 rounded-[2px]', item.cor)} />
              {item.rotulo}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-px border-b border-pauta">
        {colunas.map((coluna) => (
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
                  {totalDa(coluna) === 0 ? (
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
        ))}
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

/** De baixo para cima: concluídas, não concluídas, em aberto. */
function BarraEmpilhada({ coluna, maior }: { coluna: ColunaPorDia; maior: number }) {
  const partes = [
    { quantidade: coluna.concluidas, classe: COR_CONCLUIDAS.preenchimento },
    { quantidade: coluna.naoConcluidas, classe: COR_NAO_CONCLUIDAS.preenchimento },
    { quantidade: coluna.emAberto, classe: COR_EM_ABERTO.preenchimento },
  ]
  let base = ALTURA_DAS_COLUNAS
  return partes.map(({ quantidade, classe }) => {
    const altura = (quantidade / maior) * ALTURA_DAS_COLUNAS
    base -= altura
    return (
      <rect
        key={classe}
        x={0}
        y={base}
        width={10}
        height={altura}
        className={cn(
          classe,
          'transition-opacity group-hover/coluna:opacity-80 motion-reduce:transition-none',
        )}
      />
    )
  })
}
