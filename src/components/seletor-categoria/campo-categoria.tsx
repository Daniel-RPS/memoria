import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from 'cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SeletorCategoria,
  type CategoriaEscolhida,
} from '@/components/seletor-categoria/seletor-categoria'
import { useCategorias } from '@/hooks/use-categorias'
import { classificarTarefa } from '@/lib/categorias'

interface CampoCategoriaProps {
  id?: string
  atual: CategoriaEscolhida
  onEscolher: (categoria: CategoriaEscolhida) => void
  /** Botão compacto, só a bolinha (ex.: ao lado de "Novo grupo"). */
  isCompacto?: boolean
  /** Nome acessível do botão compacto. */
  rotulo?: string
  className?: string
}

/** Campo de formulário (com cara de select) que abre o seletor de categoria. */
export function CampoCategoria({
  id,
  atual,
  onEscolher,
  isCompacto,
  rotulo = 'Categoria',
  className,
}: CampoCategoriaProps) {
  const { categorias } = useCategorias()
  const [isAberto, setIsAberto] = useState(false)
  const classificacao = classificarTarefa(atual, categorias)
  const texto = classificacao?.rotulo ?? 'Sem categoria'

  return (
    <DropdownMenu open={isAberto} onOpenChange={setIsAberto} modal={false}>
      <DropdownMenuTrigger
        id={id}
        aria-label={isCompacto ? `${rotulo}: ${texto}` : undefined}
        title={isCompacto ? `${rotulo}: ${texto}` : undefined}
        className={cn(
          'flex items-center gap-1.5 rounded-lg text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          isCompacto
            ? 'size-8 shrink-0 justify-center hover:bg-accent'
            : 'h-8 w-full justify-between border border-input bg-papel py-2 pr-2 pl-2.5',
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              'size-2.5 shrink-0 rounded-full',
              !classificacao && 'border border-grafite/60',
            )}
            style={classificacao ? { backgroundColor: classificacao.cor } : undefined}
          />
          {!isCompacto && <span className="truncate">{texto}</span>}
        </span>
        {!isCompacto && <ChevronDown aria-hidden className="size-4 shrink-0 text-grafite" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        collisionPadding={8}
        className="max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] w-auto max-w-[min(18rem,calc(100vw-1rem))] min-w-[max(14rem,var(--radix-dropdown-menu-trigger-width))] overflow-y-auto"
      >
        <SeletorCategoria
          atual={atual}
          onEscolher={onEscolher}
          onFechar={() => setIsAberto(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
