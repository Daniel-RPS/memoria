import { Link } from 'react-router'
import { cn } from 'cn'
import { Checkbox } from '@/components/ui/checkbox'
import { definirConclusao } from '@/db/repositories/task-repository'
import type { DataLocal, Subtask, Task } from '@/db/types'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { classificarTarefa } from '@/lib/categorias'
import { diasPendente, progressoSubtarefas, textoProgresso } from '@/lib/tarefas'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'

interface CartaoTarefaProps {
  tarefa: Task
  subtarefas: Subtask[]
  hoje: DataLocal
  /** Cópia que acompanha o ponteiro enquanto arrasta. */
  isSobreposto?: boolean
}

/** Tarefa compacta da semana: uma linha da pauta com caixa, título e sinais (atraso, categoria). */
export function CartaoTarefa({ tarefa, subtarefas, hoje, isSobreposto }: CartaoTarefaProps) {
  const classificacao = classificarTarefa(tarefa, useCategoriasDoContexto())
  const corNaTela = useCorNaTela()
  const dias = diasPendente(tarefa, hoje)
  const progresso = progressoSubtarefas(subtarefas)

  return (
    <div
      className={cn(
        'relative flex items-start gap-2 border-b border-pauta py-2 pr-1 pl-1 text-[0.9375rem] hover:bg-accent/60',
        isSobreposto && 'rotate-1 rounded-sm border bg-papel shadow-lg ring-2 ring-caneta/40',
      )}
    >
      <Checkbox
        checked={false}
        onCheckedChange={() => void definirConclusao(tarefa.id, true)}
        aria-label={`Concluir ${tarefa.titulo}`}
        className="mt-0.5 size-4 rounded-[3px] border-[1.5px] border-tinta/45 bg-papel"
      />
      <div className="min-w-0 flex-1">
        <Link
          to={`/dia/${tarefa.data}`}
          className="block break-words hover:underline focus-visible:outline-2 focus-visible:outline-caneta"
        >
          {tarefa.titulo}
        </Link>
        {(dias !== null || progresso || classificacao) && (
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-grafite">
            {dias !== null && (
              <span className="rounded-[3px] bg-marca-texto px-1 font-medium text-violeta-profundo">
                há {dias} {dias === 1 ? 'dia' : 'dias'}
              </span>
            )}
            {progresso && <span className="tabular-nums">{textoProgresso(progresso)}</span>}
            {classificacao && (
              <span className="flex items-center gap-1">
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: corNaTela(classificacao.cor) }}
                />
                {classificacao.rotulo}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
