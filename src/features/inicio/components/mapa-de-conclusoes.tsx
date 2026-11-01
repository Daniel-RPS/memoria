import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from 'cn'
import { SeletorCategoria } from '@/components/seletor-categoria/seletor-categoria'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DataLocal } from '@/db/types'
import { useCategorias } from '@/hooks/use-categorias'
import type { NivelDeIntensidade } from '@/lib/estatisticas'
import { CORES_DOS_NIVEIS } from '@/features/inicio/components/cores-dos-niveis'
import { GradeDoMapa } from '@/features/inicio/components/grade-do-mapa'
import { useFiltroDoMapa } from '@/features/inicio/hooks/use-filtro-do-mapa'
import { useMapaDeConclusoes } from '@/features/inicio/hooks/use-mapa-de-conclusoes'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'

interface MapaDeConclusoesProps {
  hoje: DataLocal
}

const NIVEIS: NivelDeIntensidade[] = [0, 1, 2, 3, 4]

/**
 * Mapa do último ano no formato do gráfico de contribuições do GitHub: tarefas soltas e
 * itens de grupo concluídos por dia, com filtro por categoria num menu compacto (lembrado).
 */
export function MapaDeConclusoes({ hoje }: MapaDeConclusoesProps) {
  const { categorias, isCarregando } = useCategorias()
  const filtro = useFiltroDoMapa()
  const corNaTela = useCorNaTela()
  const [isMenuAberto, setIsMenuAberto] = useState(false)
  const categoria = categorias.find((opcao) => opcao.id === filtro.categoryId)
  // Categoria lembrada que foi excluída: volta para todas.
  const categoryId = isCarregando || categoria ? filtro.categoryId : undefined
  const mapa = useMapaDeConclusoes(hoje, categoryId)

  return (
    <section
      aria-labelledby="titulo-mapa"
      className="rounded-lg border border-pauta bg-papel px-5 pt-3 pb-4"
    >
      <header className="mb-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-tinta pb-1.5">
        <h2 id="titulo-mapa" className="text-lg font-bold tracking-[-0.01em] [font-stretch:85%]">
          <span className="tabular-nums">{mapa.total}</span>{' '}
          {mapa.total === 1 ? 'item concluído' : 'itens concluídos'} no último ano
        </h2>
        {categorias.length > 0 && (
          <DropdownMenu open={isMenuAberto} onOpenChange={setIsMenuAberto} modal={false}>
            <DropdownMenuTrigger
              aria-label={`Filtrar por categoria: ${categoria?.nome ?? 'Todas as categorias'}`}
              className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-grafite outline-none hover:bg-accent hover:text-tinta focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:bg-accent"
            >
              {categoria && (
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: corNaTela(categoria.cor) }}
                />
              )}
              <span className="max-w-40 truncate">{categoria?.nome ?? 'Todas as categorias'}</span>
              <ChevronDown aria-hidden className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              collisionPadding={8}
              className="max-h-[min(22rem,var(--radix-dropdown-menu-content-available-height))] w-60 overflow-y-auto p-1.5"
            >
              <SeletorCategoria
                modo="filtro"
                atual={{ categoryId }}
                onEscolher={(escolhida) => {
                  filtro.handleEscolher(escolhida.categoryId)
                  setIsMenuAberto(false)
                }}
                onFechar={() => setIsMenuAberto(false)}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <GradeDoMapa
        semanas={mapa.semanas}
        meses={mapa.meses}
        contagem={mapa.contagem}
        faixas={mapa.faixas}
        hoje={hoje}
      />

      <div aria-hidden className="mt-2 flex items-center justify-end gap-1.5 text-xs text-grafite">
        Menos
        {NIVEIS.map((nivel) => (
          <span key={nivel} className={cn('size-[11px] rounded-[2px]', CORES_DOS_NIVEIS[nivel])} />
        ))}
        Mais
      </div>
    </section>
  )
}
