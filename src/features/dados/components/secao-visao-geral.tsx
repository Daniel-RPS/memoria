import { FiltroVisaoGeral } from '@/features/dados/components/filtro-visao-geral'
import { GraficoRoscaConcluidas } from '@/features/dados/components/grafico-rosca-concluidas'
import { ResumoVisaoGeral } from '@/features/dados/components/resumo-visao-geral'
import {
  usePeriodoVisaoGeral,
  useRelatorioVisaoGeral,
} from '@/features/dados/hooks/use-dados-visao-geral'
import { textoCompletoDoPeriodo } from '@/domain/periodo'

export function SecaoVisaoGeral() {
  const [periodo, definirPeriodo] = usePeriodoVisaoGeral()
  const { hoje, relatorio } = useRelatorioVisaoGeral(periodo)

  if (!relatorio) return null

  const isVeioDeEscolher = periodo.tipo === 'escolher'
  const linhaPeriodoCompleto = isVeioDeEscolher
    ? textoCompletoDoPeriodo(periodo.dias)
    : undefined

  return (
    <section aria-labelledby="titulo-resumo-periodo" className="grid gap-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="titulo-resumo-periodo" className="text-lg font-bold tracking-tight text-tinta">
            Resumo do período
          </h2>
          <FiltroVisaoGeral
            periodo={periodo}
            hoje={hoje}
            diasComDados={relatorio.diasComTarefas}
            onMudar={definirPeriodo}
          />
        </div>
        {linhaPeriodoCompleto && (
          <p className="text-xs text-grafite/80 break-words">{linhaPeriodoCompleto}</p>
        )}
      </div>

      <ResumoVisaoGeral relatorio={relatorio} />

      <GraficoRoscaConcluidas
        contagem={relatorio.contagem}
        totalTarefas={relatorio.totalTarefas}
        percentualConcluidas={relatorio.percentualConcluidas}
        percentualNaoConcluidas={relatorio.percentualNaoConcluidas}
        percentualEmAberto={relatorio.percentualEmAberto}
      />
    </section>
  )
}
