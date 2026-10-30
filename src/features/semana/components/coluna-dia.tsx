import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router'
import { cn } from 'cn'
import { CampoNovoItem } from '@/components/campo-novo-item'
import { criarTarefa } from '@/db/repositories/task-repository'
import type { DataLocal, Subtask, Task } from '@/db/types'
import { deDataLocal } from '@/lib/datas'
import { ItemTarefaSemana } from '@/features/semana/components/item-tarefa-semana'

/** Prefixo do id da área de soltar de cada dia (o resto do id é a data). */
export const PREFIXO_COLUNA = 'dia:'

const SEM_SUBTAREFAS: Subtask[] = []

interface ColunaDiaProps {
  data: DataLocal
  hoje: DataLocal
  pendentes: Task[]
  concluidas: Task[]
  subtarefasPorTarefa: Map<string, Subtask[]>
}

/** Um dia da semana: cabeçalho que abre o dia, pendentes arrastáveis e linha de nova tarefa. */
export function ColunaDia({
  data,
  hoje,
  pendentes,
  concluidas,
  subtarefasPorTarefa,
}: ColunaDiaProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `${PREFIXO_COLUNA}${data}` })
  const dia = deDataLocal(data)
  const isHoje = data === hoje
  const nomeCurto = format(dia, 'EEE, d', { locale: ptBR })
  const nomeCompleto = format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })

  return (
    <section
      aria-label={nomeCompleto}
      className={cn(
        'flex min-w-0 flex-col border-b border-pauta xl:border-b-0 xl:border-l xl:first:border-l-0',
        isHoje && 'bg-accent/40',
      )}
    >
      <h2 className="px-3 pt-3 pb-2">
        <Link
          to={`/dia/${data}`}
          className="group flex items-baseline gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-caneta"
        >
          <span className="text-sm text-grafite capitalize">
            {format(dia, 'EEE', { locale: ptBR })}
          </span>
          <span
            className={cn(
              'text-3xl leading-none font-extrabold tabular-nums [font-stretch:75%] group-hover:text-caneta',
              isHoje && 'text-caneta',
            )}
          >
            {format(dia, 'd')}
          </span>
          {isHoje && <span className="text-sm text-caneta">hoje</span>}
        </Link>
      </h2>

      <SortableContext
        id={`${PREFIXO_COLUNA}${data}`}
        items={pendentes.map((tarefa) => tarefa.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul
          ref={setNodeRef}
          aria-label={`Pendentes de ${nomeCompleto}`}
          className={cn(
            'flex min-h-16 flex-1 flex-col gap-1.5 px-2 pb-2 transition-colors',
            isOver && 'bg-accent',
          )}
        >
          {pendentes.map((tarefa) => (
            <ItemTarefaSemana
              key={tarefa.id}
              tarefa={tarefa}
              subtarefas={subtarefasPorTarefa.get(tarefa.id) ?? SEM_SUBTAREFAS}
              hoje={hoje}
            />
          ))}
        </ul>
      </SortableContext>

      <div className="px-2">
        <CampoNovoItem
          rotulo="Nova tarefa"
          nomeAcessivel={`Nova tarefa em ${nomeCurto}`}
          tamanho="compacto"
          onCriar={(titulo) => criarTarefa({ titulo, data })}
        />
      </div>
      {concluidas.length > 0 && (
        <Link
          to={`/dia/${data}`}
          className="px-3 pb-3 text-sm text-grafite hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta"
        >
          {concluidas.length === 1 ? '1 concluída' : `${concluidas.length} concluídas`}
        </Link>
      )}
    </section>
  )
}
