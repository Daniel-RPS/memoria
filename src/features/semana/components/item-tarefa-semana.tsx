import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from 'cn'
import type { DataLocal, Subtask, Task } from '@/db/types'
import { alvoDePrioridade } from '@/hooks/use-atalho-prioridade'
import { isCampoDeTexto } from '@/lib/teclado'
import { CartaoTarefa } from '@/features/semana/components/cartao-tarefa'

interface ItemTarefaSemanaProps {
  tarefa: Task
  subtarefas: Subtask[]
  hoje: DataLocal
}

/** Cartão arrastável: pelo ponteiro em qualquer ponto, ou focando e apertando espaço. */
export function ItemTarefaSemana({ tarefa, subtarefas, hoje }: ItemTarefaSemanaProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tarefa.id,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      {...alvoDePrioridade('tarefa', tarefa.id, tarefa.status === 'pendente')}
      // As subetapas abertas ficam dentro do cartão: o ponteiro nelas e o espaço num campo de
      // texto não podem arrastar a tarefa.
      onPointerDown={(evento) => {
        const isSubetapa =
          evento.target instanceof Element && evento.target.closest('[data-sem-arrasto]')
        if (!isSubetapa) listeners?.onPointerDown?.(evento)
      }}
      onKeyDown={(evento) => {
        if (!isCampoDeTexto(evento.target)) listeners?.onKeyDown?.(evento)
      }}
      // Mantém o papel de item de lista: um "botão" não pode conter a caixa e o link.
      role={undefined}
      aria-roledescription="tarefa arrastável"
      aria-label={`${tarefa.titulo}. Espaço para mover.`}
      className={cn(
        'cursor-grab touch-none rounded-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-caneta active:cursor-grabbing',
        isDragging && 'opacity-30',
      )}
    >
      <CartaoTarefa tarefa={tarefa} subtarefas={subtarefas} hoje={hoje} />
    </li>
  )
}
