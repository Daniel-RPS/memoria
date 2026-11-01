import { useDraggable } from '@dnd-kit/core'
import { useNavigate } from 'react-router'
import { cn } from 'cn'
import type { DataLocal, Task } from '@/db/types'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { classificarTarefa } from '@/lib/categorias'
import type { GrupoDoDia } from '@/lib/grupos'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'

interface ChipTarefaProps {
  tarefa: Task
  hoje: DataLocal
  /** Cópia que acompanha o ponteiro enquanto arrasta. */
  isSobreposto?: boolean
}

/** Tarefa em uma linha: cor da categoria e título cortado. Atrasadas ganham o marca-texto. */
export function ChipTarefa({ tarefa, hoje, isSobreposto }: ChipTarefaProps) {
  const classificacao = classificarTarefa(tarefa, useCategoriasDoContexto())
  const corNaTela = useCorNaTela()
  const isAtrasada = tarefa.data < hoje

  return (
    <span
      className={cn(
        'flex min-w-0 items-center gap-1.5 rounded-sm border-l-[3px] bg-papel px-1.5 py-0.5 text-xs leading-snug',
        isAtrasada && 'bg-marca-texto text-violeta-profundo',
        isSobreposto && 'rotate-1 shadow-lg ring-2 ring-caneta/40',
      )}
      style={{ borderLeftColor: classificacao ? corNaTela(classificacao.cor) : 'var(--pauta)' }}
    >
      <span className="truncate">{tarefa.titulo}</span>
    </span>
  )
}

/** Chip que pode ser arrastado para outro dia; um clique simples abre o dia. */
export function ChipTarefaArrastavel({ tarefa, hoje }: Omit<ChipTarefaProps, 'isSobreposto'>) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: tarefa.id,
    data: { data: tarefa.data },
  })

  return (
    // `div` com papel de botão (vem de `attributes`): num <button> de verdade, soltar o
    // espaço dispara um clique e abriria o dia no meio do arrastar.
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/dia/${tarefa.data}`)}
      aria-roledescription="tarefa arrastável"
      aria-label={`${tarefa.titulo}. Espaço para mover; Enter abre o dia.`}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter') navigate(`/dia/${tarefa.data}`)
        else listeners?.onKeyDown?.(evento)
      }}
      className={cn(
        'block w-full min-w-0 cursor-grab touch-none rounded-sm text-left focus-visible:outline-2 focus-visible:outline-caneta active:cursor-grabbing',
        isDragging && 'opacity-30',
      )}
    >
      <ChipTarefa tarefa={tarefa} hoje={hoje} />
    </div>
  )
}

interface ChipGrupoProps {
  grupo: GrupoDoDia
  /** Itens pendentes do card. */
  quantidade: number
  hoje: DataLocal
  isSobreposto?: boolean
}

/** Card de grupo em uma linha: "Casa · 2" (itens pendentes), na cor da categoria. */
export function ChipGrupo({ grupo, quantidade, hoje, isSobreposto }: ChipGrupoProps) {
  const classificacao = classificarTarefa(grupo.serie, useCategoriasDoContexto())
  const corNaTela = useCorNaTela()
  const isAtrasado = grupo.card.data < hoje

  return (
    <span
      className={cn(
        'flex min-w-0 items-center gap-1.5 rounded-sm border-l-[3px] bg-papel px-1.5 py-0.5 text-xs leading-snug font-semibold',
        isAtrasado && 'bg-marca-texto text-violeta-profundo',
        isSobreposto && 'rotate-1 shadow-lg ring-2 ring-caneta/40',
      )}
      style={{ borderLeftColor: classificacao ? corNaTela(classificacao.cor) : 'var(--grafite)' }}
    >
      <span className="truncate">{grupo.serie.titulo}</span>
      <span className="font-normal text-grafite tabular-nums">· {quantidade}</span>
    </span>
  )
}

/** Chip do card: arrastar para outro dia copia os pendentes; um clique abre o dia. */
export function ChipGrupoArrastavel(props: Omit<ChipGrupoProps, 'isSobreposto'>) {
  const navigate = useNavigate()
  const { card, serie } = props.grupo
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { data: card.data, isGrupo: true },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/dia/${card.data}`)}
      aria-roledescription="grupo arrastável"
      aria-label={`Grupo ${serie.titulo}, ${props.quantidade} pendentes. Espaço para levar os pendentes a outro dia; Enter abre o dia.`}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter') navigate(`/dia/${card.data}`)
        else listeners?.onKeyDown?.(evento)
      }}
      className={cn(
        'block w-full min-w-0 cursor-grab touch-none rounded-sm text-left focus-visible:outline-2 focus-visible:outline-caneta active:cursor-grabbing',
        isDragging && 'opacity-30',
      )}
    >
      <ChipGrupo {...props} />
    </div>
  )
}
