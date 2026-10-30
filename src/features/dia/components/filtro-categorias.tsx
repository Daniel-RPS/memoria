import { cn } from 'cn'
import type { FiltroCategoria } from '@/lib/categorias'
import { corDaSubcategoria } from '@/lib/categorias'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'

interface FiltroCategoriasProps {
  filtro: FiltroCategoria
  onMudar: (filtro: FiltroCategoria) => void
}

interface BotaoFiltroProps {
  isAtivo: boolean
  cor?: string
  onClick: () => void
  children: string
}

function BotaoFiltro({ isAtivo, cor, onClick, children }: BotaoFiltroProps) {
  return (
    <button
      type="button"
      aria-pressed={isAtivo}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta',
        isAtivo
          ? 'border-tinta bg-tinta text-papel'
          : 'border-pauta bg-papel text-tinta hover:border-grafite',
      )}
    >
      {cor && (
        <span
          aria-hidden
          className="size-2.5 rounded-full ring-1 ring-papel/60"
          style={{ backgroundColor: cor }}
        />
      )}
      {children}
    </button>
  )
}

/** Botões para ver só uma categoria (e depois, se quiser, só uma subcategoria dela). */
export function FiltroCategorias({ filtro, onMudar }: FiltroCategoriasProps) {
  const categorias = useCategoriasDoContexto()
  const categoriaAtiva = categorias.find((categoria) => categoria.id === filtro.categoriaId)

  if (categorias.length === 0) return null

  return (
    <div className="mt-8 flex flex-col gap-2">
      <div role="group" aria-label="Filtrar por categoria" className="flex flex-wrap gap-2">
        <BotaoFiltro isAtivo={!filtro.categoriaId} onClick={() => onMudar({})}>
          Todas
        </BotaoFiltro>
        {categorias.map((categoria) => (
          <BotaoFiltro
            key={categoria.id}
            isAtivo={filtro.categoriaId === categoria.id}
            cor={categoria.cor}
            onClick={() => onMudar({ categoriaId: categoria.id })}
          >
            {categoria.nome}
          </BotaoFiltro>
        ))}
      </div>

      {categoriaAtiva && categoriaAtiva.subcategorias.length > 0 && (
        <div
          role="group"
          aria-label={`Filtrar por subcategoria de ${categoriaAtiva.nome}`}
          className="flex flex-wrap gap-2 pl-3"
        >
          <BotaoFiltro
            isAtivo={!filtro.subcategoriaId}
            onClick={() => onMudar({ categoriaId: categoriaAtiva.id })}
          >
            {`Toda ${categoriaAtiva.nome}`}
          </BotaoFiltro>
          {categoriaAtiva.subcategorias.map((subcategoria) => (
            <BotaoFiltro
              key={subcategoria.id}
              isAtivo={filtro.subcategoriaId === subcategoria.id}
              cor={corDaSubcategoria(categoriaAtiva, subcategoria.id)}
              onClick={() =>
                onMudar({ categoriaId: categoriaAtiva.id, subcategoriaId: subcategoria.id })
              }
            >
              {subcategoria.nome}
            </BotaoFiltro>
          ))}
        </div>
      )}
    </div>
  )
}
