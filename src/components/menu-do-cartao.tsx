import { Archive, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MenuDoCartaoProps {
  /** Nome do que o cartão mostra, para o leitor de tela ("Mais ações para Backup"). */
  nome: string
  onArquivar: () => void
}

/**
 * Menu ⋯ no canto do cartão (Notas e Procedimentos), por cima do link que cobre o cartão.
 * Aparece ao passar o mouse ou com o foco; o pai precisa ser `relative group/cartao-menu`.
 */
export function MenuDoCartao({ nome, onArquivar }: MenuDoCartaoProps) {
  return (
    <div className="absolute top-1.5 right-1.5 z-10">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Mais ações para ${nome}`}
            className="text-grafite opacity-0 group-focus-within/cartao-menu:opacity-100 group-hover/cartao-menu:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" collisionPadding={8} className="w-auto min-w-40">
          <DropdownMenuItem onSelect={onArquivar}>
            <Archive /> Arquivar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
