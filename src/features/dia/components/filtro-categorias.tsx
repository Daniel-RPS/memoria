import { Check } from 'lucide-react'
import { cn } from 'cn'
import type { FiltroCategoria } from '@/lib/categorias'
import { corDaSubcategoria } from '@/lib/categorias'
import { NaBarraLateral } from '@/components/barra-lateral/area-lateral'
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
        'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-papel',
        isAtivo ? 'bg-papel/10 text-papel' : 'text-papel/70 hover:bg-papel/8 hover:text-papel',
      )}
    >
      <span
        aria-hidden
        className={cn('size-2.5 shrink-0 rounded-full', !cor && 'ring-1 ring-papel/50')}
        style={cor ? { backgroundColor: cor } : undefined}
      />
      <span className="truncate">{children}</span>
      {isAtivo && <Check aria-hidden className="ml-auto size-3.5 shrink-0 text-caneta" />}
    </button>
  )
}

/**
 * Filtro do Dia, desenhado na barra lateral: ver só uma categoria (e depois, se quiser,
 * só uma subcategoria dela). O estado continua na URL, cuidado pela página do Dia.
 */
export function FiltroCategorias({ filtro, onMudar }: FiltroCategoriasProps) {
  const categorias = useCategoriasDoContexto()
  const categoriaAtiva = categorias.find((categoria) => categoria.id === filtro.categoriaId)

  if (categorias.length === 0) return null

  return (
    <NaBarraLateral>
      <p className="mb-1.5 px-2 text-xs text-papel/45">Filtrar por categoria</p>
      <div role="group" aria-label="Filtrar por categoria" className="flex flex-col gap-0.5">
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
          className="mt-2 ml-3 flex flex-col gap-0.5 border-l border-papel/15 pl-2"
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
    </NaBarraLateral>
  )
}
