import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatarDuracao, type DadosGraficoPorTarefa, type TempoPorDia } from '@/domain/tempo'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'
import { deDataLocal } from '@/lib/datas'

interface GraficoPorTarefaProps {
  dados: DadosGraficoPorTarefa
}

/**
 * Gráfico 1 — tempo por tarefa: uma barra por tarefa na cor da categoria (ou neutra),
 * ordenada do maior para o menor tempo no período, com comprimento proporcional à maior tarefa.
 * Exibe até 8 tarefas; excedentes são somados na linha "+N outras".
 * Logo acima das barras, uma legenda compacta de categorias presentes no período.
 */
export function GraficoPorTarefa({ dados }: GraficoPorTarefaProps) {
  const corNaTela = useCorNaTela()
  const { itens, categoriasLegenda } = dados
  if (itens.length === 0) return null

  return (
    <section aria-label="Tempo por tarefa" className="grid gap-2.5">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-xs font-semibold tracking-tight text-grafite">Por tarefa</h3>
        {categoriasLegenda.length > 0 && (
          <div
            data-legenda-categorias=""
            className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-grafite"
          >
            {categoriasLegenda.map((cat) => {
              const cor = cat.cor ? corNaTela(cat.cor) : 'var(--grafite)'
              return (
                <span
                  key={cat.id ?? 'sem-categoria'}
                  data-legenda-item={cat.nome}
                  className="inline-flex items-center gap-1.5"
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cor }}
                  />
                  <span className="text-tinta">{cat.nome}</span>
                </span>
              )
            })}
          </div>
        )}
      </div>

      <ul className="grid gap-2">
        {itens.map((item) => {
          const cor = item.cor ? corNaTela(item.cor) : 'var(--grafite)'
          const larguraPct = Math.max(3, Math.min(100, item.proporcao))
          const tituloCompleto = item.nomeGrupo ? `${item.titulo} (${item.nomeGrupo})` : item.titulo

          return (
            <li
              key={item.chave}
              data-barra-tarefa={item.titulo}
              data-proporcao={item.proporcao}
              className="grid grid-cols-[minmax(7rem,12rem)_1fr] items-center gap-3 text-sm"
            >
              <span
                className="flex min-w-0 items-baseline gap-1.5 truncate text-tinta"
                title={tituloCompleto}
              >
                <span className="truncate">{item.titulo}</span>
                {item.nomeGrupo && (
                  <span className="shrink-0 text-xs text-grafite">{item.nomeGrupo}</span>
                )}
              </span>
              <div className="flex min-w-0 items-center gap-2.5">
                <svg
                  aria-hidden
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                  className="h-2 rounded-full"
                  style={{ width: `${larguraPct}%`, minWidth: '0.5rem' }}
                >
                  <rect
                    data-barra-retangulo=""
                    x={0}
                    y={0}
                    width={100}
                    height={8}
                    rx={4}
                    style={{ fill: cor }}
                  />
                </svg>
                <span className="shrink-0 text-xs font-medium whitespace-nowrap text-grafite tabular-nums">
                  {formatarDuracao(item.tempoMs)}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

interface GraficoPorDiaProps {
  dias: TempoPorDia[]
}

/**
 * Gráfico 2 — tempo por dia (semana, mês ou intervalo): colunas finas em SVG, uma por dia, na cor
 * de destaque do tema (`var(--caneta)`); passar o mouse ou focar mostra o total do dia.
 */
export function GraficoPorDia({ dias }: GraficoPorDiaProps) {
  const [indiceAtivo, setIndiceAtivo] = useState<number | null>(null)
  if (dias.length <= 1) return null

  const maiorMs = Math.max(1, ...dias.map((d) => d.tempoMs))
  const diaAtivo = indiceAtivo !== null ? dias[indiceAtivo] : undefined
  const mostrarTodosOsRotulos = dias.length <= 10
  const passoRotulo = dias.length <= 16 ? 2 : 5
  const passoX = dias.length <= 7 ? 44 : dias.length <= 16 ? 26 : 16
  const larguraColuna = dias.length <= 7 ? 12 : dias.length <= 16 ? 8 : 6

  return (
    <section aria-label="Tempo por dia" className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-tight text-grafite">Por dia</h3>
        <span
          data-resumo-dia-grafico=""
          className="min-h-4 text-xs font-medium text-tinta tabular-nums"
        >
          {diaAtivo ? (
            <>
              {format(deDataLocal(diaAtivo.data), 'EEE, dd/MM', { locale: ptBR })} ·{' '}
              <span className="text-violeta-profundo">{formatarDuracao(diaAtivo.tempoMs)}</span>
            </>
          ) : (
            <span className="text-grafite">Passe o mouse numa coluna para ver o dia</span>
          )}
        </span>
      </div>

      <div
        className="rounded-md border border-pauta bg-papel px-3 pt-3 pb-2"
        onMouseLeave={() => setIndiceAtivo(null)}
      >
        <svg
          role="img"
          aria-label="Colunas de tempo por dia"
          viewBox={`0 0 ${dias.length * passoX} 76`}
          className="h-24 w-full overflow-visible"
        >
          {dias.map((dia, indice) => {
            const xCentro = indice * passoX + passoX / 2
            const xColuna = xCentro - larguraColuna / 2
            const alturaMax = 52
            const yBase = 56
            const altura =
              dia.tempoMs > 0 ? Math.max(4, Math.round((dia.tempoMs / maiorMs) * alturaMax)) : 2
            const yTopo = yBase - altura
            const isAtivo = indiceAtivo === indice
            const rotuloData =
              dias.length <= 7
                ? format(deDataLocal(dia.data), 'EEE', { locale: ptBR }).slice(0, 3)
                : format(deDataLocal(dia.data), 'dd/MM', { locale: ptBR })
            const deveMostrarRotulo =
              mostrarTodosOsRotulos ||
              indice === 0 ||
              indice === dias.length - 1 ||
              indice % passoRotulo === 0
            const descricaoAcessivel = `${format(deDataLocal(dia.data), 'dd/MM/yyyy')}: ${formatarDuracao(dia.tempoMs)}`

            return (
              <g
                key={dia.data}
                data-coluna-dia={dia.data}
                tabIndex={0}
                role="graphics-symbol"
                aria-label={descricaoAcessivel}
                onMouseEnter={() => setIndiceAtivo(indice)}
                onFocus={() => setIndiceAtivo(indice)}
                onBlur={() => setIndiceAtivo(null)}
                className="cursor-pointer outline-none"
              >
                <title>{descricaoAcessivel}</title>
                {/* Área invisível mais larga para facilitar o hover em colunas finas */}
                <rect x={indice * passoX} y={0} width={passoX} height={76} fill="transparent" />
                <rect
                  x={xColuna}
                  y={yTopo}
                  width={larguraColuna}
                  height={altura}
                  rx={2}
                  style={{
                    fill:
                      dia.tempoMs > 0
                        ? isAtivo
                          ? 'var(--violeta-profundo)'
                          : 'var(--caneta)'
                        : 'var(--pauta)',
                  }}
                />
                {deveMostrarRotulo && (
                  <text
                    x={xCentro}
                    y={71}
                    textAnchor="middle"
                    className="fill-grafite text-[8px] tabular-nums select-none"
                  >
                    {rotuloData}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}
