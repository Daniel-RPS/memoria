import { useState } from 'react'
import { cn } from 'cn'
import type { DataLocal } from '@/db/types'
import { useCategorias } from '@/hooks/use-categorias'
import { diaEMes } from '@/lib/captura'
import type { NivelDeIntensidade } from '@/lib/estatisticas'
import { CORES_DOS_NIVEIS } from '@/features/inicio/components/cores-dos-niveis'
import { GradeDoMapa } from '@/features/inicio/components/grade-do-mapa'
import { useMapaDeConclusoes } from '@/features/inicio/hooks/use-mapa-de-conclusoes'

interface MapaDeConclusoesProps {
  hoje: DataLocal
}

const NIVEIS: NivelDeIntensidade[] = [0, 1, 2, 3, 4]

function plural(quantidade: number, singular: string, plural: string) {
  return quantidade === 1 ? singular : plural
}

/**
 * Mapa do último ano no formato do gráfico de contribuições do GitHub: tarefas soltas e
 * itens de grupo concluídos por dia, com filtro por categoria e sequências.
 */
export function MapaDeConclusoes({ hoje }: MapaDeConclusoesProps) {
  const { categorias } = useCategorias()
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const mapa = useMapaDeConclusoes(hoje, categoryId)
  const filtros = [{ id: undefined, nome: 'Todas', cor: undefined }, ...categorias]
  const { atual, maior } = mapa.sequencias

  return (
    <section
      aria-labelledby="titulo-mapa"
      className="rounded-lg border border-pauta bg-papel px-5 pt-4 pb-5"
    >
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-tinta pb-2">
        <h2 id="titulo-mapa" className="text-lg font-bold tracking-[-0.01em] [font-stretch:85%]">
          <span className="tabular-nums">{mapa.total}</span>{' '}
          {plural(mapa.total, 'item concluído', 'itens concluídos')} no último ano
        </h2>
        {categorias.length > 0 && (
          <div role="group" aria-label="Filtrar por categoria" className="flex flex-wrap gap-1">
            {filtros.map((filtro) => {
              const isEscolhido = filtro.id === categoryId
              return (
                <button
                  key={filtro.id ?? 'todas'}
                  type="button"
                  aria-pressed={isEscolhido}
                  onClick={() => setCategoryId(filtro.id)}
                  className={cn(
                    'flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    isEscolhido
                      ? 'border-tinta bg-tinta text-papel'
                      : 'border-pauta text-grafite hover:border-grafite hover:text-tinta',
                  )}
                >
                  {filtro.cor && (
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: filtro.cor }}
                    />
                  )}
                  {filtro.nome}
                </button>
              )
            })}
          </div>
        )}
      </header>

      <GradeDoMapa
        semanas={mapa.semanas}
        meses={mapa.meses}
        contagem={mapa.contagem}
        faixas={mapa.faixas}
        hoje={hoje}
      />

      <footer className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <dt className="text-xs text-grafite">Sequência atual</dt>
            <dd className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold tabular-nums [font-stretch:80%]">
                {atual}
              </span>
              <span className="text-sm text-grafite">{plural(atual, 'dia', 'dias')}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-grafite">Maior sequência</dt>
            <dd className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold tabular-nums [font-stretch:80%]">
                {maior}
              </span>
              <span className="text-sm text-grafite">{plural(maior, 'dia', 'dias')}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-grafite">Dia mais produtivo</dt>
            <dd className="flex items-baseline gap-1">
              {mapa.maisProdutivo ? (
                <>
                  <span className="text-2xl font-extrabold tabular-nums [font-stretch:80%]">
                    {diaEMes(mapa.maisProdutivo.data)}
                  </span>
                  <span className="text-sm text-grafite">
                    {mapa.maisProdutivo.quantidade}{' '}
                    {plural(mapa.maisProdutivo.quantidade, 'concluído', 'concluídos')}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-extrabold text-grafite [font-stretch:80%]">–</span>
              )}
            </dd>
          </div>
        </dl>
        <div aria-hidden className="flex items-center gap-1.5 text-xs text-grafite">
          Menos
          {NIVEIS.map((nivel) => (
            <span
              key={nivel}
              className={cn('size-[11px] rounded-[2px]', CORES_DOS_NIVEIS[nivel])}
            />
          ))}
          Mais
        </div>
      </footer>
    </section>
  )
}
