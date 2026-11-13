import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { IconeDaEntidade } from '@/components/icones/icone-da-entidade'
import { listarProcedimentos } from '@/db/repositories/procedure-repository'
import { compararPorOrdem } from '@/domain/procedimentos'
import { useCategorias } from '@/hooks/use-categorias'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'

/**
 * Seção de procedimentos favoritos na tela Início, exibida abaixo do Mapa de Conclusões
 * quando houver pelo menos um procedimento favoritado (não arquivado).
 */
export function ProcedimentosFavoritos() {
  const { categorias } = useCategorias('procedimento')
  const corNaTela = useCorNaTela()

  const favoritos = useLiveQuery(async () => {
    const todos = await listarProcedimentos()
    return todos
      .filter((p) => p.favorito && !p.arquivado)
      .sort(compararPorOrdem)
  }, [])

  if (!favoritos || favoritos.length === 0) return null

  const mapaCategorias = new Map(categorias.map((c) => [c.id, c]))

  return (
    <section
      aria-labelledby="titulo-favoritos"
      className="rounded-lg border border-pauta bg-papel px-5 pt-3 pb-4"
    >
      <header className="mb-2.5 flex items-center justify-between border-b border-tinta pb-1.5">
        <h2 id="titulo-favoritos" className="text-lg font-bold tracking-[-0.01em] [font-stretch:85%]">
          Procedimentos favoritos
        </h2>
      </header>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-3">
        {favoritos.map((procedimento) => {
          const categoria = procedimento.categoryId ? mapaCategorias.get(procedimento.categoryId) : undefined
          const cor = categoria ? corNaTela(categoria.cor) : 'var(--color-grafite)'
          const totalEtapas = procedimento.etapas.length
          const textoEtapas = totalEtapas === 1 ? '1 etapa' : `${totalEtapas} etapas`

          return (
            <Link
              key={procedimento.id}
              to={`/procedimentos/${procedimento.id}`}
              className="group flex flex-col justify-between rounded-md border border-pauta bg-card p-3 shadow-2xs transition-colors hover:border-caneta/45 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-caneta motion-reduce:transition-none"
            >
              <div>
                <div className="flex items-start gap-1.5">
                  <IconeDaEntidade icone={procedimento.icone} className="mt-0.5 shrink-0" />
                  <span className="font-semibold leading-snug break-words group-hover:text-caneta">
                    {procedimento.titulo}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-1 text-xs text-grafite tabular-nums">
                <div className="flex min-w-0 items-center gap-1.5 truncate">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cor }}
                  />
                  <span className="truncate">{categoria?.nome ?? 'Sem categoria'}</span>
                </div>
                <span className="shrink-0">{textoEtapas}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
