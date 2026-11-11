import { ListChecks } from 'lucide-react'
import { FiltroPeriodoDados } from '@/features/dados/components/filtro-periodo-dados'
import { GraficoPorCategoria } from '@/features/dados/components/grafico-por-categoria'
import { GraficoPorDia } from '@/features/dados/components/grafico-por-dia'
import { ResumoNumeros } from '@/features/dados/components/resumo-numeros'
import { useRelatorioDeNumeros } from '@/features/dados/hooks/use-dados-numeros'
import { usePeriodoDeDados } from '@/features/dados/hooks/use-dados-tempo'

/**
 * Seção "Tarefas no período" da tela Números: o mesmo filtro (e a mesma escolha lembrada) do
 * Tempo, os 4 blocos do resumo e os gráficos Por dia (semana e mês) e Por categoria.
 */
export function SecaoTarefasPeriodo() {
  const [periodo, definirPeriodo] = usePeriodoDeDados()
  const { hoje, relatorio } = useRelatorioDeNumeros(periodo)

  if (!relatorio) return null

  return (
    <section aria-labelledby="titulo-tarefas-periodo" className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-tarefas-periodo" className="text-lg font-bold tracking-tight text-tinta">
          Tarefas no período
        </h2>
        <FiltroPeriodoDados
          periodo={periodo}
          hoje={hoje}
          diasComDados={relatorio.diasComTarefas}
          onMudar={definirPeriodo}
        />
      </div>

      <ResumoNumeros relatorio={relatorio} />

      {relatorio.total === 0 ? (
        <div
          data-estado-vazio-numeros=""
          className="flex flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-pauta bg-papel/60 px-6 py-12 text-center"
        >
          <ListChecks aria-hidden className="size-7 text-grafite/60" />
          <p className="max-w-md text-sm text-grafite">Nenhuma tarefa neste período.</p>
        </div>
      ) : relatorio.porDia ? (
        <div className="grid gap-6 md:grid-cols-[55fr_45fr]">
          <GraficoPorDia colunas={relatorio.porDia} />
          <GraficoPorCategoria barras={relatorio.porCategoria} />
        </div>
      ) : (
        <GraficoPorCategoria barras={relatorio.porCategoria} />
      )}
    </section>
  )
}
