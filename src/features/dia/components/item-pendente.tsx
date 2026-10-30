import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from 'cn'
import type { DataLocal, Task } from '@/db/types'
import { LinhaTarefa } from '@/features/dia/components/linha-tarefa'

interface ItemPendenteProps {
  tarefa: Task
  hoje: DataLocal
}

/** Linha de tarefa pendente que pode ser arrastada pela alça. */
export function ItemPendente({ tarefa, hoje }: ItemPendenteProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tarefa.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative bg-papel', isDragging && 'z-10 rounded-sm ring-2 ring-caneta/40')}
    >
      <LinhaTarefa
        tarefa={tarefa}
        hoje={hoje}
        alca={
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Mover ${tarefa.titulo}`}
            className="flex h-8 w-5 cursor-grab touch-none items-center justify-center rounded-sm text-grafite opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-caneta active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </li>
  )
}
