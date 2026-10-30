import { useRef, useState } from 'react'
import {
  Archive,
  CalendarArrowUp,
  CalendarDays,
  ListPlus,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Trash2,
} from 'lucide-react'
import { DialogoEscolherDia } from '@/components/dialogo-escolher-dia'
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
import type { DataLocal, Task } from '@/db/types'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { useAcoesTarefa } from '@/features/dia/hooks/use-acoes-tarefa'
import { SubmenuCategoria } from '@/features/dia/components/submenu-categoria'

interface MenuTarefaProps {
  tarefa: Task
  hoje: DataLocal
  onRenomear: () => void
  onAdicionarSubtarefa: () => void
  onAbrirAnexos: () => void
}

/** Ações secundárias da tarefa: adiar, mover, renomear, subtarefa, categoria, arquivar, excluir. */
export function MenuTarefa({
  tarefa,
  hoje,
  onRenomear,
  onAdicionarSubtarefa,
  onAbrirAnexos,
}: MenuTarefaProps) {
  const { arquivarTarefa, excluirTarefa } = useAcoesTarefa()
  const { mover, adiar } = useMoverTarefas()
  const [isConfirmandoExclusao, setIsConfirmandoExclusao] = useState(false)
  const [isEscolhendoDia, setIsEscolhendoDia] = useState(false)
  const isPendente = tarefa.status === 'pendente'
  const isFutura = tarefa.data > hoje
  // Ações que abrem um campo: o foco deve ficar nele, não voltar para o botão do menu.
  const isAbrindoCampoRef = useRef(false)

  function abrirCampo(acao: () => void) {
    isAbrindoCampoRef.current = true
    acao()
  }

  return (
    <>
      {/* modal={false}: evita o body travado ao abrir o diálogo de exclusão a partir do menu. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Mais ações para ${tarefa.titulo}`}
            className="text-grafite opacity-0 group-hover/linha:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(evento) => {
            if (!isAbrindoCampoRef.current) return
            evento.preventDefault()
            isAbrindoCampoRef.current = false
          }}
        >
          {isPendente && (
            <DropdownMenuItem onSelect={() => void adiar([tarefa.id])}>
              <CalendarArrowUp /> {isFutura ? 'Adiar um dia' : 'Adiar para amanhã'}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setIsEscolhendoDia(true)}>
            <CalendarDays /> Mover para outro dia…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => abrirCampo(onRenomear)}>
            <Pencil /> Renomear
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => abrirCampo(onAdicionarSubtarefa)}>
            <ListPlus /> Adicionar subtarefa
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => abrirCampo(onAbrirAnexos)}>
            <Paperclip /> Anotação e anexos
          </DropdownMenuItem>
          <SubmenuCategoria tarefa={tarefa} />
          <DropdownMenuItem onSelect={() => void arquivarTarefa(tarefa.id)}>
            <Archive /> Arquivar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setIsConfirmandoExclusao(true)}>
            <Trash2 /> Excluir…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogoEscolherDia
        isAberto={isEscolhendoDia}
        onMudarAberto={setIsEscolhendoDia}
        titulo="Mover para outro dia"
        descricao={tarefa.titulo}
        dataInicial={tarefa.data}
        hoje={hoje}
        onEscolher={(destino) => void mover([tarefa.id], destino)}
      />

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
