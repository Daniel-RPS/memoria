import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { Subtask } from '@/db/types'
import { useAcoesSubtarefa } from '@/features/dia/hooks/use-acoes-subtarefa'
import { AlcaArrastar } from '@/features/dia/components/alca-arrastar'
import { TituloEditavel } from '@/components/titulo-editavel'

interface ItemSubtarefaProps {
  subtarefa: Subtask
}

/** Subtarefa: alça, caixa de seleção, título editável e botão de excluir. */
export function ItemSubtarefa({ subtarefa }: ItemSubtarefaProps) {
  const { definirConclusaoSubtarefa, renomearSubtarefa, excluirSubtarefa } = useAcoesSubtarefa()
  const [isEditando, setIsEditando] = useState(false)
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
    setIsEditando(false)
    if (titulo !== subtarefa.titulo) void renomearSubtarefa(subtarefa.id, titulo)
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'group/linha relative flex min-h-9 items-center gap-2 bg-papel pr-2',
        isDragging && 'z-10 rounded-sm ring-2 ring-caneta/40',
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
        className="size-4 rounded-[3px] border-[1.5px] border-tinta/70 data-[state=checked]:border-caneta data-[state=checked]:bg-caneta"
      />
      <div className="min-w-0 flex-1 py-1.5 pl-1">
        <TituloEditavel
          titulo={subtarefa.titulo}
          isEditando={isEditando}
          onIniciarEdicao={() => setIsEditando(true)}
          onSalvar={handleSalvarTitulo}
          onCancelar={() => setIsEditando(false)}
          className={cn(
            'text-[0.9375rem]',
            subtarefa.concluida && 'text-grafite line-through decoration-tinta/50',
          )}
        />
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Excluir ${subtarefa.titulo}`}
        onClick={() => void excluirSubtarefa(subtarefa.id)}
        className="text-grafite opacity-0 group-hover/linha:opacity-100 focus-visible:opacity-100"
      >
        <X />
      </Button>
    </li>
  )
}
