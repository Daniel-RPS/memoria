import { useState } from 'react'
import { Clock, Search, X } from 'lucide-react'
import { cn } from 'cn'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { filtrarCategoriasDeTempo, formatarDuracao } from '@/domain/tempo'
import { resolverDiasDoPeriodo, textoCompletoDoPeriodo } from '@/domain/periodo'
import { FiltroPeriodoDados } from '@/features/dados/components/filtro-periodo-dados'
import { GraficoPizzaCategoria, GraficoPorTarefa } from '@/features/dados/components/graficos-tempo'
import { ListaTarefasTempo } from '@/features/dados/components/lista-tarefas-tempo'
import { usePeriodoDeDados, useRelatorioDeTempo } from '@/features/dados/hooks/use-dados-tempo'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'

/**
 * Seção da tela Dados › Tempo: "Tempo nas tarefas".
 * Exibe filtro de período, linha de resumo em 4 blocos alinhados, gráficos
 * (barras nítidas e pizza por categoria), busca e lista de tarefas agrupada por categoria.
 */
export function SecaoTempoTarefas() {
  const [periodo, definirPeriodo] = usePeriodoDeDados()
  const [busca, setBusca] = useState('')
  const { isCarregando, hoje, dados, relatorio } = useRelatorioDeTempo(periodo)
  const corNaTela = useCorNaTela()

  if (isCarregando || !dados || !relatorio) return null

  const semNenhumDadoNoBanco = dados.sessoes.length === 0
  const semDadosNoPeriodo = relatorio.tarefas.length === 0
  const temDados = !semDadosNoPeriodo && !semNenhumDadoNoBanco
  const categoriasFiltradas = filtrarCategoriasDeTempo(relatorio.categoriasComTarefas, busca)
  const diasDoPeriodo = resolverDiasDoPeriodo(periodo, hoje)
  const isVisaoDeUmDia = diasDoPeriodo.length === 1
  const mostrarPizza = relatorio.fatiasPizza.length > 0

  const isVeioDeEscolher = periodo.tipo === 'escolher'
  const linhaPeriodoCompleto = isVeioDeEscolher
    ? textoCompletoDoPeriodo(periodo.dias)
    : undefined

  return (
    <section aria-labelledby="titulo-tempo-tarefas" className="grid gap-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="titulo-tempo-tarefas" className="text-lg font-bold tracking-tight text-tinta">
            Tempo nas tarefas
          </h2>
          <FiltroPeriodoDados
            periodo={periodo}
            hoje={hoje}
            diasComDados={relatorio.diasComTempo}
            onMudar={definirPeriodo}
          />
        </div>
        {linhaPeriodoCompleto && (
          <p className="text-xs text-grafite/80 break-words">{linhaPeriodoCompleto}</p>
        )}
      </div>

      {/* Grade de 4 blocos de resumo alinhados */}
      <dl
        aria-label="Resumo do período"
        className="grid grid-cols-2 min-[700px]:grid-cols-4 border-y border-pauta py-3.5 gap-y-4 min-[700px]:gap-y-0 text-sm"
      >
        {/* Bloco 1: Tempo médio por tarefa */}
        <div className="flex flex-col min-w-0 pr-3 min-[700px]:pr-4">
          <dt className="text-xs text-grafite font-medium truncate">Tempo médio por tarefa</dt>
          <dd
            data-resumo-media=""
            className="text-xl font-bold tracking-tight text-tinta tabular-nums whitespace-nowrap mt-0.5"
          >
            {temDados ? formatarDuracao(relatorio.tempoMedioMs) : '—'}
          </dd>
          <div aria-hidden className="min-h-[1.25rem] mt-0.5" />
        </div>

        {/* Bloco 2: Tarefas realizadas */}
        <div className="flex flex-col min-w-0 border-l border-pauta pl-3 min-[700px]:px-4">
          <dt className="text-xs text-grafite font-medium truncate">Tarefas realizadas</dt>
          <dd
            data-resumo-realizadas=""
            className="text-xl font-bold tracking-tight text-tinta tabular-nums whitespace-nowrap mt-0.5"
          >
            {temDados ? relatorio.tarefasMedidas : '—'}
          </dd>
          <div aria-hidden className="min-h-[1.25rem] mt-0.5" />
        </div>

        {/* Bloco 3: Mais tempo */}
        <div
          data-resumo-maior=""
          className="flex flex-col min-w-0 border-pauta border-l-0 min-[700px]:border-l pr-3 min-[700px]:px-4"
        >
          <dt className="text-xs text-grafite font-medium truncate">Mais tempo</dt>
          <dd
            data-resumo-maior-valor=""
            className="text-xl font-bold tracking-tight text-tinta tabular-nums whitespace-nowrap mt-0.5"
          >
            {temDados && relatorio.tarefaComMaisTempo
              ? formatarDuracao(relatorio.tarefaComMaisTempo.tempoMs)
              : '—'}
          </dd>
          <div
            data-resumo-maior-detalhe=""
            className="text-xs text-grafite min-h-[1.25rem] mt-0.5 flex items-center min-w-0"
          >
            {temDados && relatorio.tarefaComMaisTempo ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    tabIndex={0}
                    className="flex items-center gap-1.5 min-w-0 cursor-default focus-visible:outline-none"
                  >
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: relatorio.tarefaComMaisTempo.cor
                          ? corNaTela(relatorio.tarefaComMaisTempo.cor)
                          : 'var(--cor-grafite)',
                      }}
                    />
                    <span className="truncate">{relatorio.tarefaComMaisTempo.titulo}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{relatorio.tarefaComMaisTempo.titulo}</p>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </div>

        {/* Bloco 4: Menos tempo */}
        <div
          data-resumo-menor=""
          className="flex flex-col min-w-0 border-l border-pauta pl-3 min-[700px]:pl-4"
        >
          <dt className="text-xs text-grafite font-medium truncate">Menos tempo</dt>
          <dd
            data-resumo-menor-valor=""
            className="text-xl font-bold tracking-tight text-tinta tabular-nums whitespace-nowrap mt-0.5"
          >
            {temDados && relatorio.tarefaComMenosTempo
              ? formatarDuracao(relatorio.tarefaComMenosTempo.tempoMs)
              : '—'}
          </dd>
          <div
            data-resumo-menor-detalhe=""
            className="text-xs text-grafite min-h-[1.25rem] mt-0.5 flex items-center min-w-0"
          >
            {temDados && relatorio.tarefaComMenosTempo ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    tabIndex={0}
                    className="flex items-center gap-1.5 min-w-0 cursor-default focus-visible:outline-none"
                  >
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: relatorio.tarefaComMenosTempo.cor
                          ? corNaTela(relatorio.tarefaComMenosTempo.cor)
                          : 'var(--cor-grafite)',
                      }}
                    />
                    <span className="truncate">{relatorio.tarefaComMenosTempo.titulo}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{relatorio.tarefaComMenosTempo.titulo}</p>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </dl>

      {!temDados ? (
        <div
          data-estado-vazio-tempo=""
          className="flex flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-pauta bg-papel/60 px-6 py-12 text-center"
        >
          <Clock aria-hidden className="size-7 text-grafite/60" />
          <p className="max-w-md text-sm text-grafite">
            {semNenhumDadoNoBanco
              ? 'Nenhum tempo medido ainda. Marque uma tarefa como Em andamento para começar.'
              : 'Nenhum tempo medido neste período.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Gráficos */}
          <div className={cn('grid gap-6', mostrarPizza && 'md:grid-cols-2')}>
            <GraficoPorTarefa
              dados={relatorio.graficoPorTarefa}
              titulo={isVisaoDeUmDia ? 'Por tarefa' : 'Top 5 tarefas'}
            />
            {mostrarPizza && (
              <GraficoPizzaCategoria
                fatias={relatorio.fatiasPizza}
                tempoAtivoTotalMs={relatorio.tempoAtivoTotalMs}
                metricasJornada={relatorio.metricasJornada}
                isVisaoDeUmDia={isVisaoDeUmDia}
              />
            )}
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
