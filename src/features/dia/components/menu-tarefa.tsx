import { useRef, useState } from 'react'
import {
  Archive,
  CalendarArrowUp,
  CalendarDays,
  FolderInput,
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ItensDeNotaDoMenu } from '@/components/notas/itens-de-nota-do-menu'
import { SubmenuCategoria } from '@/components/seletor-categoria/submenu-categoria'
import type { DataLocal, Task } from '@/db/types'
import { useAvisoNotasAvulsas } from '@/hooks/use-aviso-notas-avulsas'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { useAcoesTarefa } from '@/features/dia/hooks/use-acoes-tarefa'
import { useGruposDoDia } from '@/features/dia/hooks/contexto-extras'

interface MenuTarefaProps {
  tarefa: Task
  hoje: DataLocal
  onRenomear: () => void
  onAdicionarSubtarefa: () => void
  onAbrirAnexos: () => void
}

/**
 * Ações secundárias da tarefa: adiar, mover, renomear, subtarefa, categoria, grupo, arquivar e
 * excluir. Item de grupo usa a categoria do grupo e pode sair dele.
 */
export function MenuTarefa({
  tarefa,
  hoje,
  onRenomear,
  onAdicionarSubtarefa,
  onAbrirAnexos,
}: MenuTarefaProps) {
  const { arquivarTarefa, excluirTarefa, definirCategoria, colocarNoGrupo } = useAcoesTarefa()
  const gruposDoDia = useGruposDoDia()
  const { mover, adiar } = useMoverTarefas()
  const [isMenuAberto, setIsMenuAberto] = useState(false)
  const [isConfirmandoExclusao, setIsConfirmandoExclusao] = useState(false)
  const [isEscolhendoDia, setIsEscolhendoDia] = useState(false)
  const isPendente = tarefa.status === 'pendente'
  const isFutura = tarefa.data > hoje
  const avisoNotas = useAvisoNotasAvulsas({ tipo: 'tarefa', id: tarefa.id }, isConfirmandoExclusao)
  // Ações que abrem um campo: o foco deve ficar nele, não voltar para o botão do menu.
  const isAbrindoCampoRef = useRef(false)

  function abrirCampo(acao: () => void) {
    isAbrindoCampoRef.current = true
    acao()
  }

  return (
    <>
      {/* modal={false}: evita o body travado ao abrir o diálogo de exclusão a partir do menu. */}
      <DropdownMenu open={isMenuAberto} onOpenChange={setIsMenuAberto} modal={false}>
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
          collisionPadding={8}
          // Botão pequeno: o menu tem largura própria, não a do botão.
          className="w-auto min-w-52"
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
          <ItensDeNotaDoMenu vinculo={{ tipo: 'tarefa', id: tarefa.id }} />
          <DropdownMenuItem onSelect={() => abrirCampo(onAbrirAnexos)}>
            <Paperclip /> Anexos
          </DropdownMenuItem>
          <SubmenuCategoria
            tipo="grupo"
            atual={tarefa}
            onEscolher={(categoria) => void definirCategoria(tarefa.id, categoria)}
            onFechar={() => setIsMenuAberto(false)}
          />
          {isPendente && gruposDoDia.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput /> Colocar no grupo
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
                {gruposDoDia.map((grupo) => (
                  <DropdownMenuItem
                    key={grupo.id}
                    onSelect={() => void colocarNoGrupo(tarefa.id, grupo.id)}
                  >
                    {grupo.titulo}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
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
              {avisoNotas && (
                <span className="mt-2 block font-medium text-tinta">{avisoNotas}</span>
              )}
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
