import { useState } from 'react'
import { Clock, Search, X } from 'lucide-react'
import { cn } from 'cn'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { filtrarCategoriasDeTempo, formatarDuracao } from '@/domain/tempo'
import { FiltroPeriodoDados } from '@/features/dados/components/filtro-periodo-dados'
import { GraficoPizzaCategoria, GraficoPorTarefa } from '@/features/dados/components/graficos-tempo'
import { ListaTarefasTempo } from '@/features/dados/components/lista-tarefas-tempo'
import { usePeriodoDeDados, useRelatorioDeTempo } from '@/features/dados/hooks/use-dados-tempo'

/**
 * Primeira seção da tela Dados: "Tempo nas tarefas".
 * Exibe filtro de período, linha de resumo, gráficos (barras nítidas e pizza por categoria na semana/mês),
 * busca e lista de tarefas agrupada por categoria.
 */
export function SecaoTempoTarefas() {
  const [periodo, definirPeriodo] = usePeriodoDeDados()
  const [busca, setBusca] = useState('')
  const { isCarregando, hoje, dados, relatorio } = useRelatorioDeTempo(periodo)

  if (isCarregando || !dados || !relatorio) return null

  const semNenhumDadoNoBanco = dados.sessoes.length === 0
  const semDadosNoPeriodo = relatorio.tarefas.length === 0
  const categoriasFiltradas = filtrarCategoriasDeTempo(relatorio.categoriasComTarefas, busca)
  const isVisaoDeUmDia = periodo.tipo === 'hoje' || periodo.tipo === 'dia'
  const mostrarPizza = !isVisaoDeUmDia

  return (
    <section aria-labelledby="titulo-tempo-tarefas" className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-tempo-tarefas" className="text-lg font-bold tracking-tight text-tinta">
          Tempo nas tarefas
        </h2>
        <FiltroPeriodoDados
          periodo={periodo}
          hoje={hoje}
          diasComTempo={relatorio.diasComTempo}
          onMudar={definirPeriodo}
        />
      </div>

      {semNenhumDadoNoBanco || semDadosNoPeriodo ? (
        <div
          data-estado-vazio-tempo=""
          className="flex flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-pauta bg-papel/60 px-6 py-12 text-center"
        >
          <Clock aria-hidden className="size-7 text-grafite/60" />
          <p className="max-w-md text-sm text-grafite">
            Nenhum tempo medido ainda. Marque uma tarefa como Em andamento para começar.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Linha de resumo com 4 métricas */}
          <dl
            aria-label="Resumo do período"
            className="flex flex-wrap items-baseline gap-x-8 gap-y-2 border-t border-b border-pauta py-3 text-sm"
          >
            <div className="flex items-baseline gap-2">
              <dt className="text-xs text-grafite">Tempo médio por tarefa</dt>
              <dd data-resumo-media="" className="font-semibold text-tinta tabular-nums">
                {formatarDuracao(relatorio.tempoMedioMs)}
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="text-xs text-grafite">Tarefas realizadas</dt>
              <dd data-resumo-realizadas="" className="font-semibold text-tinta tabular-nums">
                {relatorio.tarefasMedidas}
              </dd>
            </div>
            {relatorio.tarefaComMaisTempo && (
              <div className="flex min-w-0 max-w-xs items-baseline gap-2">
                <dt className="shrink-0 text-xs text-grafite">Mais tempo</dt>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <dd
                      data-resumo-maior=""
                      title={`${relatorio.tarefaComMaisTempo.titulo} (${formatarDuracao(relatorio.tarefaComMaisTempo.tempoMs)})`}
                      className="truncate font-medium text-tinta cursor-default"
                    >
                      {relatorio.tarefaComMaisTempo.titulo}{' '}
                      <span className="text-grafite tabular-nums">
                        ({formatarDuracao(relatorio.tarefaComMaisTempo.tempoMs)})
                      </span>
                    </dd>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {relatorio.tarefaComMaisTempo.titulo} (
                      {formatarDuracao(relatorio.tarefaComMaisTempo.tempoMs)})
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
            {relatorio.tarefaComMenosTempo && (
              <div className="flex min-w-0 max-w-xs items-baseline gap-2">
                <dt className="shrink-0 text-xs text-grafite">Menos tempo</dt>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <dd
                      data-resumo-menor=""
                      title={`${relatorio.tarefaComMenosTempo.titulo} (${formatarDuracao(relatorio.tarefaComMenosTempo.tempoMs)})`}
                      className="truncate font-medium text-tinta cursor-default"
                    >
                      {relatorio.tarefaComMenosTempo.titulo}{' '}
                      <span className="text-grafite tabular-nums">
                        ({formatarDuracao(relatorio.tarefaComMenosTempo.tempoMs)})
                      </span>
                    </dd>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {relatorio.tarefaComMenosTempo.titulo} (
                      {formatarDuracao(relatorio.tarefaComMenosTempo.tempoMs)})
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </dl>

          {/* Gráficos */}
          <div className={cn('grid gap-6', mostrarPizza && 'md:grid-cols-2')}>
            <GraficoPorTarefa
              dados={relatorio.graficoPorTarefa}
              titulo={isVisaoDeUmDia ? 'Por tarefa' : 'Top 5 tarefas'}
            />
            {mostrarPizza && <GraficoPizzaCategoria fatias={relatorio.fatiasPizza} />}
          </div>

          {/* Busca e lista por categoria */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold tracking-tight text-grafite">
                Por categoria ({categoriasFiltradas.length})
              </h3>
              <div className="relative w-full max-w-xs">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-grafite"
                />
                <Input
                  type="search"
                  aria-label="Buscar por título ou categoria"
                  placeholder="Buscar por título ou categoria…"
                  value={busca}
                  onChange={(evento) => setBusca(evento.target.value)}
                  className="h-8 pr-7 pl-8 text-xs"
                />
                {busca && (
                  <button
                    type="button"
                    aria-label="Limpar busca"
                    onClick={() => setBusca('')}
                    className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-grafite hover:text-tinta"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {categoriasFiltradas.length > 0 ? (
              <ListaTarefasTempo
                categorias={categoriasFiltradas}
                isFiltrando={busca.trim().length > 0}
              />
            ) : (
              <p className="py-6 text-center text-sm text-grafite">
                Nenhuma tarefa encontrada para “{busca}”.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
