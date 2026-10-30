import { useState } from 'react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import type { DataLocal, Task } from '@/db/types'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { iniciaisDosDias } from '@/lib/calendario'
import { somarDias } from '@/lib/datas'
import { nomeDoDia } from '@/lib/mover'
import { separarDoDia } from '@/lib/tarefas'
import { pendentesDo, podeCopiarGrupo, progressoDoGrupo, type GrupoDoDia } from '@/lib/grupos'
import { CelulaDia, PREFIXO_CELULA } from '@/features/mes/components/celula-dia'
import { ChipGrupo, ChipTarefa } from '@/features/mes/components/chip-tarefa'

interface GradeMesProps {
  inicioDoMes: DataLocal
  semanas: DataLocal[][]
  tarefas: Task[]
  /** Cards do período: aparecem como um chip ("Casa · 2") e contam os itens no dia. */
  grupos: GrupoDoDia[]
  hoje: DataLocal
}

/** Distância mínima do ponteiro antes de arrastar, para o clique no chip abrir o dia. */
const DISTANCIA_PARA_ARRASTAR = 4
const DIAS_NA_SEMANA = 7

const SALTO_POR_TECLA: Record<string, number> = {
  ArrowRight: 1,
  ArrowLeft: -1,
  ArrowDown: DIAS_NA_SEMANA,
  ArrowUp: -DIAS_NA_SEMANA,
}

const diaDaCelula = (id: string | number) => String(id).slice(PREFIXO_CELULA.length)

/** Pelo teclado, as setas andam um dia para os lados e uma semana para cima e para baixo. */
const coordenadasDaGrade: KeyboardCoordinateGetter = (evento, { context }) => {
  const salto = SALTO_POR_TECLA[evento.code]
  const { active, over, droppableRects, collisionRect } = context
  if (salto === undefined || !active || !collisionRect) return undefined
  evento.preventDefault()
  const atual = over ? diaDaCelula(over.id) : (active.data.current?.data as DataLocal)
  const destino = droppableRects.get(`${PREFIXO_CELULA}${somarDias(atual, salto)}`)
  if (!destino) return undefined
  return {
    x: destino.left + destino.width / 2 - collisionRect.width / 2,
    y: destino.top + destino.height / 2 - collisionRect.height / 2,
  }
}

/** Com o ponteiro vale a célula sob ele; pelo teclado, a mais próxima. */
const detectarCelula: CollisionDetection = (argumentos) => {
  const sobPonteiro = pointerWithin(argumentos)
  return sobPonteiro.length > 0 ? sobPonteiro : closestCenter(argumentos)
}

const instrucoesLeitorDeTela = {
  draggable:
    'Para mover para outro dia, pressione espaço. As setas andam um dia para os lados e uma semana para cima e para baixo. Espaço de novo solta. Esc cancela.',
}

/**
 * Grade do mês; arrastar uma tarefa para outra célula muda o dia dela. Arrastar o chip de um
 * card copia os itens pendentes para o card da mesma série naquele dia.
 */
export function GradeMes({ inicioDoMes, semanas, tarefas, grupos, hoje }: GradeMesProps) {
  const { mover } = useMoverTarefas()
  const [ativa, setAtiva] = useState<Task | null>(null)
  const [grupoAtivo, setGrupoAtivo] = useState<GrupoDoDia | null>(null)
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DISTANCIA_PARA_ARRASTAR } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: coordenadasDaGrade,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )
  const dias = iniciaisDosDias()
  const tituloDe = (id: string | number) =>
    tarefas.find((tarefa) => tarefa.id === String(id))?.titulo ??
    grupos.find((grupo) => grupo.card.id === String(id))?.serie.titulo ??
    'tarefa'

  const anuncios: Announcements = {
    onDragStart: ({ active }) => `Movendo ${tituloDe(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${tituloDe(active.id)} sobre ${nomeDoDia(diaDaCelula(over.id), hoje)}.` : '',
    onDragEnd: ({ active, over }) =>
      over ? `${tituloDe(active.id)} solta em ${nomeDoDia(diaDaCelula(over.id), hoje)}.` : '',
    onDragCancel: ({ active }) => `Movimento de ${tituloDe(active.id)} cancelado.`,
  }

  function handleDragStart({ active }: DragStartEvent) {
    setAtiva(tarefas.find((tarefa) => tarefa.id === String(active.id)) ?? null)
    setGrupoAtivo(grupos.find((grupo) => grupo.card.id === String(active.id)) ?? null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setAtiva(null)
    setGrupoAtivo(null)
    if (!over) return
    const destino = diaDaCelula(over.id)
    if (destino === active.data.current?.data) return
    const id = String(active.id)
    if (active.data.current?.isGrupo) void mover([], destino, { grupos: [id] })
    else void mover([id], destino)
  }

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={detectarCelula}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setAtiva(null)
        setGrupoAtivo(null)
      }}
      accessibility={{ announcements: anuncios, screenReaderInstructions: instrucoesLeitorDeTela }}
    >
      <div className="mt-8 overflow-hidden rounded-md border border-pauta bg-papel">
        <div className="grid grid-cols-7 border-b border-pauta" aria-hidden>
          {dias.map((dia) => (
            <div
              key={dia.completa}
              className="px-2 py-1.5 text-xs font-semibold text-grafite capitalize"
            >
              {dia.curta}
            </div>
          ))}
        </div>
        <ol aria-label="Dias do mês" className="grid grid-cols-7">
          {semanas.flat().map((data) => {
            const doDia = tarefas.filter((tarefa) => tarefa.data === data)
            const { pendentes, concluidas } = separarDoDia(doDia)
            const gruposDoDia = grupos.filter((grupo) => grupo.card.data === data)
            const progressos = gruposDoDia.map(progressoDoGrupo)
            return (
              <CelulaDia
                key={data}
                data={data}
                hoje={hoje}
                inicioDoMes={inicioDoMes}
                pendentes={pendentes}
                gruposComPendentes={gruposDoDia.filter(podeCopiarGrupo)}
                quantidadePendentes={
                  pendentes.length +
                  progressos.reduce((total, progresso) => total + progresso.pendentes, 0)
                }
                quantidadeConcluidas={
                  concluidas.length +
                  progressos.reduce((total, progresso) => total + progresso.feitos, 0)
                }
              />
            )
          })}
        </ol>
      </div>
      <DragOverlay dropAnimation={null}>
        {ativa && <ChipTarefa tarefa={ativa} hoje={hoje} isSobreposto />}
        {grupoAtivo && (
          <ChipGrupo
            grupo={grupoAtivo}
            quantidade={pendentesDo(grupoAtivo).length}
            hoje={hoje}
            isSobreposto
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
