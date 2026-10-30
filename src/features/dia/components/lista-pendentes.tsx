import { useState } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { DataLocal, Task } from '@/db/types'
import { useAcoesTarefa } from '@/features/dia/hooks/use-acoes-tarefa'
import { ItemPendente } from '@/features/dia/components/item-pendente'

interface ListaPendentesProps {
  pendentes: Task[]
  hoje: DataLocal
}

/** Distância mínima do ponteiro antes de começar a arrastar, para não roubar cliques. */
const DISTANCIA_PARA_ARRASTAR = 4

const instrucoesLeitorDeTela = {
  draggable:
    'Para mover a tarefa, pressione espaço. Use as setas para cima e para baixo e espaço de novo para soltar. Esc cancela.',
}

export function ListaPendentes({ pendentes, hoje }: ListaPendentesProps) {
  const { reordenarTarefa } = useAcoesTarefa()
  const [idsOtimistas, setIdsOtimistas] = useState<string[] | null>(null)
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DISTANCIA_PARA_ARRASTAR } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const [pendentesAnteriores, setPendentesAnteriores] = useState(pendentes)

  // Quando o banco devolve a ordem gravada, a ordem otimista deixa de ser necessária.
  if (pendentes !== pendentesAnteriores) {
    setPendentesAnteriores(pendentes)
    setIdsOtimistas(null)
  }

  const porId = new Map(pendentes.map((tarefa) => [tarefa.id, tarefa]))
  const ids = idsOtimistas ?? pendentes.map((tarefa) => tarefa.id)
  const tituloDe = (id: string | number) => porId.get(String(id))?.titulo ?? 'tarefa'
  const posicaoDe = (id: string | number) => ids.indexOf(String(id)) + 1

  const anuncios: Announcements = {
    onDragStart: ({ active }) => `Movendo ${tituloDe(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${tituloDe(active.id)} na posição ${posicaoDe(over.id)} de ${ids.length}.` : '',
    onDragEnd: ({ active, over }) =>
      over ? `${tituloDe(active.id)} solta na posição ${posicaoDe(over.id)}.` : '',
    onDragCancel: ({ active }) => `Movimento de ${tituloDe(active.id)} cancelado.`,
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const novaOrdem = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
    setIdsOtimistas(novaOrdem)
    void reordenarTarefa(novaOrdem, String(active.id))
  }

  if (pendentes.length === 0) return null

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{ announcements: anuncios, screenReaderInstructions: instrucoesLeitorDeTela }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul aria-label="Pendentes">
          {ids.map((id) => {
            const tarefa = porId.get(id)
            return tarefa ? <ItemPendente key={id} tarefa={tarefa} hoje={hoje} /> : null
          })}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
