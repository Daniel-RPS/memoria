import { useState } from 'react'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { reordenarTarefa, soltarTarefaNoDia } from '@/db/repositories/task-repository'
import type { DataLocal, GroupItem, Subtask, Task } from '@/db/types'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { idDaEntrada, pendentesDo, textoPreviaLevar, type GrupoDoDia } from '@/lib/grupos'
import { nomeDoDia } from '@/lib/mover'
import { colunaDe, moverEntreColunas, type Colunas } from '@/lib/quadro'
import { CartaoGrupo } from '@/features/semana/components/cartao-grupo'
import { ColunaDia, PREFIXO_COLUNA } from '@/features/semana/components/coluna-dia'
import { CartaoTarefa } from '@/features/semana/components/cartao-tarefa'
import type { DiaDaSemana } from '@/features/semana/hooks/use-tarefas-da-semana'

interface QuadroSemanaProps {
  semana: DiaDaSemana[]
  subtarefasPorTarefa: Map<string, Subtask[]>
  hoje: DataLocal
}

/** Distância mínima do ponteiro antes de arrastar, para o clique no título continuar funcionando. */
const DISTANCIA_PARA_ARRASTAR = 4

const instrucoesLeitorDeTela = {
  draggable:
    'Para mover, pressione espaço. Use as setas para trocar de posição ou de dia e espaço de novo para soltar. Esc cancela. Grupos ficam no dia: só os itens pendentes vão para o outro dia.',
}

function colunasDe(semana: DiaDaSemana[]): Colunas {
  return Object.fromEntries(semana.map((dia) => [dia.data, dia.entradas.map(idDaEntrada)]))
}

/**
 * Sete colunas. Tarefa solta arrastada para outro dia é MOVIDA. Card arrastado para outro dia
 * fica onde está e os itens pendentes vão juntos para o card da mesma série no destino (ou
 * voltam ao card de onde vieram). Um item arrastado pela alça vai sozinho.
 */
export function QuadroSemana({ semana, subtarefasPorTarefa, hoje }: QuadroSemanaProps) {
  const { mover } = useMoverTarefas()
  const [colunas, setColunas] = useState(() => colunasDe(semana))
  const [semanaAnterior, setSemanaAnterior] = useState(semana)
  const [idAtivo, setIdAtivo] = useState<string | null>(null)
  const [origem, setOrigem] = useState<DataLocal | null>(null)
  const [diaSobre, setDiaSobre] = useState<DataLocal | null>(null)
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DISTANCIA_PARA_ARRASTAR } }),
    // Só espaço inicia o arrastar: Enter fica para abrir o link do dia no título.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )

  // Quando o banco devolve a semana gravada, as colunas otimistas são substituídas.
  if (semana !== semanaAnterior && idAtivo === null) {
    setSemanaAnterior(semana)
    setColunas(colunasDe(semana))
  }

  const tarefaPorId = new Map<string, Task>()
  const grupoPorId = new Map<string, GrupoDoDia>()
  /** Itens de card: arrastam sozinhos, mas não ocupam lugar nas colunas. */
  const itemPorId = new Map<string, { item: GroupItem; data: DataLocal }>()
  for (const dia of semana) {
    for (const entrada of dia.entradas) {
      if (entrada.tipo === 'tarefa') tarefaPorId.set(entrada.tarefa.id, entrada.tarefa)
      else {
        grupoPorId.set(entrada.grupo.card.id, entrada.grupo)
        for (const item of pendentesDo(entrada.grupo)) {
          itemPorId.set(item.id, { item, data: dia.data })
        }
      }
    }
  }
  const tituloDe = (id: string | number) =>
    tarefaPorId.get(String(id))?.titulo ??
    itemPorId.get(String(id))?.item.titulo ??
    grupoPorId.get(String(id))?.serie.titulo ??
    'tarefa'

  function colunaDoAlvo(id: string) {
    return id.startsWith(PREFIXO_COLUNA) ? id.slice(PREFIXO_COLUNA.length) : colunaDe(colunas, id)
  }

  /** "Casa · 2 pendentes → 03/11" ou "Fazer janta → 03/11"; vazio se nada iria. */
  function previaDoLevar(id: string, destino: DataLocal) {
    const item = itemPorId.get(id)
    if (item) return textoPreviaLevar(item.item.titulo, destino)
    const grupo = grupoPorId.get(id)
    const pendentes = grupo ? pendentesDo(grupo).length : 0
    return grupo && pendentes > 0 ? textoPreviaLevar(grupo.serie.titulo, destino, pendentes) : ''
  }

  const anuncios: Announcements = {
    onDragStart: ({ active }) => `Movendo ${tituloDe(active.id)}.`,
    onDragOver: ({ active, over }) => {
      const dia = over ? colunaDoAlvo(String(over.id)) : undefined
      if (!dia) return ''
      const id = String(active.id)
      if (dia !== origem && previaDoLevar(id, dia)) return `${previaDoLevar(id, dia)}.`
      return `${tituloDe(id)} sobre ${nomeDoDia(dia, hoje)}.`
    },
    onDragEnd: ({ active, over }) => {
      const dia = over ? colunaDoAlvo(String(over.id)) : undefined
      return dia ? `${tituloDe(active.id)} solta em ${nomeDoDia(dia, hoje)}.` : ''
    },
    onDragCancel: ({ active }) => `Movimento de ${tituloDe(active.id)} cancelado.`,
  }

  function handleDragStart({ active }: DragStartEvent) {
    const id = String(active.id)
    const dia = colunaDe(colunas, id) ?? itemPorId.get(id)?.data ?? null
    setIdAtivo(id)
    setOrigem(dia)
    setDiaSobre(dia)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const id = String(active.id)
    const destino = colunaDoAlvo(String(over.id))
    setDiaSobre(destino ?? null)
    // Card e item não saem do lugar: o destino recebe a cópia só ao soltar.
    if (!tarefaPorId.has(id)) return
    const atual = colunaDe(colunas, id)
    if (!destino || !atual || destino === atual) return
    const indice = String(over.id).startsWith(PREFIXO_COLUNA)
      ? undefined
      : colunas[destino].indexOf(String(over.id))
    setColunas((anteriores) => moverEntreColunas(anteriores, id, destino, indice))
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id)
    const diaDeOrigem = origem
    setIdAtivo(null)
    setOrigem(null)
    setDiaSobre(null)
    if (!over || !diaDeOrigem) return

    const destino = colunaDoAlvo(String(over.id))
    if (!destino) return
    if (itemPorId.has(id)) {
      if (destino !== diaDeOrigem) void mover([], destino, { itens: [id] })
      return
    }
    if (grupoPorId.has(id) && destino !== diaDeOrigem) {
      void mover([], destino, { grupos: [id] })
      return
    }
    // Dentro do dia de destino, a posição final é a do item sob o ponteiro.
    const indiceFinal = String(over.id).startsWith(PREFIXO_COLUNA)
      ? undefined
      : colunas[destino].indexOf(String(over.id))
    const proximas = moverEntreColunas(colunas, id, destino, indiceFinal)
    setColunas(proximas)

    if (destino === diaDeOrigem) {
      const isMudou = proximas[destino].join() !== colunasDe(semana)[destino].join()
      if (isMudou) void reordenarTarefa(proximas[destino], id)
      return
    }
    void soltarTarefaNoDia(id, destino, proximas[destino])
  }

  function handleDragCancel() {
    setIdAtivo(null)
    setOrigem(null)
    setDiaSobre(null)
    setColunas(colunasDe(semana))
  }

  const tarefaAtiva = idAtivo ? tarefaPorId.get(idAtivo) : undefined
  const grupoAtivo = idAtivo ? grupoPorId.get(idAtivo) : undefined
  const itemAtivo = idAtivo ? itemPorId.get(idAtivo) : undefined
  const isLevando = idAtivo !== null && !tarefaAtiva && diaSobre !== null && diaSobre !== origem

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{ announcements: anuncios, screenReaderInstructions: instrucoesLeitorDeTela }}
    >
      <div className="mt-8 grid grid-cols-1 overflow-hidden rounded-md border border-pauta bg-papel xl:grid-cols-7">
        {semana.map((dia) => (
          <ColunaDia
            key={dia.data}
            data={dia.data}
            hoje={hoje}
            ids={colunas[dia.data]}
            tarefaPorId={tarefaPorId}
            grupoPorId={grupoPorId}
            quantidadeConcluidas={dia.quantidadeConcluidas}
            subtarefasPorTarefa={subtarefasPorTarefa}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {tarefaAtiva && (
          <CartaoTarefa
            tarefa={tarefaAtiva}
            subtarefas={subtarefasPorTarefa.get(tarefaAtiva.id) ?? []}
            hoje={hoje}
            isSobreposto
          />
        )}
        {grupoAtivo && <CartaoGrupo grupo={grupoAtivo} hoje={hoje} isSobreposto />}
        {itemAtivo && (
          <div className="rotate-1 rounded-sm border border-pauta bg-papel px-2.5 py-1.5 text-[0.9375rem] shadow-lg ring-2 ring-caneta/40">
            {itemAtivo.item.titulo}
          </div>
        )}
        {isLevando && idAtivo && (
          <p className="mt-1.5 w-max max-w-64 rounded-sm bg-tinta px-2 py-1 text-xs font-semibold text-papel shadow-md">
            {previaDoLevar(idAtivo, diaSobre)}
          </p>
        )}
      </DragOverlay>
    </DndContext>
  )
}
