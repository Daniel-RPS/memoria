import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DataLocal } from '@/db/types'
import type { GrupoDoDia } from '@/lib/grupos'
import { CartaoGrupo } from '@/features/semana/components/cartao-grupo'

interface ItemGrupoSemanaProps {
  grupo: GrupoDoDia
  hoje: DataLocal
}

/**
 * Card da semana na coluna do dia. Arrastar o card: no mesmo dia reordena; em outro dia leva
 * os pendentes (o card fica onde está).
 */
export function ItemGrupoSemana({ grupo, hoje }: ItemGrupoSemanaProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id: grupo.card.id })

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }}>
      <CartaoGrupo
        grupo={grupo}
        hoje={hoje}
        arrasto={{ ref: setActivatorNodeRef, attributes, listeners }}
      />
    </li>
  )
}
