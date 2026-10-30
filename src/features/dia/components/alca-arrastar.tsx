import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'

interface AlcaArrastarProps {
  rotulo: string
  ref: (elemento: HTMLElement | null) => void
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
}

/** Alça que aparece ao passar o mouse (ou ao focar) e inicia o arrastar. */
export function AlcaArrastar({ rotulo, ref, attributes, listeners }: AlcaArrastarProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={rotulo}
      className="flex h-8 w-5 cursor-grab touch-none items-center justify-center rounded-sm text-grafite opacity-0 group-hover/linha:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-caneta active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  )
}
