import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRef } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Subtask } from '@/db/types'
import { useSelecaoDaFolha } from '@/features/dia/hooks/use-selecao'
import { useAcoesSubtarefa } from '@/features/dia/hooks/use-acoes-subtarefa'
import { AlcaArrastar } from '@/components/alca-arrastar'
import { useDuploCliqueParaEditar } from '@/hooks/use-duplo-clique-para-editar'
import { TituloEditavel } from '@/components/titulo-editavel'

interface ItemSubtarefaProps {
  subtarefa: Subtask
  isEditando: boolean
  /** Quem edita (a lista guarda qual subetapa está em edição, para o Backspace saltar de linha). */
  onMudarEdicao: (isEditando: boolean) => void
  /** Backspace no título vazio: a lista exclui esta e volta para a anterior. */
  onApagarVazio: () => void
  /** Semana: tipografia e caixa menores. */
  isCompacto?: boolean
}

/** Subetapa: alça, caixa de seleção, título editável e menu ⋯ (Renomear, Excluir). */
export function ItemSubtarefa({
  subtarefa,
  isEditando,
  onMudarEdicao,
  onApagarVazio,
  isCompacto = false,
}: ItemSubtarefaProps) {
  const { definirConclusaoSubtarefa, renomearSubtarefa, excluirSubtarefa } = useAcoesSubtarefa()
  const { selecionados, tipo } = useSelecaoDaFolha()
  const isSelecionada = tipo === 'subetapas' && selecionados.has(subtarefa.id)
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtarefa.id })

  function handleSalvarTitulo(titulo: string) {
    onMudarEdicao(false)
    if (titulo !== subtarefa.titulo) void renomearSubtarefa(subtarefa.id, titulo)
  }

  // Renomear pelo menu: o foco não volta ao ⋯ (tiraria o campo recém-aberto da edição).
  const isAbrindoCampoRef = useRef(false)
  const duploClique = useDuploCliqueParaEditar(() => onMudarEdicao(true), !isEditando)

  return (
    <li
      ref={setNodeRef}
      {...duploClique}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-sem-arrasto=""
      data-alvo-subetapa={subtarefa.id}
      data-dono-subetapa={subtarefa.taskId}
      data-selecionada={isSelecionada || undefined}
      className={cn(
        'group/linha relative flex items-center gap-2 bg-papel pr-2',
        isCompacto ? 'min-h-7 gap-1.5' : 'min-h-9',
        isDragging && 'z-10 rounded-sm ring-2 ring-caneta/40',
        isSelecionada && 'bg-accent',
      )}
    >
      <AlcaArrastar
        rotulo={`Mover ${subtarefa.titulo}`}
        ref={setActivatorNodeRef}
        attributes={attributes}
        listeners={listeners}
      />
      <Checkbox
        checked={subtarefa.concluida}
        onCheckedChange={(marcada) =>
          void definirConclusaoSubtarefa(subtarefa.id, marcada === true)
        }
        aria-label={
          subtarefa.concluida ? `Desmarcar ${subtarefa.titulo}` : `Concluir ${subtarefa.titulo}`
        }
        className={cn(
          'rounded-[3px] border-[1.5px] border-tinta/70 data-[state=checked]:border-caneta data-[state=checked]:bg-caneta',
          isCompacto ? 'size-3' : 'size-4',
        )}
      />
      <div className={cn('min-w-0 flex-1 pl-1', isCompacto ? 'py-0.5' : 'py-1.5')}>
        <TituloEditavel
          isComLinks
          isComLapis={!isCompacto}
          titulo={subtarefa.titulo}
          isEditando={isEditando}
          onIniciarEdicao={() => onMudarEdicao(true)}
          onSalvar={handleSalvarTitulo}
          onCancelar={() => onMudarEdicao(false)}
          onApagarVazio={onApagarVazio}
          className={cn(
            isCompacto ? 'text-xs' : 'text-[0.9375rem]',
            subtarefa.concluida && 'text-grafite line-through decoration-tinta/50',
          )}
        />
      </div>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Mais ações para ${subtarefa.titulo}`}
            className="text-grafite opacity-0 group-hover/linha:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          collisionPadding={8}
          className="w-auto min-w-40"
          onCloseAutoFocus={(evento) => {
            if (!isAbrindoCampoRef.current) return
            evento.preventDefault()
            isAbrindoCampoRef.current = false
          }}
        >
          <DropdownMenuItem
            onSelect={() => {
              isAbrindoCampoRef.current = true
              onMudarEdicao(true)
            }}
          >
            <Pencil /> Renomear
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => void excluirSubtarefa(subtarefa.id)}
          >
            <Trash2 /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
