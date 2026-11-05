import { useState, type ReactNode } from 'react'
import {
  closestCenter,
  DndContext,
  useDndContext,
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
import { gravarReordenacao } from '@/db/repositories/topo-repository'
import { useAnimarReordenacao } from '@/hooks/use-animar-reordenacao'
import {
  blocoDe,
  idsParaOrdemComum,
  manterBlocos,
  planejarGravacao,
  type Bloco,
} from '@/domain/ordem-de-exibicao'
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
  /** Monta as seções com as duas listas (cards e tarefas soltas), dentro do mesmo arrastar. */
  children: (listas: { grupos: ReactNode; soltas: ReactNode }) => ReactNode
}

/** Coluna dos cards de grupo do dia. */
const GRUPOS = 'grupos'
/** Coluna das tarefas soltas; as outras colunas são os itens pendentes de cada card. */
const SOLTAS = 'soltas'
/** Prefixo da área de soltar dos itens de um card (o resto é o id do card). */
const PREFIXO_ITENS = 'itens:'
/** Área de soltar da lista de tarefas soltas (recebe item tirado do card mesmo com ela vazia). */
const AREA_SOLTAS = 'area:soltas'
const DISTANCIA_PARA_ARRASTAR = 4
const SEM_SUBTAREFAS: Subtask[] = []

const instrucoesLeitorDeTela = {
  draggable:
    'Para mover, pressione espaço. Use as setas para cima e para baixo e espaço de novo para soltar. Esc cancela. Para colocar uma tarefa num grupo ou tirá-la, use o menu de ações.',
}

function colunasDe(entradas: EntradaDoDia[]): Colunas {
  const colunas: Colunas = {
    [GRUPOS]: entradas.filter((entrada) => entrada.tipo === 'grupo').map(idDaEntrada),
    [SOLTAS]: entradas.filter((entrada) => entrada.tipo === 'tarefa').map(idDaEntrada),
  }
  for (const entrada of entradas) {
    if (entrada.tipo === 'grupo') {
      colunas[entrada.grupo.card.id] = pendentesDo(entrada.grupo).map((item) => item.id)
    }
  }
  return colunas
}

/**
 * Pendentes do dia em duas listas: cards (reordenáveis entre si) e tarefas soltas (idem);
 * itens pendentes reordenáveis dentro do card. Arrastar uma tarefa para dentro de um card a
 * torna item; arrastar um item para fora o torna tarefa solta. Quem chama decide onde cada
 * lista aparece (`children`), e as duas ficam no mesmo arrastar.
 */
export function ListaDoDia({
  data,
  entradas,
  subtarefasPorTarefa,
  hoje,
  children,
}: ListaDoDiaProps) {
  const { reordenarTarefa, colocarNoGrupo } = useAcoesTarefa()
  const { tirarDoGrupo, passarItemParaCard } = useAcoesGrupo()
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

  /** Bloco de exibição da tarefa solta ou do item (cards não têm: valem como "demais"). */
  const blocoDoId = (id: string): Bloco | undefined => {
    const registro = tarefaPorId.get(id) ?? itemPorId.get(id)
    return registro ? blocoDe(registro) : undefined
  }

  /** Arrastar não atravessa blocos: o solto fora do próprio bloco para na borda dele. */
  function manterBlocosDas(proximas: Colunas): Colunas {
    return Object.fromEntries(
      Object.entries(proximas).map(([coluna, ids]) => [
        coluna,
        coluna === GRUPOS ? ids : manterBlocos(ids, blocoDoId),
      ]),
    )
  }

  /** Coluna para onde vai quem está sobre `id` (um item, uma entrada ou uma área de soltar). */
  function colunaDoAlvo(id: string) {
    if (id === AREA_SOLTAS) return SOLTAS
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
    // Card só se reordena entre os cards do dia (não entra em outro card).
    if (grupoPorId.has(ativo)) return closestCenter(so((id) => colunas[GRUPOS].includes(id)))

    // Pelo teclado, só reordena na lista em que está.
    if (!argumentos.pointerCoordinates) {
      const coluna = colunaDe(colunas, ativo) ?? SOLTAS
      return closestCenter(so((id) => colunas[coluna].includes(id)))
    }
    const dentroDeCard = (id: string) => {
      const coluna = colunaDoAlvo(id)
      return coluna !== undefined && coluna !== SOLTAS && coluna !== GRUPOS
    }
    const sobCard = pointerWithin(so(dentroDeCard))
    if (sobCard.length > 0) {
      const card = colunaDoAlvo(String(sobCard[0].id))
      return closestCenter(so((id) => dentroDeCard(id) && colunaDoAlvo(id) === card))
    }
    // Fora dos cards, a tarefa (ou o item saindo do card) fica entre as tarefas soltas.
    const nasSoltas = closestCenter(so((id) => colunas[SOLTAS].includes(id)))
    return nasSoltas.length > 0 ? nasSoltas : closestCenter(so((id) => id === AREA_SOLTAS))
  }

  const anuncios: Announcements = {
    onDragStart: ({ active }) => `Movendo ${tituloDe(active.id)}.`,
    onDragOver: ({ active, over }) => {
      if (!over) return ''
      const coluna = colunaDoAlvo(String(over.id))
      if (coluna && grupoPorId.has(coluna)) {
        return `${tituloDe(active.id)} no grupo ${tituloDe(coluna)}.`
      }
      return `${tituloDe(active.id)} sobre ${tituloDe(over.id)}.`
    },
    onDragEnd: ({ active, over }) => (over ? `${tituloDe(active.id)} solta.` : ''),
    onDragCancel: ({ active }) => `Movimento de ${tituloDe(active.id)} cancelado.`,
  }

  function indiceNoDestino(destino: string, idAlvo: string) {
    return idAlvo.startsWith(PREFIXO_ITENS) || idAlvo === AREA_SOLTAS
      ? undefined
      : colunas[destino].indexOf(idAlvo)
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
    setColunas((anteriores) => manterBlocosDas(moverEntreColunas(anteriores, id, destino, indice)))
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id)
    const colunaDeOrigem = origem
    setIdAtivo(null)
    setOrigem(null)
    if (!over || !colunaDeOrigem) return
    const destino = colunaDoAlvo(String(over.id))
    if (!destino) return
    const proximas = manterBlocosDas(
      moverEntreColunas(colunas, id, destino, indiceNoDestino(destino, String(over.id))),
    )
    setColunas(proximas)

    if (destino === colunaDeOrigem) {
      const isMudou = proximas[destino].join() !== colunasDe(entradas)[destino]?.join()
      if (!isMudou) return
      // Cards e soltas dividem a mesma escala de `ordem`: basta a posição entre os vizinhos.
      if (destino === GRUPOS) void reordenarTarefa(proximas[destino], id)
      // Soltas e itens: dentro de um bloco do topo grava só a posição dele; nos demais, a
      // `ordem` entre os vizinhos dos demais (a `ordem` do topo não segue a tela).
      else {
        const gravacao = planejarGravacao(proximas[destino], id, blocoDoId)
        void gravarReordenacao(gravacao, id, destino === SOLTAS ? 'dia' : 'card')
      }
    } else {
      // Vindo de outra lista, só os "demais" servem de vizinhos para gravar a `ordem`.
      const vizinhos = idsParaOrdemComum(proximas[destino], id, blocoDoId)
      if (destino === SOLTAS) void tirarDoGrupo(id, vizinhos)
      else if (colunaDeOrigem === SOLTAS) void colocarNoGrupo(id, destino, vizinhos)
      else void passarItemParaCard(id, destino, vizinhos)
    }
  }

  function handleDragCancel() {
    setIdAtivo(null)
    setOrigem(null)
    setColunas(colunasDe(entradas))
  }

  const grupos = (
    <SortableContext id={GRUPOS} items={colunas[GRUPOS]} strategy={verticalListSortingStrategy}>
      <ul aria-label="Grupos do dia">
        {colunas[GRUPOS].map((id) => {
          const grupo = grupoPorId.get(id)
          return grupo ? (
            <CardOrdenavel
              key={id}
              grupo={grupo}
              idsPendentes={colunas[id] ?? []}
              tarefaPorId={tarefaPorId}
              itemPorId={itemPorId}
              subtarefasPorTarefa={subtarefasPorTarefa}
              hoje={hoje}
            />
          ) : null
        })}
      </ul>
    </SortableContext>
  )
  const soltas = (
    <SortableContext id={SOLTAS} items={colunas[SOLTAS]} strategy={verticalListSortingStrategy}>
      <AreaDasSoltas chave={colunas[SOLTAS].join('|')} isArrastando={idAtivo !== null}>
        {colunas[SOLTAS].map((id) => (
          <EntradaSolta
            key={id}
            id={id}
            tarefaPorId={tarefaPorId}
            itemPorId={itemPorId}
            subtarefasPorTarefa={subtarefasPorTarefa}
            hoje={hoje}
            data={data}
          />
        ))}
      </AreaDasSoltas>
    </SortableContext>
  )

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
      {children({ grupos, soltas })}
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

/** Lista das tarefas soltas, também alvo de soltar (item tirado do card cai aqui). */
function AreaDasSoltas({
  chave,
  isArrastando,
  children,
}: {
  chave: string
  isArrastando: boolean
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: AREA_SOLTAS })
  const listaAnimada = useAnimarReordenacao(chave, isArrastando)
  return (
    <ul
      ref={(elemento) => {
        setNodeRef(elemento)
        listaAnimada(elemento)
      }}
      aria-label="Pendentes"
      className={cn('min-h-2 transition-colors', isOver && 'bg-accent')}
    >
      {children}
    </ul>
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
      data-flip-id={item.id}
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
  const { active } = useDndContext()
  const listaAnimada = useAnimarReordenacao(idsPendentes.join('|'), active !== null)

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
              ref={(elemento) => {
                setAreaRef(elemento)
                listaAnimada(elemento)
              }}
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
