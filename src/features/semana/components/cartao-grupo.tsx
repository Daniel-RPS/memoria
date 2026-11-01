import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import { CornerDownRight, GripVertical } from 'lucide-react'
import { cn } from 'cn'
import { Checkbox } from '@/components/ui/checkbox'
import { definirConclusaoItem } from '@/db/repositories/group-repository'
import type { DataLocal, GroupItem } from '@/db/types'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { classificarTarefa } from '@/lib/categorias'
import {
  diaCurto,
  isPendenteDeAntes,
  isGrupoEncerrado,
  podeCopiarGrupo,
  progressoDoGrupo,
  textoProgressoGrupo,
  type GrupoDoDia,
} from '@/lib/grupos'
import { MenuLevarGrupo } from '@/features/semana/components/menu-levar-grupo'

interface CartaoGrupoProps {
  grupo: GrupoDoDia
  hoje: DataLocal
  /** Arrastar o card inteiro (ausente na cópia que acompanha o ponteiro). */
  arrasto?: {
    /** O cabeçalho: recebe o foco e o espaço do teclado. */
    ref: (elemento: HTMLElement | null) => void
    attributes: DraggableAttributes
    listeners: DraggableSyntheticListeners
  }
  isSobreposto?: boolean
}

/** Áreas marcadas com `data-sem-arrasto` (itens, botões): apertar ali NÃO arrasta o card. */
function isForaDoArrasto(alvo: EventTarget) {
  return alvo instanceof Element && alvo.closest('[data-sem-arrasto]') !== null
}

/**
 * Card compacto da semana. Arrastar o card (cabeçalho ou qualquer área fora dos itens) leva
 * TODOS os pendentes para outro dia; a alça ⋮⋮ de um item leva só aquele item.
 */
export function CartaoGrupo({ grupo, hoje, arrasto, isSobreposto }: CartaoGrupoProps) {
  const { serie, card } = grupo
  const classificacao = classificarTarefa(serie, useCategoriasDoContexto())
  const progresso = progressoDoGrupo(grupo)
  const isEncerrado = isGrupoEncerrado(grupo)
  const isArrastavel = podeCopiarGrupo(grupo) && arrasto !== undefined
  const textoProgresso = grupo.itens.length > 0 ? textoProgressoGrupo(progresso) : ''

  return (
    <div
      {...(isArrastavel ? arrasto.listeners : undefined)}
      onPointerDown={(evento) => {
        // Um item só sai pela alça dele (que já capturou o gesto antes de chegar aqui).
        if (isArrastavel && !isForaDoArrasto(evento.target)) {
          arrasto.listeners?.onPointerDown?.(evento)
        }
      }}
      className={cn(
        'relative overflow-hidden rounded-sm border border-pauta bg-papel text-[0.9375rem]',
        isArrastavel && 'cursor-grab touch-none active:cursor-grabbing',
        isSobreposto && 'rotate-1 cursor-grabbing shadow-lg ring-2 ring-caneta/40',
      )}
    >
      <span
        aria-hidden
        className={cn('absolute inset-y-0 left-0 w-1', isEncerrado && 'opacity-40')}
        style={{ backgroundColor: classificacao?.cor ?? 'var(--grafite)' }}
      />
      <div className="flex items-center gap-1 border-b border-pauta pr-1.5">
        <div
          ref={isArrastavel ? arrasto.ref : undefined}
          {...(isArrastavel ? arrasto.attributes : undefined)}
          aria-roledescription={isArrastavel ? 'grupo arrastável' : undefined}
          aria-label={
            isArrastavel || isSobreposto
              ? `Grupo ${serie.titulo}, ${textoProgresso}. Espaço para levar os pendentes a outro dia.`
              : `Grupo ${serie.titulo}, ${isEncerrado ? 'encerrado' : textoProgresso}.`
          }
          className={cn(
            // Contador longo ("0/1 · 1 transferido") desce de linha em vez de espremer o título.
            'flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 py-1.5 pl-2',
            isArrastavel &&
              'rounded-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-caneta',
          )}
        >
          {(isArrastavel || isSobreposto) && (
            <GripVertical aria-hidden className="size-4 shrink-0 text-grafite/70" />
          )}
          <span
            className={cn(
              'min-w-0 flex-1 basis-16 font-extrabold break-words [font-stretch:85%]',
              !isArrastavel && !isSobreposto && 'pl-1',
              isEncerrado && 'text-grafite',
            )}
          >
            {serie.titulo}
          </span>
          {textoProgresso && (
            <span className="text-xs whitespace-nowrap text-grafite tabular-nums">
              {textoProgresso}
            </span>
          )}
        </div>
        {isArrastavel && <MenuLevarGrupo grupo={grupo} hoje={hoje} />}
      </div>
      {grupo.itens.length > 0 && (
        <ul
          aria-label={`Itens de ${serie.titulo}`}
          data-sem-arrasto=""
          className="cursor-auto bg-nevoa/40 py-0.5"
        >
          {grupo.itens.map((item) =>
            item.status === 'pendente' && !isSobreposto && isArrastavel ? (
              <ItemArrastavel key={item.id} item={item} data={card.data} hoje={hoje} />
            ) : (
              <li key={item.id}>
                <LinhaItem item={item} data={card.data} hoje={hoje} />
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}

interface ItemProps {
  item: GroupItem
  data: DataLocal
  hoje: DataLocal
}

/** Item pendente que vai sozinho para outro dia, arrastado só pela alça ⋮⋮. */
function ItemArrastavel({ item, data, hoje }: ItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { data },
  })

  return (
    <li ref={setNodeRef} className={cn('group/linha', isDragging && 'opacity-30')}>
      <LinhaItem
        item={item}
        data={data}
        hoje={hoje}
        alca={
          <span
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-roledescription="item arrastável"
            aria-label={`Arrastar ${item.titulo}. Espaço para levar só este item a outro dia.`}
            className="flex size-4 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-grafite opacity-0 group-hover/linha:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-caneta active:cursor-grabbing"
          >
            <GripVertical aria-hidden className="size-3.5" />
          </span>
        }
      />
    </li>
  )
}

function LinhaItem({ item, data, hoje, alca }: ItemProps & { alca?: ReactNode }) {
  const isConcluido = item.status === 'concluido'
  const isTransferido = item.status === 'transferido'
  const isAtrasado = isPendenteDeAntes(item, data, hoje)

  return (
    <div className="flex items-start gap-1 py-1 pr-2 pl-1">
      <span className="mt-0.5 flex w-4 shrink-0 justify-center">{alca}</span>
      {isTransferido ? (
        <CornerDownRight aria-hidden className="mt-0.5 size-4 shrink-0 text-grafite" />
      ) : (
        <Checkbox
          checked={isConcluido}
          onCheckedChange={(marcada) => void definirConclusaoItem(item.id, marcada === true)}
          aria-label={isConcluido ? `Desmarcar ${item.titulo}` : `Concluir ${item.titulo}`}
          className="mt-0.5 size-4 rounded-[3px] border-[1.5px] border-tinta/70 data-[state=checked]:border-caneta data-[state=checked]:bg-caneta"
        />
      )}
      <span
        className={cn(
          'min-w-0 flex-1 pl-1 break-words',
          isConcluido && 'text-grafite line-through decoration-tinta/50',
          isTransferido && 'text-grafite',
        )}
      >
        {item.titulo}
        {isAtrasado && (
          <span className="ml-1.5 bg-[linear-gradient(transparent_12%,var(--marca-texto)_12%,var(--marca-texto)_88%,transparent_88%)] px-0.5 text-xs whitespace-nowrap no-underline">
            desde {diaCurto(item.dataOriginal)}
          </span>
        )}
        {isTransferido && <span className="ml-1.5 text-xs whitespace-nowrap">transferido</span>}
      </span>
    </div>
  )
}
