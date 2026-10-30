import { useDraggable } from '@dnd-kit/core'
import { useNavigate } from 'react-router'
import { cn } from 'cn'
import type { DataLocal, Task } from '@/db/types'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { classificarTarefa } from '@/lib/categorias'

interface ChipTarefaProps {
  tarefa: Task
  hoje: DataLocal
  /** Cópia que acompanha o ponteiro enquanto arrasta. */
  isSobreposto?: boolean
}

/** Tarefa em uma linha: cor da categoria e título cortado. Atrasadas ganham o marca-texto. */
export function ChipTarefa({ tarefa, hoje, isSobreposto }: ChipTarefaProps) {
  const classificacao = classificarTarefa(tarefa, useCategoriasDoContexto())
  const isAtrasada = tarefa.data < hoje

  return (
    <span
      className={cn(
        'flex min-w-0 items-center gap-1.5 rounded-sm border-l-[3px] bg-papel px-1.5 py-0.5 text-xs leading-snug',
        isAtrasada &&
          'bg-[linear-gradient(transparent_15%,var(--marca-texto)_15%,var(--marca-texto)_85%,transparent_85%)]',
        isSobreposto && 'rotate-1 shadow-lg ring-2 ring-caneta/40',
      )}
      style={{ borderLeftColor: classificacao?.cor ?? 'var(--pauta)' }}
    >
      <span className="truncate">{tarefa.titulo}</span>
    </span>
  )
}

/** Chip que pode ser arrastado para outro dia; um clique simples abre o dia. */
export function ChipTarefaArrastavel({ tarefa, hoje }: Omit<ChipTarefaProps, 'isSobreposto'>) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: tarefa.id,
    data: { data: tarefa.data },
  })

  return (
    // `div` com papel de botão (vem de `attributes`): num <button> de verdade, soltar o
    // espaço dispara um clique e abriria o dia no meio do arrastar.
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/dia/${tarefa.data}`)}
      aria-roledescription="tarefa arrastável"
      aria-label={`${tarefa.titulo}. Espaço para mover; Enter abre o dia.`}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter') navigate(`/dia/${tarefa.data}`)
        else listeners?.onKeyDown?.(evento)
      }}
      className={cn(
        'block w-full min-w-0 cursor-grab touch-none rounded-sm text-left focus-visible:outline-2 focus-visible:outline-caneta active:cursor-grabbing',
        isDragging && 'opacity-30',
      )}
    >
      <ChipTarefa tarefa={tarefa} hoje={hoje} />
    </div>
  )
}
