import { CircleCheck } from 'lucide-react'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import type { ResumoDoDia } from '@/lib/inicio'
import { CardsDoResumo } from '@/features/inicio/components/cards-do-resumo'
import { ResumoLateral } from '@/features/inicio/components/resumo-lateral'

interface BlocoAtrasadasProps {
  resumo: ResumoDoDia
}

/**
 * Pendentes de dias que passaram, nos mesmos cards de Hoje, com "há X dias" e "Trazer para
 * hoje" (tarefa solta é movida; card leva os pendentes para o card de hoje, como no resto do
 * app).
 */
export function BlocoAtrasadas({ resumo }: BlocoAtrasadasProps) {
  const { hoje, mover } = useMoverTarefas()
  const { pendentes } = resumo
  const quantidade = resumo.grupos.length + resumo.soltas.length

  function handleTrazer(tarefas: string[], grupos: string[]) {
    void mover(tarefas, hoje, { grupos })
  }

  function handleTrazerTodas() {
    handleTrazer(
      resumo.soltas.map(({ tarefa }) => tarefa.id),
      resumo.grupos.map(({ grupo }) => grupo.card.id),
    )
  }

  return (
    <ResumoLateral
      titulo="Atrasadas"
      tom="alerta"
      extra={
        pendentes > 0 && (
          <span className="text-xs text-alerta tabular-nums">
            {pendentes} {pendentes === 1 ? 'pendente' : 'pendentes'}
          </span>
        )
      }
    >
      {quantidade === 0 ? (
        <p className="mt-2 flex items-center gap-2 rounded-md border border-dashed border-pauta px-3 py-2 text-sm text-grafite">
          <CircleCheck aria-hidden className="size-4 shrink-0" />
          Tudo em dia
        </p>
      ) : (
        <>
          <CardsDoResumo
            resumo={resumo}
            onTrazerGrupo={(cardId) => handleTrazer([], [cardId])}
            onTrazerTarefa={(tarefaId) => handleTrazer([tarefaId], [])}
          />
          {quantidade > 1 && (
            <button
              type="button"
              onClick={handleTrazerTodas}
              className="mt-2 text-xs font-medium text-violeta-profundo hover:underline"
            >
              Trazer todas para hoje
            </button>
          )}
        </>
      )}
    </ResumoLateral>
  )
}
