import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router'
import { cn } from 'cn'
import { CampoNovoGrupo } from '@/components/campo-novo-grupo'
import { CirculoHoje } from '@/components/circulo-hoje'
import { CampoNovoItem } from '@/components/campo-novo-item'
import { criarGrupo } from '@/db/repositories/group-repository'
import { criarTarefa } from '@/db/repositories/task-repository'
import type { DataLocal, Subtask, Task } from '@/db/types'
import { deDataLocal } from '@/lib/datas'
import type { GrupoDoDia } from '@/lib/grupos'
import { ItemGrupoSemana } from '@/features/semana/components/item-grupo-semana'
import { ItemTarefaSemana } from '@/features/semana/components/item-tarefa-semana'

/** Prefixo do id da área de soltar de cada dia (o resto do id é a data). */
export const PREFIXO_COLUNA = 'dia:'

const SEM_SUBTAREFAS: Subtask[] = []

interface ColunaDiaProps {
  data: DataLocal
  hoje: DataLocal
  /** Ids das tarefas soltas pendentes e dos cards, na ordem mostrada. */
  ids: string[]
  tarefaPorId: Map<string, Task>
  grupoPorId: Map<string, GrupoDoDia>
  quantidadeConcluidas: number
  subtarefasPorTarefa: Map<string, Subtask[]>
}

/** Um dia da semana: cabeçalho que abre o dia, pendentes e cards arrastáveis e nova tarefa. */
export function ColunaDia({
  data,
  hoje,
  ids,
  tarefaPorId,
  grupoPorId,
  quantidadeConcluidas,
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
        isHoje && 'bg-marca-texto/40',
      )}
    >
      <h2 className="px-3 pt-3 pb-2">
        <Link
          to={`/dia/${data}`}
          className="group flex items-end justify-between gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-caneta"
        >
          <span className="flex flex-col text-sm leading-tight">
            <span className="text-grafite capitalize">{format(dia, 'EEE', { locale: ptBR })}</span>
            {isHoje && <span className="font-medium text-violeta-profundo">hoje</span>}
          </span>
          <span
            className={cn(
              'relative text-4xl leading-none font-extrabold tabular-nums [font-stretch:75%] group-hover:text-caneta',
              isHoje && 'text-caneta',
            )}
          >
            {format(dia, 'd')}
            {isHoje && <CirculoHoje />}
          </span>
        </Link>
      </h2>

      <SortableContext
        id={`${PREFIXO_COLUNA}${data}`}
        items={ids}
        strategy={verticalListSortingStrategy}
      >
        <ul
          ref={setNodeRef}
          aria-label={`Pendentes de ${nomeCompleto}`}
          className={cn(
            'flex min-h-16 flex-1 flex-col px-2 pb-2 transition-colors',
            isOver && 'bg-accent',
          )}
        >
          {ids.map((id) => {
            const grupo = grupoPorId.get(id)
            if (grupo) return <ItemGrupoSemana key={id} grupo={grupo} hoje={hoje} />
            const tarefa = tarefaPorId.get(id)
            return tarefa ? (
              <ItemTarefaSemana
                key={id}
                tarefa={tarefa}
                subtarefas={subtarefasPorTarefa.get(id) ?? SEM_SUBTAREFAS}
                hoje={hoje}
              />
            ) : null
          })}
        </ul>
      </SortableContext>

      <div className="px-2">
        <CampoNovoItem
          rotulo="Nova tarefa"
          nomeAcessivel={`Nova tarefa em ${nomeCurto}`}
          tamanho="compacto"
          onCriar={(titulo) => criarTarefa({ titulo, data })}
        />
        <CampoNovoGrupo
          nomeAcessivel={`Novo grupo em ${nomeCurto}`}
          tamanho="compacto"
          onCriar={(dados) => criarGrupo({ ...dados, data })}
        />
      </div>
      {quantidadeConcluidas > 0 && (
        <Link
          to={`/dia/${data}`}
          className="px-3 pb-3 text-sm text-grafite hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta"
        >
          {quantidadeConcluidas === 1 ? '1 concluída' : `${quantidadeConcluidas} concluídas`}
        </Link>
      )}
    </section>
  )
}
