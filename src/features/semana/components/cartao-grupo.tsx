import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { cn } from 'cn'
import { Checkbox } from '@/components/ui/checkbox'
import { definirConclusao } from '@/db/repositories/task-repository'
import type { DataLocal, Task } from '@/db/types'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { classificarTarefa } from '@/lib/categorias'
import { progressoDoGrupo, textoProgressoGrupo, type GrupoDoDia } from '@/lib/grupos'
import { diasPendente } from '@/lib/tarefas'

interface CartaoGrupoProps {
  grupo: GrupoDoDia
  hoje: DataLocal
  /** Arrastar o card inteiro pelo cabeçalho (ausente na cópia que acompanha o ponteiro). */
  cabecalho?: {
    ref: (elemento: HTMLElement | null) => void
    attributes: DraggableAttributes
    listeners: DraggableSyntheticListeners
  }
  isSobreposto?: boolean
}

/** Card compacto da semana: cabeçalho arrastável e itens pendentes, cada um arrastável. */
export function CartaoGrupo({ grupo, hoje, cabecalho, isSobreposto }: CartaoGrupoProps) {
  const { serie } = grupo
  const classificacao = classificarTarefa(serie, useCategoriasDoContexto())
  const progresso = progressoDoGrupo(grupo)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-sm border border-pauta bg-papel text-[0.9375rem]',
        isSobreposto && 'rotate-1 shadow-lg ring-2 ring-caneta/40',
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: classificacao?.cor ?? 'var(--grafite)' }}
      />
      <div
        ref={cabecalho?.ref}
        {...cabecalho?.attributes}
        {...cabecalho?.listeners}
        aria-roledescription="grupo arrastável"
        aria-label={`Grupo ${serie.titulo}, ${textoProgressoGrupo(progresso)}. Espaço para mover o grupo.`}
        className="flex cursor-grab touch-none items-baseline gap-2 border-b border-pauta py-1.5 pr-2 pl-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-caneta active:cursor-grabbing"
      >
        <span className="min-w-0 flex-1 font-extrabold break-words [font-stretch:85%]">
          {serie.titulo}
        </span>
        {progresso.total > 0 && (
          <span className="text-xs text-grafite tabular-nums">
            {textoProgressoGrupo(progresso)}
          </span>
        )}
      </div>
      {grupo.pendentes.length > 0 && (
        <ul aria-label={`Itens de ${serie.titulo}`} className="bg-nevoa/40 py-0.5 pl-1.5">
          {grupo.pendentes.map((item) =>
            isSobreposto ? (
              <li key={item.id}>
                <LinhaItem item={item} hoje={hoje} />
              </li>
            ) : (
              <ItemArrastavel key={item.id} item={item} hoje={hoje} />
            ),
          )}
        </ul>
      )}
    </div>
  )
}

/** Item que pode ir sozinho para outro dia (cai no card da mesma série). */
function ItemArrastavel({ item, hoje }: { item: Task; hoje: DataLocal }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { data: item.data },
  })

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role={undefined}
      aria-roledescription="item arrastável"
      aria-label={`${item.titulo}. Espaço para mover só este item.`}
      className={cn(
        'cursor-grab touch-none rounded-sm focus-visible:outline-2 focus-visible:outline-caneta active:cursor-grabbing',
        isDragging && 'opacity-30',
      )}
    >
      <LinhaItem item={item} hoje={hoje} />
    </li>
  )
}

function LinhaItem({ item, hoje }: { item: Task; hoje: DataLocal }) {
  const dias = diasPendente(item, hoje)

  return (
    <div className="flex items-start gap-2 py-1 pr-2 pl-1.5">
      <Checkbox
        checked={false}
        onCheckedChange={() => void definirConclusao(item.id, true)}
        aria-label={`Concluir ${item.titulo}`}
        className="mt-0.5 size-4 rounded-[3px] border-[1.5px] border-tinta/70"
      />
      <span className="min-w-0 flex-1 break-words">
        {item.titulo}
        {dias !== null && (
          <span className="ml-1.5 bg-[linear-gradient(transparent_12%,var(--marca-texto)_12%,var(--marca-texto)_88%,transparent_88%)] px-0.5 text-xs whitespace-nowrap">
            há {dias} {dias === 1 ? 'dia' : 'dias'}
          </span>
        )}
      </span>
    </div>
  )
}
