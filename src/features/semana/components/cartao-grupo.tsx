import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CornerDownRight } from 'lucide-react'
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

interface CartaoGrupoProps {
  grupo: GrupoDoDia
  hoje: DataLocal
  /** Arrastar o card pelo cabeçalho (ausente na cópia que acompanha o ponteiro). */
  cabecalho?: {
    ref: (elemento: HTMLElement | null) => void
    attributes: DraggableAttributes
    listeners: DraggableSyntheticListeners
  }
  isSobreposto?: boolean
}

/**
 * Card compacto da semana. O cabeçalho arrasta o card (copia os pendentes para outro dia);
 * cada item pendente também se arrasta sozinho.
 */
export function CartaoGrupo({ grupo, hoje, cabecalho, isSobreposto }: CartaoGrupoProps) {
  const { serie, card } = grupo
  const classificacao = classificarTarefa(serie, useCategoriasDoContexto())
  const progresso = progressoDoGrupo(grupo)
  const isEncerrado = isGrupoEncerrado(grupo)
  const isCopiavel = podeCopiarGrupo(grupo)
  const textoProgresso = grupo.itens.length > 0 ? textoProgressoGrupo(progresso) : ''

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-sm border border-pauta bg-papel text-[0.9375rem]',
        isSobreposto && 'rotate-1 shadow-lg ring-2 ring-caneta/40',
      )}
    >
      <span
        aria-hidden
        className={cn('absolute inset-y-0 left-0 w-1', isEncerrado && 'opacity-40')}
        style={{ backgroundColor: classificacao?.cor ?? 'var(--grafite)' }}
      />
      <div
        ref={cabecalho?.ref}
        {...(isCopiavel ? cabecalho?.attributes : undefined)}
        {...(isCopiavel ? cabecalho?.listeners : undefined)}
        aria-roledescription={isCopiavel ? 'grupo arrastável' : undefined}
        aria-label={
          isCopiavel
            ? `Grupo ${serie.titulo}, ${textoProgresso}. Espaço para levar os pendentes a outro dia.`
            : `Grupo ${serie.titulo}, encerrado.`
        }
        className={cn(
          'flex items-baseline gap-2 border-b border-pauta py-1.5 pr-2 pl-3',
          isCopiavel &&
            'cursor-grab touch-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-caneta active:cursor-grabbing',
        )}
      >
        <span
          className={cn(
            'min-w-0 flex-1 font-extrabold break-words [font-stretch:85%]',
            isEncerrado && 'text-grafite',
          )}
        >
          {serie.titulo}
        </span>
        {textoProgresso && (
          <span className="text-xs text-grafite tabular-nums">{textoProgresso}</span>
        )}
      </div>
      {grupo.itens.length > 0 && (
        <ul aria-label={`Itens de ${serie.titulo}`} className="bg-nevoa/40 py-0.5 pl-1.5">
          {grupo.itens.map((item) =>
            item.status === 'pendente' && !isSobreposto ? (
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

/** Item pendente que vai sozinho para outro dia (copiado para o card da mesma série). */
function ItemArrastavel({ item, data, hoje }: ItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { data },
  })

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role={undefined}
      aria-roledescription="item arrastável"
      aria-label={`${item.titulo}. Espaço para levar só este item a outro dia.`}
      className={cn(
        'cursor-grab touch-none rounded-sm focus-visible:outline-2 focus-visible:outline-caneta active:cursor-grabbing',
        isDragging && 'opacity-30',
      )}
    >
      <LinhaItem item={item} data={data} hoje={hoje} />
    </li>
  )
}

function LinhaItem({ item, data, hoje }: ItemProps) {
  const isConcluido = item.status === 'concluido'
  const isTransferido = item.status === 'transferido'
  const isAtrasado = isPendenteDeAntes(item, data, hoje)

  return (
    <div className="flex items-start gap-2 py-1 pr-2 pl-1.5">
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
          'min-w-0 flex-1 break-words',
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
