import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from 'cn'
import type { DataLocal, Subtask, Task } from '@/db/types'
import { AlcaArrastar } from '@/components/alca-arrastar'
import { LinhaTarefa } from '@/features/dia/components/linha-tarefa'

interface ItemPendenteProps {
  tarefa: Task
  subtarefas: Subtask[]
  hoje: DataLocal
}

/** Linha de tarefa pendente que pode ser arrastada pela alça. */
export function ItemPendente({ tarefa, subtarefas, hoje }: ItemPendenteProps) {
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
      data-flip-id={tarefa.id}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative bg-papel', isDragging && 'z-10 rounded-sm ring-2 ring-caneta/40')}
    >
      <LinhaTarefa
        tarefa={tarefa}
        subtarefas={subtarefas}
        hoje={hoje}
        alca={
          <AlcaArrastar
            rotulo={`Mover ${tarefa.titulo}`}
            ref={setActivatorNodeRef}
            attributes={attributes}
            listeners={listeners}
          />
        }
      />
    </li>
  )
}
