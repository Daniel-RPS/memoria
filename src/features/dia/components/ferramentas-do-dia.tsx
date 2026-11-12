import { CheckSquare, Columns2, Ellipsis, LayoutGrid, Rows3, type LucideIcon } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { lerOrdemDoDia, type ModoDoDia, type OrdemDoDia } from '@/lib/visao-do-dia'

interface FerramentasDoDiaProps {
  modo: ModoDoDia
  ordem: OrdemDoDia
  onEscolherModo: (modo: ModoDoDia) => void
  onEscolherOrdem: (ordem: OrdemDoDia) => void
  /** Sem ele, o "Selecionar" não aparece (dia vazio ou já selecionando). */
  onSelecionar?: () => void
}

const OPCOES_DE_MODO: { modo: ModoDoDia; rotulo: string; Icone: LucideIcon }[] = [
  { modo: 'lista', rotulo: 'Lista', Icone: Rows3 },
  { modo: 'colunas', rotulo: 'Colunas', Icone: Columns2 },
  { modo: 'cartoes', rotulo: 'Cartões', Icone: LayoutGrid },
]

/** "Selecionar", o alternador Lista/Colunas e o menu ⋯ com a ordem das seções. */
export function FerramentasDoDia({
  modo,
  ordem,
  onEscolherModo,
  onEscolherOrdem,
  onSelecionar,
}: FerramentasDoDiaProps) {
  return (
    <div className="mt-2 flex items-center justify-end gap-1">
      {onSelecionar && (
        <Button variant="ghost" size="sm" className="text-grafite" onClick={onSelecionar}>
          <CheckSquare /> Selecionar
        </Button>
      )}
      <div
        role="group"
        aria-label="Visualização do dia"
        className="flex items-center rounded-md border border-pauta p-0.5"
      >
        {OPCOES_DE_MODO.map(({ modo: opcao, rotulo, Icone }) => {
          const isAtivo = modo === opcao
          return (
            <Tooltip key={opcao}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={rotulo}
                  aria-pressed={isAtivo}
                  onClick={() => onEscolherModo(opcao)}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-[4px] text-grafite transition-colors hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta motion-reduce:transition-none',
                    isAtivo && 'bg-accent text-caneta hover:text-caneta',
                  )}
                >
                  <Icone aria-hidden className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{rotulo}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-grafite"
            aria-label="Opções da visualização"
          >
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ordem das seções</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={ordem}
            onValueChange={(valor) => onEscolherOrdem(lerOrdemDoDia(valor))}
          >
            <DropdownMenuRadioItem value="grupos">Grupos primeiro</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="soltas">Tarefas soltas primeiro</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
