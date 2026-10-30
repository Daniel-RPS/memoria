import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from 'cn'
import type { DataLocal } from '@/db/types'
import type { GrupoDoDia } from '@/lib/grupos'
import { CartaoGrupo } from '@/features/semana/components/cartao-grupo'

interface ItemGrupoSemanaProps {
  grupo: GrupoDoDia
  hoje: DataLocal
}

/** Card da semana na coluna do dia; o cabeçalho arrasta o card inteiro. */
export function ItemGrupoSemana({ grupo, hoje }: ItemGrupoSemanaProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: grupo.instancia.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && 'opacity-30')}
    >
      <CartaoGrupo
        grupo={grupo}
        hoje={hoje}
        cabecalho={{ ref: setActivatorNodeRef, attributes, listeners }}
      />
    </li>
  )
}
