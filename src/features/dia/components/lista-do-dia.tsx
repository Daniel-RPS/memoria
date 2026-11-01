import { useState } from 'react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from 'cn'
import type { DataLocal, GroupItem, Subtask, Task } from '@/db/types'
import { idDaEntrada, pendentesDo, type EntradaDoDia, type GrupoDoDia } from '@/lib/grupos'
import { colunaDe, moverEntreColunas, type Colunas } from '@/lib/quadro'
import { useAcoesGrupo } from '@/features/dia/hooks/use-acoes-grupo'
import { useAcoesTarefa } from '@/features/dia/hooks/use-acoes-tarefa'
import { AlcaArrastar } from '@/components/alca-arrastar'
import { CardGrupo } from '@/features/dia/components/card-grupo'
import { ItemPendente } from '@/features/dia/components/item-pendente'
import { LinhaItem } from '@/features/dia/components/linha-item'

interface ListaDoDiaProps {
  data: DataLocal
  entradas: EntradaDoDia[]
  subtarefasPorTarefa: Map<string, Subtask[]>
  hoje: DataLocal
}

/** Coluna das tarefas soltas e cards; as outras colunas são os itens pendentes de cada card. */
const RAIZ = 'raiz'
/** Prefixo da área de soltar dos itens de um card (o resto é o id do card). */
const PREFIXO_ITENS = 'itens:'
const DISTANCIA_PARA_ARRASTAR = 4
const SEM_SUBTAREFAS: Subtask[] = []

const instrucoesLeitorDeTela = {
  draggable:
    'Para mover, pressione espaço. Use as setas para cima e para baixo e espaço de novo para soltar. Esc cancela. Para colocar uma tarefa num grupo ou tirá-la, use o menu de ações.',
}

function colunasDe(entradas: EntradaDoDia[]): Colunas {
  const colunas: Colunas = { [RAIZ]: entradas.map(idDaEntrada) }
  for (const entrada of entradas) {
    if (entrada.tipo === 'grupo') {
      colunas[entrada.grupo.card.id] = pendentesDo(entrada.grupo).map((item) => item.id)
    }
  }
  return colunas
}

/**
 * Pendentes do dia: tarefas soltas e cards, reordenáveis entre si; itens pendentes
 * reordenáveis dentro do card. Arrastar uma tarefa para dentro de um card a torna item;
 * arrastar um item para fora o torna tarefa solta.
 */
export function ListaDoDia({ data, entradas, subtarefasPorTarefa, hoje }: ListaDoDiaProps) {
  const { reordenarTarefa, colocarNoGrupo } = useAcoesTarefa()
  const { reordenarItem, tirarDoGrupo, passarItemParaCard } = useAcoesGrupo()
  const [colunas, setColunas] = useState(() => colunasDe(entradas))
  const [entradasAnteriores, setEntradasAnteriores] = useState(entradas)
  const [idAtivo, setIdAtivo] = useState<string | null>(null)
  const [origem, setOrigem] = useState<string | null>(null)
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DISTANCIA_PARA_ARRASTAR } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Quando o banco devolve o dia gravado, a ordem otimista é substituída.
  if (entradas !== entradasAnteriores && idAtivo === null) {
    setEntradasAnteriores(entradas)
    setColunas(colunasDe(entradas))
  }

  const tarefaPorId = new Map<string, Task>()
  const grupoPorId = new Map<string, GrupoDoDia>()
  const itemPorId = new Map<string, GroupItem>()
  for (const entrada of entradas) {
    if (entrada.tipo === 'tarefa') tarefaPorId.set(entrada.tarefa.id, entrada.tarefa)
    else {
      grupoPorId.set(entrada.grupo.card.id, entrada.grupo)
      for (const item of pendentesDo(entrada.grupo)) itemPorId.set(item.id, item)
    }
  }
  const tituloDe = (id: string | number) =>
    tarefaPorId.get(String(id))?.titulo ??
    itemPorId.get(String(id))?.titulo ??
    grupoPorId.get(String(id))?.serie.titulo ??
    'item'

  /** Coluna para onde vai quem está sobre `id` (um item, uma entrada ou a área de um card). */
  function colunaDoAlvo(id: string) {
    return id.startsWith(PREFIXO_ITENS) ? id.slice(PREFIXO_ITENS.length) : colunaDe(colunas, id)
  }

  const detectarAlvo: CollisionDetection = (argumentos) => {
    const ativo = String(argumentos.active.id)
    const so = (filtro: (id: string) => boolean) => ({
      ...argumentos,
      droppableContainers: argumentos.droppableContainers.filter(
        (alvo) => String(alvo.id) !== ativo && filtro(String(alvo.id)),
      ),
    })
    const naRaiz = (id: string) => colunas[RAIZ].includes(id)
    // Card só se reordena entre as entradas do dia (não entra em outro card).
    if (grupoPorId.has(ativo)) return closestCenter(so(naRaiz))

    // Pelo teclado, só reordena na lista em que está.
    if (!argumentos.pointerCoordinates) {
      const coluna = colunaDe(colunas, ativo) ?? RAIZ
      return closestCenter(so((id) => colunas[coluna].includes(id)))
    }
    const dentroDeCard = (id: string) => {
      const coluna = colunaDoAlvo(id)
      return coluna !== undefined && coluna !== RAIZ
    }
    const sobCard = pointerWithin(so(dentroDeCard))
    if (sobCard.length > 0) {
      const card = colunaDoAlvo(String(sobCard[0].id))
      return closestCenter(so((id) => dentroDeCard(id) && colunaDoAlvo(id) === card))
    }
    return closestCenter(so(naRaiz))
  }

  const anuncios: Announcements = {
    onDragStart: ({ active }) => `Movendo ${tituloDe(active.id)}.`,
    onDragOver: ({ active, over }) => {
      if (!over) return ''
      const coluna = colunaDoAlvo(String(over.id))
      if (coluna && coluna !== RAIZ && grupoPorId.has(coluna)) {
        return `${tituloDe(active.id)} no grupo ${tituloDe(coluna)}.`
      }
      return `${tituloDe(active.id)} sobre ${tituloDe(over.id)}.`
    },
    onDragEnd: ({ active, over }) => (over ? `${tituloDe(active.id)} solta.` : ''),
    onDragCancel: ({ active }) => `Movimento de ${tituloDe(active.id)} cancelado.`,
  }

  function indiceNoDestino(destino: string, idAlvo: string) {
    return idAlvo.startsWith(PREFIXO_ITENS) ? undefined : colunas[destino].indexOf(idAlvo)
  }

  function handleDragStart({ active }: DragStartEvent) {
    setIdAtivo(String(active.id))
    setOrigem(colunaDe(colunas, String(active.id)) ?? null)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const id = String(active.id)
    const destino = colunaDoAlvo(String(over.id))
    const atual = colunaDe(colunas, id)
    if (!destino || !atual || destino === atual) return
    const indice = indiceNoDestino(destino, String(over.id))
    setColunas((anteriores) => moverEntreColunas(anteriores, id, destino, indice))
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id)
    const colunaDeOrigem = origem
    setIdAtivo(null)
    setOrigem(null)
    if (!over || !colunaDeOrigem) return
    const destino = colunaDoAlvo(String(over.id))
    if (!destino) return
    const proximas = moverEntreColunas(
      colunas,
      id,
      destino,
      indiceNoDestino(destino, String(over.id)),
    )
    setColunas(proximas)

    if (destino === colunaDeOrigem) {
      const isMudou = proximas[destino].join() !== colunasDe(entradas)[destino]?.join()
      if (!isMudou) return
      if (destino === RAIZ) void reordenarTarefa(proximas[destino], id)
      else void reordenarItem(proximas[destino], id)
    } else if (destino === RAIZ) {
      void tirarDoGrupo(id, proximas[RAIZ])
    } else if (colunaDeOrigem === RAIZ) {
      void colocarNoGrupo(id, destino, proximas[destino])
    } else {
      void passarItemParaCard(id, destino, proximas[destino])
    }
  }

  function handleDragCancel() {
    setIdAtivo(null)
    setOrigem(null)
    setColunas(colunasDe(entradas))
  }

  if (entradas.length === 0) return null

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={detectarAlvo}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{ announcements: anuncios, screenReaderInstructions: instrucoesLeitorDeTela }}
    >
      <SortableContext id={RAIZ} items={colunas[RAIZ]} strategy={verticalListSortingStrategy}>
        <ul aria-label="Pendentes">
          {colunas[RAIZ].map((id) => {
            const grupo = grupoPorId.get(id)
            if (grupo) {
              return (
                <CardOrdenavel
                  key={id}
                  grupo={grupo}
                  idsPendentes={colunas[id] ?? []}
                  tarefaPorId={tarefaPorId}
                  itemPorId={itemPorId}
                  subtarefasPorTarefa={subtarefasPorTarefa}
                  hoje={hoje}
                />
              )
            }
            return (
              <EntradaSolta
                key={id}
                id={id}
                tarefaPorId={tarefaPorId}
                itemPorId={itemPorId}
                subtarefasPorTarefa={subtarefasPorTarefa}
                hoje={hoje}
                data={data}
              />
            )
          })}
        </ul>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {idAtivo && (
          <div className="rotate-1 rounded-sm border border-pauta bg-papel px-4 py-2.5 font-semibold shadow-lg ring-2 ring-caneta/40">
            {tituloDe(idAtivo)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

interface EntradaProps {
  id: string
  tarefaPorId: Map<string, Task>
  itemPorId: Map<string, GroupItem>
  subtarefasPorTarefa: Map<string, Subtask[]>
  hoje: DataLocal
  /** Dia da folha (para itens que estão de passagem fora do card). */
  data: DataLocal
}

/**
 * Tarefa solta ou, durante o arrastar, um item que está saindo do card (ainda é item até
 * o banco gravar).
 */
function EntradaSolta({
  id,
  tarefaPorId,
  itemPorId,
  subtarefasPorTarefa,
  hoje,
  data,
}: EntradaProps) {
  const tarefa = tarefaPorId.get(id)
  if (tarefa) {
    return (
      <ItemPendente
        tarefa={tarefa}
        subtarefas={subtarefasPorTarefa.get(id) ?? SEM_SUBTAREFAS}
        hoje={hoje}
      />
    )
  }
  const item = itemPorId.get(id)
  return item ? <ItemDeGrupoOrdenavel item={item} data={data} hoje={hoje} /> : null
}

/** Item pendente do card, arrastável pela alça (reordena, sai do card ou vai para outro). */
function ItemDeGrupoOrdenavel({
  item,
  data,
  hoje,
}: {
  item: GroupItem
  data: DataLocal
  hoje: DataLocal
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative bg-papel', isDragging && 'z-10 opacity-40')}
    >
      <LinhaItem
        item={item}
        data={data}
        hoje={hoje}
        alca={
          <AlcaArrastar
            rotulo={`Mover ${item.titulo}`}
            ref={setActivatorNodeRef}
            attributes={attributes}
            listeners={listeners}
          />
        }
      />
    </li>
  )
}

interface CardOrdenavelProps {
  grupo: GrupoDoDia
  /** Itens pendentes na ordem mostrada (pode incluir uma tarefa sendo arrastada para dentro). */
  idsPendentes: string[]
  tarefaPorId: Map<string, Task>
  itemPorId: Map<string, GroupItem>
  subtarefasPorTarefa: Map<string, Subtask[]>
  hoje: DataLocal
}

/** Card que se arrasta pela alça do cabeçalho e recebe itens soltos na lista dele. */
function CardOrdenavel({
  grupo,
  idsPendentes,
  tarefaPorId,
  itemPorId,
  subtarefasPorTarefa,
  hoje,
}: CardOrdenavelProps) {
  const { id, data } = grupo.card
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })
  const { setNodeRef: setAreaRef, isOver } = useDroppable({ id: `${PREFIXO_ITENS}${id}` })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative bg-papel', isDragging && 'z-10 opacity-40')}
    >
      <CardGrupo
        grupo={grupo}
        hoje={hoje}
        alca={
          <AlcaArrastar
            rotulo={`Mover grupo ${grupo.serie.titulo}`}
            ref={setActivatorNodeRef}
            attributes={attributes}
            listeners={listeners}
            grupoDeHover="cabecalho"
          />
        }
        pendentes={
          <SortableContext id={id} items={idsPendentes} strategy={verticalListSortingStrategy}>
            <ul
              ref={setAreaRef}
              aria-label={`Itens de ${grupo.serie.titulo}`}
              className={cn('min-h-2 transition-colors', isOver && 'bg-accent')}
            >
              {idsPendentes.map((idItem) => {
                const item = itemPorId.get(idItem)
                if (item) {
                  return <ItemDeGrupoOrdenavel key={idItem} item={item} data={data} hoje={hoje} />
                }
                // Tarefa solta passando por dentro do card durante o arrastar.
                const tarefa = tarefaPorId.get(idItem)
                return tarefa ? (
                  <ItemPendente
                    key={idItem}
                    tarefa={tarefa}
                    subtarefas={subtarefasPorTarefa.get(idItem) ?? SEM_SUBTAREFAS}
                    hoje={hoje}
                  />
                ) : null
              })}
            </ul>
          </SortableContext>
        }
      />
    </li>
  )
}
