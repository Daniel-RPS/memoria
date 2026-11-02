import type { ResumoDoDia } from '@/lib/inicio'
import { CardDeGrupo } from '@/features/inicio/components/card-de-grupo'
import { CardTarefasSoltas } from '@/features/inicio/components/card-tarefas-soltas'

interface CardsDoResumoProps {
  resumo: ResumoDoDia
  /** Só em Atrasadas: leva os pendentes do card para hoje. */
  onTrazerGrupo?: (cardId: string) => void
  /** Só em Atrasadas: move a tarefa solta para hoje. */
  onTrazerTarefa?: (tarefaId: string) => void
}

/** Um card por grupo e, depois, o card "Tarefas soltas" (blocos Hoje e Atrasadas). */
export function CardsDoResumo({ resumo, onTrazerGrupo, onTrazerTarefa }: CardsDoResumoProps) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      {resumo.grupos.length > 0 && (
        <ul className="flex flex-col gap-2">
          {resumo.grupos.map((grupo) => (
            <CardDeGrupo
              key={grupo.grupo.card.id}
              resumo={grupo}
              onTrazer={onTrazerGrupo && (() => onTrazerGrupo(grupo.grupo.card.id))}
            />
          ))}
        </ul>
      )}
      <CardTarefasSoltas soltas={resumo.soltas} onTrazer={onTrazerTarefa} />
    </div>
  )
}
