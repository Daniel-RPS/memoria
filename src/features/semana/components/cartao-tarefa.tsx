import { Link } from 'react-router'
import { cn } from 'cn'
import { Checkbox } from '@/components/ui/checkbox'
import { definirConclusao } from '@/db/repositories/task-repository'
import type { DataLocal, Subtask, Task } from '@/db/types'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { classificarTarefa } from '@/lib/categorias'
import { diasPendente, progressoSubtarefas, textoProgresso } from '@/lib/tarefas'

interface CartaoTarefaProps {
  tarefa: Task
  subtarefas: Subtask[]
  hoje: DataLocal
  /** Cópia que acompanha o ponteiro enquanto arrasta. */
  isSobreposto?: boolean
}

/** Tarefa compacta da semana: faixa da categoria, caixa de seleção, título e sinais. */
export function CartaoTarefa({ tarefa, subtarefas, hoje, isSobreposto }: CartaoTarefaProps) {
  const classificacao = classificarTarefa(tarefa, useCategoriasDoContexto())
  const dias = diasPendente(tarefa, hoje)
  const progresso = progressoSubtarefas(subtarefas)

  return (
    <div
      className={cn(
        'relative flex items-start gap-2 rounded-sm border border-pauta bg-papel py-1.5 pr-2 pl-2.5 text-[0.9375rem]',
        isSobreposto && 'rotate-1 shadow-lg ring-2 ring-caneta/40',
      )}
    >
      {classificacao && (
        <span
          aria-hidden
          className="absolute inset-y-1 left-0 w-1 rounded-r-sm"
          style={{ backgroundColor: classificacao.cor }}
        />
      )}
      <Checkbox
        checked={false}
        onCheckedChange={() => void definirConclusao(tarefa.id, true)}
        aria-label={`Concluir ${tarefa.titulo}`}
        className="mt-0.5 size-4 rounded-[3px] border-[1.5px] border-tinta/70"
      />
      <div className="min-w-0 flex-1">
        <Link
          to={`/dia/${tarefa.data}`}
          className="block break-words hover:underline focus-visible:outline-2 focus-visible:outline-caneta"
        >
          {tarefa.titulo}
        </Link>
        {(dias !== null || progresso || classificacao || tarefa.procedureId) && (
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-grafite">
            {dias !== null && (
              <span className="bg-[linear-gradient(transparent_12%,var(--marca-texto)_12%,var(--marca-texto)_88%,transparent_88%)] px-0.5 text-tinta">
                há {dias} {dias === 1 ? 'dia' : 'dias'}
              </span>
            )}
            {progresso && <span className="tabular-nums">{textoProgresso(progresso)}</span>}
            {classificacao && <span>{classificacao.rotulo}</span>}
            {tarefa.procedureId && <span className="text-caneta">procedimento</span>}
          </p>
        )}
      </div>
    </div>
  )
}
