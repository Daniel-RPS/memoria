import { Tag } from 'lucide-react'
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SeletorCategoria,
  type SeletorCategoriaProps,
} from '@/components/seletor-categoria/seletor-categoria'

/** "Categoria ›" dentro de um menu ⋯ (tarefa ou card de grupo). */
export function SubmenuCategoria(props: SeletorCategoriaProps) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Tag /> Categoria
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        collisionPadding={8}
        className="max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] max-w-[min(18rem,calc(100vw-1rem))] min-w-48 overflow-y-auto"
      >
        <SeletorCategoria {...props} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
