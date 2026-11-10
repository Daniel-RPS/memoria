import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import type { Procedure } from '@/db/types'
import { reordenarProcedimentos } from '@/db/repositories/procedure-repository'
import { CartaoProcedimento } from '@/features/procedimentos/components/cartao-procedimento'
import { useOrdemOtimista } from '@/features/procedimentos/hooks/use-ordem-otimista'

interface GradeProcedimentosProps {
  procedimentos: Procedure[]
  /** Cor da faixa dos cartões (já ajustada para o tema). */
  cor: string
  /** Sem ordenar (busca ou filtro ativo): nem arrasto nem setas. */
  isOrdenavel: boolean
}

/** Distância mínima do ponteiro antes de começar a arrastar, para não roubar o clique. */
const DISTANCIA_PARA_ARRASTAR = 4

/**
 * Cartões de uma categoria em grade; arrastar com o mouse troca a ordem dentro dela (o teclado
 * usa as setas e Alt+↑/↓ do cartão).
 */
export function GradeProcedimentos({ procedimentos, cor, isOrdenavel }: GradeProcedimentosProps) {
  const porId = new Map(procedimentos.map((procedimento) => [procedimento.id, procedimento]))
  const ordem = useOrdemOtimista(procedimentos.map((procedimento) => procedimento.id))
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DISTANCIA_PARA_ARRASTAR } }),
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const ids = ordem.ids
    const nova = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
    ordem.definir(nova)
    void reordenarProcedimentos(nova, String(active.id))
  }

  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ordem.ids} strategy={rectSortingStrategy}>
        {/* Colunas pela largura (3 / 2 / 1), sem número fixo. */}
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
          {ordem.ids.map((id, posicao) => {
            const procedimento = porId.get(id)
            if (!procedimento) return null
            return (
              <li key={id} className="min-w-0">
                <CartaoProcedimento
                  procedimento={procedimento}
                  cor={cor}
                  ordem={
                    isOrdenavel
                      ? {
                          posicao,
                          canSubir: posicao > 0,
                          canDescer: posicao < ordem.ids.length - 1,
                        }
                      : undefined
                  }
                />
              </li>
            )
          })}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
