import type { PointerEvent, ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from 'cn'

interface BlocoOrdenavelProps {
  /** Id da categoria (o "Sem categoria" não arrasta). */
  id: string
  nome: string
  isOrdenavel: boolean
  children: ReactNode
}

/**
 * Bloco de categoria que arrasta para cima ou para baixo: com o mouse pelo cabeçalho (o clique
 * continua abrindo e recolhendo) ou pela alça ⋮⋮ à esquerda, que também aceita o teclado.
 */
export function BlocoOrdenavel({ id, nome, isOrdenavel, children }: BlocoOrdenavelProps) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isOrdenavel })

  /** Só o cabeçalho arrasta o bloco; dentro dele, os cartões têm o próprio arrasto. */
  function handlePointerDown(evento: PointerEvent<HTMLDivElement>) {
    const alvo = evento.target
    if (alvo instanceof Element && alvo.closest('h2')) listeners?.onPointerDown?.(evento)
  }

  return (
    <div
      ref={setNodeRef}
      onPointerDown={isOrdenavel ? handlePointerDown : undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'group/bloco relative',
        isDragging && 'z-30 rounded-md bg-background/85 shadow-lg ring-1 ring-pauta',
      )}
    >
      {isOrdenavel && (
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Mover categoria ${nome}`}
          title="Arraste para mudar a ordem"
          className="absolute top-1 -left-6 flex h-6 w-5 cursor-grab items-center justify-center rounded-sm text-grafite opacity-0 transition-opacity group-focus-within/bloco:opacity-100 group-hover/bloco:opacity-100 hover:text-tinta focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-caneta active:cursor-grabbing motion-reduce:transition-none"
        >
          <GripVertical aria-hidden className="size-4" />
        </div>
      )}
      {children}
    </div>
  )
}
