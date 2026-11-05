import { CircleCheck } from 'lucide-react'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { fraseDasAtrasadas, type NumerosDasAtrasadas } from '@/lib/inicio'
import {
  ContagemDeTipos,
  FraseDoResumo,
  LinkDoResumo,
} from '@/features/inicio/components/partes-do-resumo'
import { ResumoLateral } from '@/features/inicio/components/resumo-lateral'

interface BlocoAtrasadasProps {
  numeros: NumerosDasAtrasadas
  idsDasTarefas: string[]
  idsDosCards: string[]
}

/**
 * Pendentes de dias que passaram, em números: "Ver atrasadas" abre o dia mais antigo com
 * pendência e "Trazer todas para hoje" move as soltas e leva os pendentes dos cards para hoje.
 */
export function BlocoAtrasadas({ numeros, idsDasTarefas, idsDosCards }: BlocoAtrasadasProps) {
  const { hoje, mover } = useMoverTarefas()
  const { itens, diaMaisAntigo } = numeros

  function handleTrazerTodas() {
    void mover(idsDasTarefas, hoje, { grupos: idsDosCards })
  }

  return (
    <ResumoLateral
      titulo="Atrasadas"
      tom="alerta"
      glow={itens > 0 ? 'warning' : 'none'}
      extra={
        itens > 0 && (
          <span className="text-xs text-alerta tabular-nums">
            {itens} {itens === 1 ? 'pendente' : 'pendentes'}
          </span>
        )
      }
    >
      {diaMaisAntigo === null ? (
        <p className="mt-2 flex items-center gap-2 rounded-md border border-dashed border-pauta px-3 py-2 text-sm text-grafite">
          <CircleCheck aria-hidden className="size-4 shrink-0" />
          Tudo em dia
        </p>
      ) : (
        <>
          <FraseDoResumo>{fraseDasAtrasadas(numeros)}</FraseDoResumo>
          <ContagemDeTipos grupos={numeros.grupos} soltas={numeros.soltas} />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <LinkDoResumo para={`/dia/${diaMaisAntigo}`}>Ver atrasadas</LinkDoResumo>
            <button
              type="button"
              onClick={handleTrazerTodas}
              className="text-xs text-grafite hover:text-tinta hover:underline"
            >
              Trazer todas para hoje
            </button>
          </div>
        </>
      )}
    </ResumoLateral>
  )
}
