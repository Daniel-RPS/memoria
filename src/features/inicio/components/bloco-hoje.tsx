import type { DataLocal } from '@/db/types'
import { fraseDoDia, type NumerosDoDia } from '@/lib/inicio'
import {
  BarraDoDia,
  ContagemDeTipos,
  FraseDoResumo,
  LinkDoResumo,
} from '@/features/inicio/components/partes-do-resumo'
import { ResumoLateral } from '@/features/inicio/components/resumo-lateral'

interface BlocoHojeProps {
  numeros: NumerosDoDia
  hoje: DataLocal
}

/** O dia em números (frase, grupos e soltas, progresso) e o link para o Dia, onde está o detalhe. */
export function BlocoHoje({ numeros, hoje }: BlocoHojeProps) {
  const { pendentes, feitos, total } = numeros

  return (
    <ResumoLateral
      idCartao="hoje"
      titulo="Hoje"
      extra={
        pendentes > 0 ? (
          <span className="text-xs text-grafite tabular-nums">
            {pendentes} {pendentes === 1 ? 'pendente' : 'pendentes'}
          </span>
        ) : null
      }
      barraRecolhido={
        total > 0 && (
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden rounded-b-[inherit] bg-pauta/50"
          >
            <div
              className="h-full bg-caneta transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${(feitos / total) * 100}%` }}
            />
          </div>
        )
      }
    >
      <FraseDoResumo>{fraseDoDia(numeros)}</FraseDoResumo>
      <ContagemDeTipos
        grupos={numeros.grupos}
        itensDosGrupos={numeros.itensPendentesDosGrupos}
        soltas={numeros.soltas}
      />
      {total > 0 && <BarraDoDia feitos={feitos} total={total} />}
      <div className="mt-2">
        <LinkDoResumo para={`/dia/${hoje}`}>Ver o dia</LinkDoResumo>
      </div>
    </ResumoLateral>
  )
}
