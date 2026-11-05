import { useContext, useLayoutEffect, useRef, useState } from 'react'
import {
  closestCorners,
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
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { moverLote } from '@/db/repositories/lote-repository'
import { soltarTarefaNoDia } from '@/db/repositories/task-repository'
import { gravarReordenacao } from '@/db/repositories/topo-repository'
import {
  blocoDe,
  idsParaOrdemComum,
  manterBlocos,
  planejarGravacao,
  type Bloco,
} from '@/domain/ordem-de-exibicao'
import type { DataLocal, GroupItem, Subtask, Task } from '@/db/types'
import { inserirBloco } from '@/domain/selecao-em-lote'
import {
  avisarLote,
  useAtalhoDeMovimento,
  type ListaMovel,
} from '@/features/dia/hooks/use-movimento-em-lote'
import { useSelecaoDaFolha } from '@/features/dia/hooks/use-selecao'
import { useAtalhoPrioridade } from '@/hooks/use-atalho-prioridade'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { ContextoGruposSemana } from '@/features/semana/hooks/use-grupos-semana'
import { idDaEntrada, pendentesDo, textoPreviaLevar, type GrupoDoDia } from '@/lib/grupos'
import { nomeDoDia } from '@/lib/mover'
import { colunaDe, moverEntreColunas, type Colunas } from '@/lib/quadro'
import { CartaoGrupo, type DadosArrastoItem } from '@/features/semana/components/cartao-grupo'
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
/** Quanto do dia anterior ao de hoje fica à vista ao abrir com rolagem. */
const RESPIRO_ANTES_DE_HOJE = 48

const instrucoesLeitorDeTela = {
  draggable:
    'Para mover, pressione espaço. Use as setas para trocar de posição ou de dia e espaço de novo para soltar. Esc cancela. Grupos ficam no dia: só os itens pendentes vão para o outro dia.',
}

/**
 * Com o ponteiro, o dia é o da coluna sob ele: a prévia arrastada é larga e, com colunas
 * estreitas, encosta na vizinha. Dentro da coluna vale o alvo mais próximo pelos cantos, como
 * antes. Pelo teclado (sem ponteiro), só os cantos.
 */
const detectarAlvo: CollisionDetection = (argumentos) => {
  const { droppableContainers, droppableRects, pointerCoordinates } = argumentos
  if (!pointerCoordinates) return closestCorners(argumentos)
  const colunas = droppableContainers.filter((alvo) => String(alvo.id).startsWith(PREFIXO_COLUNA))
  const [colunaSob] = pointerWithin({ ...argumentos, droppableContainers: colunas })
  const coluna = colunaSob ? droppableRects.get(colunaSob.id) : undefined
  if (!coluna) return closestCorners(argumentos)
  const naColuna = droppableContainers.filter((alvo) => {
    const retangulo = droppableRects.get(alvo.id)
    if (!retangulo) return false
    const x = retangulo.left + retangulo.width / 2
    const y = retangulo.top + retangulo.height / 2
    return x >= coluna.left && x <= coluna.right && y >= coluna.top && y <= coluna.bottom
  })
  return closestCorners({ ...argumentos, droppableContainers: naColuna })
}

function colunasDe(semana: DiaDaSemana[]): Colunas {
  return Object.fromEntries(semana.map((dia) => [dia.data, dia.entradas.map(idDaEntrada)]))
}

/**
 * Sete colunas. Tarefa solta arrastada para outro dia é MOVIDA. Card arrastado para outro dia
 * fica onde está e os itens pendentes vão juntos para o card da mesma série no destino (ou
 * voltam ao card de onde vieram). Um item arrastado pela alça vai sozinho (ou, solto no próprio card, muda de posição).
 */
export function QuadroSemana({ semana, subtarefasPorTarefa, hoje }: QuadroSemanaProps) {
  const { mover } = useMoverTarefas()
  useAtalhoPrioridade()
  const gruposSemana = useContext(ContextoGruposSemana)
  // Com rolagem lateral, abre mostrando o dia de hoje (um pouco do anterior à esquerda).
  const rolagem = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const caixa = rolagem.current
    const colunaDeHoje = caixa?.querySelector<HTMLElement>('[data-hoje]')
    if (!caixa || !colunaDeHoje || caixa.scrollWidth <= caixa.clientWidth) return
    caixa.scrollLeft = Math.max(
      0,
      colunaDeHoje.offsetLeft - caixa.offsetLeft - RESPIRO_ANTES_DE_HOJE,
    )
  }, [])
  const [colunas, setColunas] = useState(() => colunasDe(semana))
  const [semanaAnterior, setSemanaAnterior] = useState(semana)
  const [idAtivo, setIdAtivo] = useState<string | null>(null)
  const [origem, setOrigem] = useState<DataLocal | null>(null)
  const [diaSobre, setDiaSobre] = useState<DataLocal | null>(null)
  /** Arrastando uma das selecionadas: todas vão juntas (ids na ordem da semana); senão `null`. */
  const [lote, setLote] = useState<string[] | null>(null)
  const selecao = useSelecaoDaFolha()
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
    if (id.startsWith(PREFIXO_COLUNA)) return id.slice(PREFIXO_COLUNA.length)
    // Itens de card só são alvo quando outro item do mesmo card está sendo arrastado.
    return colunaDe(colunas, id) ?? itemPorId.get(id)?.data
  }

  /** Bloco de exibição da tarefa solta ou do item (cards não têm: valem como "demais"). */
  const blocoDoId = (id: string): Bloco | undefined => {
    const registro = tarefaPorId.get(id) ?? itemPorId.get(id)?.item
    return registro ? blocoDe(registro) : undefined
  }

  /** Arrastar não atravessa blocos: o solto fora do próprio bloco para na borda dele. */
  function manterBlocosDas(proximas: Colunas): Colunas {
    return Object.fromEntries(
      Object.entries(proximas).map(([dia, ids]) => [dia, manterBlocos(ids, blocoDoId)]),
    )
  }

  /** Item solto sobre outro item do mesmo card: só muda a posição dentro do card. */
  function reordenarNoCard(id: string, idAlvo: string, cardId: string) {
    const grupo = grupoPorId.get(cardId)
    if (!grupo || id === idAlvo) return
    const ids = pendentesDo(grupo).map((item) => item.id)
    const novaOrdem = manterBlocos(arrayMove(ids, ids.indexOf(id), ids.indexOf(idAlvo)), blocoDoId)
    void gravarReordenacao(planejarGravacao(novaOrdem, id, blocoDoId), id, 'card')
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
      if (itemPorId.has(String(over?.id))) {
        return `${tituloDe(id)} sobre ${tituloDe(String(over?.id))}, no mesmo card.`
      }
      return `${tituloDe(id)} sobre ${nomeDoDia(dia, hoje)}.`
    },
    onDragEnd: ({ active, over }) => {
      const dia = over ? colunaDoAlvo(String(over.id)) : undefined
      return dia ? `${tituloDe(active.id)} solta em ${nomeDoDia(dia, hoje)}.` : ''
    },
    onDragCancel: ({ active }) => `Movimento de ${tituloDe(active.id)} cancelado.`,
  }

  /** As selecionadas na ordem da semana (dia a dia), se quem é arrastado é uma delas. */
  function loteDe(idArrastado: string) {
    const { selecionados, tipo } = selecao
    if (tipo !== 'linhas' || selecionados.size < 2 || !selecionados.has(idArrastado)) return null
    const naOrdem = semana
      .flatMap((dia) =>
        dia.entradas.flatMap((entrada) =>
          entrada.tipo === 'tarefa'
            ? [entrada.tarefa.id]
            : pendentesDo(entrada.grupo).map((item) => item.id),
        ),
      )
      .filter((id) => selecionados.has(id))
    return naOrdem.length === selecionados.size ? naOrdem : null
  }

  /**
   * Solta o lote no dia `destino`: o que é de outro dia é levado (tarefas movidas, itens
   * copiados para o card da mesma série, tudo numa operação com Desfazer); as tarefas que já são
   * deste dia andam juntas para onde foram soltas.
   */
  async function soltarLote(movidos: string[], destino: DataLocal, idAlvo: string) {
    const diaDe = (id: string) => tarefaPorId.get(id)?.data ?? itemPorId.get(id)?.data
    const foraDoDia = movidos.filter((id) => diaDe(id) !== destino)
    const doDia = movidos.filter((id) => tarefaPorId.has(id) && diaDe(id) === destino)
    if (foraDoDia.length > 0) {
      const itens = foraDoDia.filter((id) => itemPorId.has(id))
      for (const id of itens) {
        const serieId = grupoPorId.get(itemPorId.get(id)!.item.cardId)?.serie.id
        if (serieId) gruposSemana?.handleAbrir(serieId, destino)
      }
      await mover(
        foraDoDia.filter((id) => tarefaPorId.has(id)),
        destino,
        { itens },
      )
    }
    if (doDia.length === 0) return
    const coluna = colunas[destino] ?? []
    if (!coluna.includes(idAlvo)) return
    const final = inserirBloco(coluna, doDia, idAlvo)
    if (final.join() === coluna.join()) return
    avisarLote([
      await moverLote({ movidos: doDia, destino: { tipo: 'soltas' }, idsEmOrdemNoDestino: final }),
    ])
  }

  function handleDragStart({ active }: DragStartEvent) {
    const id = String(active.id)
    const dia = colunaDe(colunas, id) ?? itemPorId.get(id)?.data ?? null
    setLote(loteDe(id))
    setIdAtivo(id)
    setOrigem(dia)
    setDiaSobre(dia)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const id = String(active.id)
    const destino = colunaDoAlvo(String(over.id))
    setDiaSobre(destino ?? null)
    if (lote) return
    // Card e item não saem do lugar: o destino recebe a cópia só ao soltar.
    if (!tarefaPorId.has(id)) return
    const atual = colunaDe(colunas, id)
    if (!destino || !atual || destino === atual) return
    const indice = String(over.id).startsWith(PREFIXO_COLUNA)
      ? undefined
      : colunas[destino].indexOf(String(over.id))
    setColunas((anteriores) => manterBlocosDas(moverEntreColunas(anteriores, id, destino, indice)))
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id)
    const diaDeOrigem = origem
    const movidos = lote
    setIdAtivo(null)
    setOrigem(null)
    setDiaSobre(null)
    setLote(null)
    if (!over || !diaDeOrigem) return

    const destino = colunaDoAlvo(String(over.id))
    if (!destino) return
    if (movidos) {
      void soltarLote(movidos, destino, String(over.id))
      return
    }
    if (itemPorId.has(id)) {
      const cardDoItem = (active.data.current as Partial<DadosArrastoItem> | undefined)?.cardId
      const cardDoAlvo = (over.data.current as Partial<DadosArrastoItem> | undefined)?.cardId
      if (cardDoItem && cardDoItem === cardDoAlvo && itemPorId.has(String(over.id))) {
        reordenarNoCard(id, String(over.id), cardDoItem)
      } else if (destino !== diaDeOrigem) {
        const serieId = cardDoItem ? grupoPorId.get(cardDoItem)?.serie.id : undefined
        if (serieId) gruposSemana?.handleAbrir(serieId, destino)
        void mover([], destino, { itens: [id] })
      }
      return
    }
    if (grupoPorId.has(id) && destino !== diaDeOrigem) {
      const serieId = grupoPorId.get(id)?.serie.id
      if (serieId) gruposSemana?.handleAbrir(serieId, destino)
      void mover([], destino, { grupos: [id] })
      return
    }
    // Dentro do dia de destino, a posição final é a do item sob o ponteiro.
    const indiceFinal = String(over.id).startsWith(PREFIXO_COLUNA)
      ? undefined
      : colunas[destino].indexOf(String(over.id))
    const proximas = manterBlocosDas(moverEntreColunas(colunas, id, destino, indiceFinal))
    setColunas(proximas)

    if (destino === diaDeOrigem) {
      const isMudou = proximas[destino].join() !== colunasDe(semana)[destino].join()
      if (isMudou) {
        const gravacao = planejarGravacao(proximas[destino], id, blocoDoId)
        void gravarReordenacao(gravacao, id, 'dia')
      }
      return
    }
    // Em outro dia, só os "demais" servem de vizinhos para gravar a `ordem`.
    void soltarTarefaNoDia(id, destino, idsParaOrdemComum(proximas[destino], id, blocoDoId))
  }

  function handleDragCancel() {
    setLote(null)
    setIdAtivo(null)
    setOrigem(null)
    setDiaSobre(null)
    setColunas(colunasDe(semana))
  }

  // Alt+↑/↓: sobe e desce as tarefas selecionadas dentro do dia delas.
  const listasMoveis: ListaMovel[] = semana.map((dia) => ({
    destino: { tipo: 'soltas' },
    ids: colunas[dia.data] ?? [],
  }))
  useAtalhoDeMovimento({
    selecao,
    listas: listasMoveis,
    blocoDoId,
    subetapasPorDono: subtarefasPorTarefa,
  })

  const tarefaAtiva = idAtivo ? tarefaPorId.get(idAtivo) : undefined
  const grupoAtivo = idAtivo ? grupoPorId.get(idAtivo) : undefined
  const itemAtivo = idAtivo ? itemPorId.get(idAtivo) : undefined
  const isLevando = idAtivo !== null && !tarefaAtiva && diaSobre !== null && diaSobre !== origem

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
      <div
        ref={rolagem}
        data-arrastando-lote={lote ? '' : undefined}
        className="md:overflow-x-auto"
      >
        {/* Cada dia tem ao menos ~260px: sem espaço, a semana rola para o lado. */}
        <div className="grid grid-cols-1 md:grid-cols-[repeat(7,minmax(16.25rem,1fr))]">
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
      </div>
      <DragOverlay dropAnimation={null}>
        {lote && (
          <div className="rotate-1 rounded-sm border border-pauta bg-papel px-2.5 py-1.5 text-[0.9375rem] font-semibold shadow-lg ring-2 ring-caneta/40">
            {lote.length} tarefas
          </div>
        )}
        {!lote && tarefaAtiva && (
          <CartaoTarefa
            tarefa={tarefaAtiva}
            subtarefas={subtarefasPorTarefa.get(tarefaAtiva.id) ?? []}
            hoje={hoje}
            isSobreposto
          />
        )}
        {!lote && grupoAtivo && <CartaoGrupo grupo={grupoAtivo} hoje={hoje} isSobreposto />}
        {!lote && itemAtivo && (
          <div className="rotate-1 rounded-sm border border-pauta bg-papel px-2.5 py-1.5 text-[0.9375rem] shadow-lg ring-2 ring-caneta/40">
            {itemAtivo.item.titulo}
          </div>
        )}
        {!lote && isLevando && idAtivo && (
          <p className="mt-1.5 w-max max-w-64 rounded-sm bg-tinta px-2 py-1 text-xs font-semibold text-papel shadow-md">
            {previaDoLevar(idAtivo, diaSobre)}
          </p>
        )}
      </DragOverlay>
    </DndContext>
  )
}
