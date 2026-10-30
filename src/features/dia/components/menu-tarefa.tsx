import { useRef, useState } from 'react'
import { Archive, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
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
import type { Task } from '@/db/types'
import { useAcoesTarefa } from '@/features/dia/hooks/use-acoes-tarefa'

interface MenuTarefaProps {
  tarefa: Task
  onRenomear: () => void
}

/** Ações secundárias da tarefa: renomear, arquivar e excluir (com confirmação). */
export function MenuTarefa({ tarefa, onRenomear }: MenuTarefaProps) {
  const { arquivarTarefa, excluirTarefa } = useAcoesTarefa()
  const [isConfirmandoExclusao, setIsConfirmandoExclusao] = useState(false)
  // Ao renomear, o foco deve ficar no campo de título, não voltar para o botão do menu.
  const isRenomeandoRef = useRef(false)

  return (
    <>
      {/* modal={false}: evita o body travado ao abrir o diálogo de exclusão a partir do menu. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Mais ações para ${tarefa.titulo}`}
            className="text-grafite opacity-0 group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(evento) => {
            if (!isRenomeandoRef.current) return
            evento.preventDefault()
            isRenomeandoRef.current = false
          }}
        >
          <DropdownMenuItem
            onSelect={() => {
              isRenomeandoRef.current = true
              onRenomear()
            }}
          >
            <Pencil /> Renomear
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void arquivarTarefa(tarefa.id)}>
            <Archive /> Arquivar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setIsConfirmandoExclusao(true)}>
            <Trash2 /> Excluir…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isConfirmandoExclusao} onOpenChange={setIsConfirmandoExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{tarefa.titulo}”?</AlertDialogTitle>
            <AlertDialogDescription>
              A tarefa e as subtarefas dela serão apagadas de vez. Para só tirar do calendário, use
              Arquivar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void excluirTarefa(tarefa.id)}>
              Excluir tarefa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
