import { useState } from 'react'
import { Clock, Download, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  filtrarTarefasDeTempo,
  formatarDuracao,
  gerarCsvDeTempo,
  type DadosDeTempo,
  type PeriodoDeDados,
} from '@/domain/tempo'
import type { DataLocal } from '@/db/types'
import { FiltroPeriodoDados } from '@/features/dados/components/filtro-periodo-dados'
import { GraficoPorCategoria, GraficoPorDia } from '@/features/dados/components/graficos-tempo'
import { ListaTarefasTempo } from '@/features/dados/components/lista-tarefas-tempo'
import { usePeriodoDeDados, useRelatorioDeTempo } from '@/features/dados/hooks/use-dados-tempo'

function baixarCsv(
  dados: DadosDeTempo,
  periodo: PeriodoDeDados,
  hoje: DataLocal,
  agoraIso: string,
) {
  const csv = gerarCsvDeTempo(dados, periodo, hoje, agoraIso)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `memoria-tempo-${hoje}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * Primeira seção da tela Dados: "Tempo nas tarefas".
 * Exibe filtro de período, resumo, gráficos por categoria e por dia, busca, lista de tarefas
 * expansível por sessão e exportação CSV.
 */
export function SecaoTempoTarefas() {
  const [periodo, definirPeriodo] = usePeriodoDeDados()
  const [busca, setBusca] = useState('')
  const { isCarregando, hoje, dados, relatorio, agoraIso } = useRelatorioDeTempo(periodo)

  if (isCarregando || !dados || !relatorio) return null

  const semNenhumDadoNoBanco = dados.sessoes.length === 0
  const semDadosNoPeriodo = relatorio.tarefas.length === 0
  const tarefasFiltradas = filtrarTarefasDeTempo(relatorio.tarefas, busca)
  const mostrarGraficoPorDia = periodo.tipo !== 'hoje'

  return (
    <section aria-labelledby="titulo-tempo-tarefas" className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-tempo-tarefas" className="text-lg font-bold tracking-tight text-tinta">
          Tempo nas tarefas
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <FiltroPeriodoDados periodo={periodo} hoje={hoje} onMudar={definirPeriodo} />
          {!semDadosNoPeriodo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => baixarCsv(dados, periodo, hoje, agoraIso)}
              className="h-8 gap-1.5 text-xs text-grafite hover:text-tinta"
            >
              <Download aria-hidden className="size-3.5" />
              Exportar CSV
            </Button>
          )}
        </div>
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
          {/* Linha de resumo com 3 números pequenos */}
          <dl
            aria-label="Resumo do período"
            className="flex flex-wrap items-baseline gap-x-8 gap-y-2 border-t border-b border-pauta py-3 text-sm"
          >
            <div className="flex items-baseline gap-2">
              <dt className="text-xs text-grafite">Total no período</dt>
              <dd data-resumo-total="" className="font-semibold text-tinta tabular-nums">
                {formatarDuracao(relatorio.tempoTotalMs)}
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="text-xs text-grafite">Tarefas medidas</dt>
              <dd data-resumo-tarefas="" className="font-semibold text-tinta tabular-nums">
                {relatorio.tarefasMedidas} {relatorio.tarefasMedidas === 1 ? 'tarefa' : 'tarefas'}
              </dd>
            </div>
            {relatorio.tarefaComMaisTempo && (
              <div className="flex min-w-0 items-baseline gap-2">
                <dt className="shrink-0 text-xs text-grafite">Mais tempo</dt>
                <dd data-resumo-maior="" className="truncate font-medium text-tinta">
                  {relatorio.tarefaComMaisTempo.titulo}{' '}
                  <span className="text-grafite tabular-nums">
                    ({formatarDuracao(relatorio.tarefaComMaisTempo.tempoMs)})
                  </span>
                </dd>
              </div>
            )}
          </dl>

          {/* Gráficos */}
          <div className="grid gap-6 md:grid-cols-2">
            <GraficoPorCategoria itens={relatorio.porCategoria} />
            {mostrarGraficoPorDia && <GraficoPorDia dias={relatorio.porDia} />}
          </div>

          {/* Busca e lista de tarefas */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold tracking-tight text-grafite">
                Tarefas ({tarefasFiltradas.length})
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

            {tarefasFiltradas.length > 0 ? (
              <ListaTarefasTempo tarefas={tarefasFiltradas} />
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
