import { Link } from 'react-router'
import type { BlocoDeProcedimentos } from '@/lib/procedimentos'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'

interface ListaProcedimentosProps {
  blocos: BlocoDeProcedimentos[]
}

function textoEtapas(total: number) {
  return total === 1 ? '1 etapa' : `${total} etapas`
}

/** Um bloco por categoria (com a cor dela) e "Sem categoria" no fim. */
export function ListaProcedimentos({ blocos }: ListaProcedimentosProps) {
  const corNaTela = useCorNaTela()
  return (
    <div className="flex flex-col gap-8">
      {blocos.map(({ categoria, procedimentos }) => {
        const nome = categoria?.nome ?? 'Sem categoria'
        return (
          <section key={categoria?.id ?? 'sem-categoria'} aria-label={nome}>
            <h2 className="flex items-baseline gap-2 px-1 text-lg font-bold">
              <span
                aria-hidden
                className="size-3 shrink-0 translate-y-px rounded-full border border-pauta"
                style={categoria ? { backgroundColor: corNaTela(categoria.cor) } : undefined}
              />
              {nome}
              <span className="text-sm font-normal text-grafite tabular-nums">
                {procedimentos.length}
              </span>
            </h2>
            <ul className="mt-2 rounded-md border border-pauta bg-papel">
              {procedimentos.map((procedimento) => (
                <li
                  key={procedimento.id}
                  className="relative border-b border-pauta last:border-b-0"
                >
                  {categoria && (
                    <span
                      aria-hidden
                      className="absolute inset-y-1 left-0 w-1 rounded-r-sm"
                      style={{ backgroundColor: corNaTela(categoria.cor) }}
                    />
                  )}
                  <Link
                    to={`/procedimentos/${procedimento.id}`}
                    className="flex items-baseline justify-between gap-4 px-4 py-3 hover:bg-accent/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-caneta"
                  >
                    <span className="font-semibold">{procedimento.titulo}</span>
                    <span className="shrink-0 text-sm text-grafite tabular-nums">
                      {textoEtapas(procedimento.etapas.length)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
