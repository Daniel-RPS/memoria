import { useState, type ReactNode } from 'react'
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
import { inserirBloco } from '@/domain/selecao-em-lote'

/** Tarefas e itens têm `titulo`; categorias têm `nome`. Usado nos anúncios do leitor de tela. */
type ItemComTitulo = { id: string; titulo: string } | { id: string; nome: string }

function textoDe(item: ItemComTitulo) {
  return 'titulo' in item ? item.titulo : item.nome
}

interface ListaOrdenavelProps<T extends ItemComTitulo> {
  itens: T[]
  /** Nome acessível da lista, ex.: "Pendentes". */
  rotulo: string
  onReordenar: (idsEmOrdem: string[], idMovido: string) => Promise<unknown>
  renderItem: (item: T) => ReactNode
  className?: string
  /**
   * Selecionados da lista: arrastar um deles leva todos juntos (na ordem), por
   * `onReordenarLote`, que recebe a lista final e os movidos.
   */
  idsSelecionados?: Set<string>
  onReordenarLote?: (idsEmOrdem: string[], movidos: string[]) => Promise<unknown>
}

/** Distância mínima do ponteiro antes de começar a arrastar, para não roubar cliques. */
const DISTANCIA_PARA_ARRASTAR = 4

const instrucoesLeitorDeTela = {
  draggable:
    'Para mover, pressione espaço. Use as setas para cima e para baixo e espaço de novo para soltar. Esc cancela.',
}

/**
 * Lista reordenável por arrastar (mouse ou teclado), com anúncios em pt-BR.
 * Mostra a nova ordem na hora e aguarda o banco confirmar.
 */
export function ListaOrdenavel<T extends ItemComTitulo>({
  itens,
  rotulo,
  onReordenar,
  renderItem,
  className,
  idsSelecionados,
  onReordenarLote,
}: ListaOrdenavelProps<T>) {
  const [idsOtimistas, setIdsOtimistas] = useState<string[] | null>(null)
  const [itensAnteriores, setItensAnteriores] = useState(itens)
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DISTANCIA_PARA_ARRASTAR } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Quando o banco devolve a ordem gravada, a ordem otimista deixa de ser necessária.
  if (itens !== itensAnteriores) {
    setItensAnteriores(itens)
    setIdsOtimistas(null)
  }

  const porId = new Map(itens.map((item) => [item.id, item]))
  const ids = idsOtimistas ?? itens.map((item) => item.id)
  const tituloDe = (id: string | number) => {
    const item = porId.get(String(id))
    return item ? textoDe(item) : 'item'
  }
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
    const movidos = ids.filter((id) => idsSelecionados?.has(id))
    const isLote =
      onReordenarLote !== undefined &&
      idsSelecionados !== undefined &&
      idsSelecionados.has(String(active.id)) &&
      movidos.length > 1
    if (isLote) {
      const final = inserirBloco(ids, movidos, String(over.id))
      if (final.join() === ids.join()) return
      setIdsOtimistas(final)
      void onReordenarLote(final, movidos)
      return
    }
    const novaOrdem = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
    setIdsOtimistas(novaOrdem)
    void onReordenar(novaOrdem, String(active.id))
  }

  if (itens.length === 0) return null

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{ announcements: anuncios, screenReaderInstructions: instrucoesLeitorDeTela }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul aria-label={rotulo} className={className}>
          {ids.map((id) => {
            const item = porId.get(id)
            return item ? renderItem(item) : null
          })}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
