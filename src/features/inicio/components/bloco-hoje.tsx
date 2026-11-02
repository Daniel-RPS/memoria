import type { ResumoDoDia } from '@/lib/inicio'
import { CardsDoResumo } from '@/features/inicio/components/cards-do-resumo'
import { ResumoLateral } from '@/features/inicio/components/resumo-lateral'

interface BlocoHojeProps {
  resumo: ResumoDoDia
}

/** O que está em hoje: um card por grupo e depois as tarefas soltas, marcáveis ali mesmo. */
export function BlocoHoje({ resumo }: BlocoHojeProps) {
  const { pendentes } = resumo
  const isVazio = resumo.grupos.length === 0 && resumo.soltas.length === 0

  return (
    <ResumoLateral
      titulo="Hoje"
      extra={
        !isVazio && (
          <span className="text-xs text-grafite tabular-nums">
            {pendentes === 0
              ? 'nada pendente'
              : `${pendentes} ${pendentes === 1 ? 'pendente' : 'pendentes'}`}
          </span>
        )
      }
    >
      {isVazio ? (
        <p className="py-2 text-sm text-grafite">Nada para hoje. Anote algo ao lado.</p>
      ) : (
        <CardsDoResumo resumo={resumo} />
      )}
    </ResumoLateral>
  )
}
