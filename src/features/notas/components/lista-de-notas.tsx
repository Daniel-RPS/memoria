import type { TipoAnexo } from '@/db/types'
import { useCorDeTraco, useCorNaTela } from '@/hooks/use-cor-na-tela'
import type { BlocoDeNotas } from '@/lib/notas'
import { CartaoNota } from '@/features/notas/components/cartao-nota'

interface ListaDeNotasProps {
  blocos: BlocoDeNotas[]
  anexosPorNota: Map<string, Set<TipoAnexo>>
}

/** Blocos (categoria, grupo ou um só em Recentes), cada um com os cartões em grade. */
export function ListaDeNotas({ blocos, anexosPorNota }: ListaDeNotasProps) {
  const corNaTela = useCorNaTela()
  const corDeTraco = useCorDeTraco()
  return (
    <div className="flex flex-col gap-8">
      {blocos.map((bloco) => (
        <section key={bloco.id} aria-label={bloco.titulo ?? 'Notas recentes'}>
          {bloco.titulo && (
            <h2 className="mb-3 flex items-baseline gap-2 px-1 text-lg font-bold">
              <span
                aria-hidden
                className="size-3 shrink-0 translate-y-px rounded-full border border-pauta"
                style={bloco.cor ? { backgroundColor: corNaTela(bloco.cor) } : undefined}
              />
              {bloco.titulo}
              <span className="text-sm font-normal text-grafite tabular-nums">
                {bloco.notas.length}
              </span>
            </h2>
          )}
          {/* Colunas pela largura, sem número fixo (como os cartões de Procedimentos). */}
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
            {bloco.notas.map((item) => (
              <li key={item.nota.id} className="min-w-0">
                <CartaoNota
                  item={item}
                  cor={item.dono.cor ? corDeTraco(item.dono.cor) : 'var(--grafite)'}
                  tiposDeAnexo={anexosPorNota.get(item.nota.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
