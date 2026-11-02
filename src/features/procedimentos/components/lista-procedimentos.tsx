import type { BlocoDeProcedimentos } from '@/lib/procedimentos'
import { useCorDeTraco, useCorNaTela } from '@/hooks/use-cor-na-tela'
import { CartaoProcedimento } from '@/features/procedimentos/components/cartao-procedimento'

interface ListaProcedimentosProps {
  blocos: BlocoDeProcedimentos[]
}

/** Um bloco por categoria (com a cor dela), "Sem categoria" no fim; cartões em grade. */
export function ListaProcedimentos({ blocos }: ListaProcedimentosProps) {
  const corNaTela = useCorNaTela()
  const corDeTraco = useCorDeTraco()
  return (
    <div className="flex flex-col gap-8">
      {blocos.map(({ categoria, procedimentos }) => {
        const nome = categoria?.nome ?? 'Sem categoria'
        const corDaFaixa = categoria ? corDeTraco(categoria.cor) : 'var(--grafite)'
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
            {/* Colunas pela largura (3 / 2 / 1), sem número fixo. */}
            <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
              {procedimentos.map((procedimento) => (
                <li key={procedimento.id} className="min-w-0">
                  <CartaoProcedimento procedimento={procedimento} cor={corDaFaixa} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
