import { ChevronRight } from 'lucide-react'
import { cn } from 'cn'
import type { DataLocal, Subtask, Task } from '@/db/types'
import { useConcluidasRecolhidas } from '@/features/dia/hooks/use-concluidas-recolhidas'
import { LinhaTarefa } from '@/features/dia/components/linha-tarefa'

interface GrupoConcluidasProps {
  concluidas: Task[]
  subtarefasPorTarefa: Map<string, Subtask[]>
  hoje: DataLocal
}

const SEM_SUBTAREFAS: Subtask[] = []

/** Tarefas soltas concluídas do dia, riscadas, num grupo recolhível no fim da seção. */
export function GrupoConcluidas({ concluidas, subtarefasPorTarefa, hoje }: GrupoConcluidasProps) {
  const { isRecolhido, alternar } = useConcluidasRecolhidas()
  const quantidade = concluidas.length

  if (quantidade === 0) return null

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={!isRecolhido}
        aria-controls="lista-concluidas"
        className="flex min-h-10 items-center gap-1.5 rounded-sm pr-2 pl-1 text-sm font-medium text-grafite hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta"
      >
        <ChevronRight
          aria-hidden
          className={cn(
            'size-4 transition-transform motion-reduce:transition-none',
            !isRecolhido && 'rotate-90',
          )}
        />
        Concluídas ({quantidade})
      </button>
      {!isRecolhido && (
        <ul id="lista-concluidas" aria-label="Concluídas" className="border-t border-pauta">
          {concluidas.map((tarefa) => (
            <li key={tarefa.id}>
              <LinhaTarefa
                tarefa={tarefa}
                subtarefas={subtarefasPorTarefa.get(tarefa.id) ?? SEM_SUBTAREFAS}
                hoje={hoje}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
