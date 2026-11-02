import { useRef, useState } from 'react'
import {
  Archive,
  CalendarArrowUp,
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { DialogoLevarPendentes } from '@/components/dialogo-levar-pendentes'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SubmenuCategoria } from '@/components/seletor-categoria/submenu-categoria'
import type { DataLocal } from '@/db/types'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { pendentesDo, rotuloLevarAdiante, type GrupoDoDia } from '@/lib/grupos'
import { useAcoesGrupo } from '@/features/dia/hooks/use-acoes-grupo'

interface MenuGrupoProps {
  grupo: GrupoDoDia
  hoje: DataLocal
  onRenomear: () => void
}

/**
 * Ações do card. Levar pendentes: o card fica aqui e os itens pendentes vão para o card da
 * mesma série no outro dia. Sem pendentes, não há o que levar.
 */
export function MenuGrupo({ grupo, hoje, onRenomear }: MenuGrupoProps) {
  const { card, serie } = grupo
  const { arquivarGrupo, excluirGrupo, definirCategoriaDoGrupo } = useAcoesGrupo()
  const { adiar } = useMoverTarefas()
  const [isMenuAberto, setIsMenuAberto] = useState(false)
  const [isConfirmandoExclusao, setIsConfirmandoExclusao] = useState(false)
  const [isEscolhendoDia, setIsEscolhendoDia] = useState(false)
  const quantidadePendentes = pendentesDo(grupo).length
  const isCopiavel = quantidadePendentes > 0
  const isAbrindoCampoRef = useRef(false)
  const quantidadeItens = grupo.itens.length

  return (
    <>
      <DropdownMenu open={isMenuAberto} onOpenChange={setIsMenuAberto} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Mais ações para o grupo ${serie.titulo}`}
            className="text-grafite opacity-0 group-hover/cabecalho:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          collisionPadding={8}
          // Botão pequeno: o menu tem largura própria, não a do botão.
          className="w-auto min-w-52"
          onCloseAutoFocus={(evento) => {
            if (!isAbrindoCampoRef.current) return
            evento.preventDefault()
            isAbrindoCampoRef.current = false
          }}
        >
          <DropdownMenuItem
            disabled={!isCopiavel}
            onSelect={() => void adiar([], { grupos: [card.id] })}
          >
            <CalendarArrowUp /> {rotuloLevarAdiante(card.data, hoje)}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!isCopiavel} onSelect={() => setIsEscolhendoDia(true)}>
            <CalendarDays /> Levar pendentes para…
          </DropdownMenuItem>
          {!isCopiavel && (
            <p className="px-2 py-1 text-xs text-grafite">Nenhum item pendente para levar.</p>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              isAbrindoCampoRef.current = true
              onRenomear()
            }}
          >
            <Pencil /> Renomear
          </DropdownMenuItem>
          <SubmenuCategoria
            tipo="grupo"
            atual={serie}
            onEscolher={(categoria) => void definirCategoriaDoGrupo(serie.id, categoria)}
            onFechar={() => setIsMenuAberto(false)}
          />
          <DropdownMenuItem onSelect={() => void arquivarGrupo(card.id)}>
            <Archive /> Arquivar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setIsConfirmandoExclusao(true)}>
            <Trash2 /> Excluir…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogoLevarPendentes
        grupo={grupo}
        hoje={hoje}
        isAberto={isEscolhendoDia}
        onMudarAberto={setIsEscolhendoDia}
      />

      <AlertDialog open={isConfirmandoExclusao} onOpenChange={setIsConfirmandoExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o grupo “{serie.titulo}” deste dia?</AlertDialogTitle>
            <AlertDialogDescription>
              {quantidadeItens === 0
                ? 'O card vazio será apagado.'
                : `O card e ${quantidadeItens === 1 ? 'o item' : `os ${quantidadeItens} itens`} dele serão apagados de vez. Os cards de outros dias continuam. Para só tirar do calendário, use Arquivar.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void excluirGrupo(card.id)}>
              Excluir grupo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
