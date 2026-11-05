import { CircleCheck } from 'lucide-react'
import { fraseDasAtrasadas, type NumerosDasAtrasadas } from '@/lib/inicio'
import {
  ContagemDeTipos,
  FraseDoResumo,
  LinkDoResumo,
} from '@/features/inicio/components/partes-do-resumo'
import { ResumoLateral } from '@/features/inicio/components/resumo-lateral'

interface BlocoAtrasadasProps {
  numeros: NumerosDasAtrasadas
  idsDasTarefas?: string[]
  idsDosCards?: string[]
}

/**
 * Pendentes de dias que passaram, em números: "Ver atrasadas" abre o dia mais antigo com pendência.
 */
export function BlocoAtrasadas({ numeros }: BlocoAtrasadasProps) {
  const { itens, diaMaisAntigo } = numeros
  const temAtrasadas = diaMaisAntigo !== null && itens > 0

  return (
    <ResumoLateral
      idCartao="atrasadas"
      titulo="Atrasadas"
      tom={temAtrasadas ? 'alerta' : 'normal'}
      borda={temAtrasadas ? 'warning' : 'padrao'}
      extra={
        temAtrasadas ? (
          <span className="text-xs text-alerta tabular-nums">
            {itens} {itens === 1 ? 'pendente' : 'pendentes'}
          </span>
        ) : (
          <span className="text-xs text-grafite">em dia</span>
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
          <div className="mt-2">
            <LinkDoResumo para={`/dia/${diaMaisAntigo}`}>Ver atrasadas</LinkDoResumo>
          </div>
        </>
      )}
    </ResumoLateral>
  )
}
