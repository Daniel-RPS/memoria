import { useEffect, useRef, useState } from 'react'
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
import { useSubmenuTolerante } from '@/components/seletor-categoria/use-submenu-tolerante'

/**
 * "Categoria ›" dentro de um menu ⋯ (tarefa ou card de grupo).
 * Lista: fecha com atraso e tolerância de mouse. Painel "Nova categoria": fixo, só fecha por
 * clique fora, Esc, "← Categorias" ou "Criar e aplicar".
 */
export function SubmenuCategoria(props: Omit<SeletorCategoriaProps, 'onCriandoChange'>) {
  const [isCriando, setIsCriando] = useState(false)
  const { isAberto, handleOpenChange, propsDeHover } = useSubmenuTolerante(isCriando)
  const conteudo = useRef<HTMLDivElement>(null)

  // Criando: o mouse passando pelos itens do menu principal não pode roubar o foco do campo.
  useEffect(() => {
    if (!isCriando || !isAberto) return
    function handlePointerMove(evento: PointerEvent) {
      const alvo = evento.target as Node | null
      if (alvo && !conteudo.current?.contains(alvo)) evento.preventDefault()
    }
    document.addEventListener('pointermove', handlePointerMove, true)
    return () => document.removeEventListener('pointermove', handlePointerMove, true)
  }, [isCriando, isAberto])

  return (
    <DropdownMenuSub open={isAberto} onOpenChange={handleOpenChange}>
      <DropdownMenuSubTrigger {...propsDeHover}>
        <Tag /> Categoria
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        ref={conteudo}
        collisionPadding={8}
        {...propsDeHover}
        className="max-h-[min(40rem,var(--radix-dropdown-menu-content-available-height))] max-w-[min(18rem,calc(100vw-1rem))] min-w-48 overflow-y-auto"
      >
        <SeletorCategoria {...props} onCriandoChange={setIsCriando} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
