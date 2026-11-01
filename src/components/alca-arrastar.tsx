import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { cn } from 'cn'

interface AlcaArrastarProps {
  rotulo: string
  ref: (elemento: HTMLElement | null) => void
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
  /** Grupo nomeado cujo hover mostra a alça: a linha da tarefa ou o cabeçalho do card. */
  grupoDeHover?: 'linha' | 'cabecalho'
}

const APARECE_NO_HOVER = {
  linha: 'group-hover/linha:opacity-100',
  cabecalho: 'group-hover/cabecalho:opacity-100',
}

/** Alça que aparece ao passar o mouse (ou ao focar) e inicia o arrastar. */
export function AlcaArrastar({
  rotulo,
  ref,
  attributes,
  listeners,
  grupoDeHover = 'linha',
}: AlcaArrastarProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={rotulo}
      className={cn(
        'flex h-8 w-5 cursor-grab touch-none items-center justify-center rounded-sm text-grafite opacity-0 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-caneta active:cursor-grabbing',
        APARECE_NO_HOVER[grupoDeHover],
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  )
}
