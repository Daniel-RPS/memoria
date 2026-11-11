import type { BarraPorCategoria } from '@/domain/numeros'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'

/**
 * Uma barra de progresso por categoria (já ordenadas pelo total): bolinha e nome, "8 de 10"
 * (concluídas de total) e a parte concluída na cor da categoria sobre o trilho. Sem categoria =
 * cor neutra.
 */
export function GraficoPorCategoria({ barras }: { barras: BarraPorCategoria[] }) {
  const corNaTela = useCorNaTela()

  return (
    <section
      aria-label="Por categoria"
      data-grafico-por-categoria=""
      className="grid content-start gap-2.5"
    >
      <h3 className="text-xs font-semibold tracking-tight text-grafite">Por categoria</h3>
      <ul className="grid gap-3">
        {barras.map((barra) => {
          const cor = barra.cor ? corNaTela(barra.cor) : 'var(--grafite)'
          const percentual = barra.total > 0 ? (barra.concluidas / barra.total) * 100 : 0
          return (
            <li key={barra.id ?? 'sem-categoria'} className="grid gap-1.5 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: cor }}
                />
                <span className="truncate text-tinta">{barra.nome}</span>
                <span className="ml-auto shrink-0 text-xs font-medium whitespace-nowrap text-grafite tabular-nums">
                  {barra.concluidas} de {barra.total}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`${barra.nome}: ${barra.concluidas} de ${barra.total} concluídas`}
                aria-valuemin={0}
                aria-valuemax={barra.total}
                aria-valuenow={barra.concluidas}
                className="h-[7px] overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
                  style={{ width: `${percentual}%`, backgroundColor: cor }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
