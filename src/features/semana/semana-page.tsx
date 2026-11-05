import { useEffect } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { AcoesDasSecoes } from '@/components/secao-recolhivel'
import { removerPreferencia } from '@/app/preferencia-local'
import { Button } from '@/components/ui/button'
import { ContextoCategorias } from '@/hooks/contexto-categorias'
import { useCategorias } from '@/hooks/use-categorias'
import { useHoje } from '@/hooks/use-hoje'
import {
  ContextoGruposSemana,
  useGruposSemana,
  type CardIdentificado,
} from '@/features/semana/hooks/use-grupos-semana'
import { deDataLocal, isDataLocalValida, somarDias } from '@/lib/datas'
import { inicioDaSemana, intervaloDaSemana } from '@/lib/semana'
import { ContextoSubetapas } from '@/hooks/contexto-subetapas'
import { BarraSelecao } from '@/features/dia/components/barra-selecao'
import { ContextoSelecao, useSelecao } from '@/features/dia/hooks/use-selecao'
import { pendentesDo } from '@/lib/grupos'
import { QuadroSemana } from '@/features/semana/components/quadro-semana'
import { useTarefasDaSemana } from '@/features/semana/hooks/use-tarefas-da-semana'

const DIAS_NA_SEMANA = 7
/** Chave antiga dos cards recolhidos da Semana (legado); hoje o estado é por card em memória via `defaultGroupExpanded`. */
const CHAVE_ANTIGA_DOS_RECOLHIDOS = 'memoria:recolhidos:semana:cards'

export function SemanaPage() {
  const { data } = useParams()
  const dataHoje = useHoje()

  useEffect(() => removerPreferencia(CHAVE_ANTIGA_DOS_RECOLHIDOS), [])

  if (!isDataLocalValida(data)) return <Navigate to={`/semana/${dataHoje}`} replace />

  const inicio = inicioDaSemana(data)
  return <Semana key={inicio} inicio={inicio} hoje={dataHoje} />
}

function Semana({ inicio, hoje }: { inicio: string; hoje: string }) {
  const { categorias } = useCategorias()
  const { semana, subtarefasPorTarefa, isCarregando } = useTarefasDaSemana(inicio)
  const isEstaSemana = inicio === inicioDaSemana(hoje)
  const cardsDosGrupos: CardIdentificado[] = semana.flatMap((dia) =>
    dia.entradas.flatMap((entrada) =>
      entrada.tipo === 'grupo'
        ? [{ serieId: entrada.grupo.serie.id, data: entrada.grupo.card.data }]
        : [],
    ),
  )
  const gruposSemana = useGruposSemana(cardsDosGrupos, hoje)
  // Selecionar na Semana: o mesmo estado e a mesma barra do Dia (tarefas soltas e itens).
  const selecao = useSelecao()
  const idsDeTarefas = semana.flatMap((dia) =>
    dia.entradas.flatMap((entrada) => (entrada.tipo === 'tarefa' ? [entrada.tarefa.id] : [])),
  )
  const idsDeItens = semana.flatMap((dia) =>
    dia.entradas.flatMap((entrada) =>
      entrada.tipo === 'grupo' ? pendentesDo(entrada.grupo).map((item) => item.id) : [],
    ),
  )

  return (
    <ContextoCategorias.Provider value={categorias}>
      <ContextoGruposSemana.Provider value={gruposSemana}>
        <ContextoSelecao.Provider value={selecao}>
          <ContextoSubetapas.Provider value={subtarefasPorTarefa}>
            {/* A folha da semana: cabeçalho e, abaixo do traço, os 7 dias lado a lado. */}
            <div className="rounded-lg border border-pauta bg-papel px-4 pt-5 pb-6 sm:px-6">
              {/* O traço é do cabeçalho (fora da rolagem das colunas): vai de ponta a ponta. */}
              <header className="border-b-2 border-tinta pb-4">
                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                  <h1 className="flex flex-col">
                    <span className="text-sm text-grafite">
                      {isEstaSemana ? 'Esta semana' : 'Semana'},{' '}
                      {format(deDataLocal(inicio), 'yyyy')}
                    </span>
                    <span className="text-4xl font-extrabold tracking-[-0.02em] [font-stretch:80%]">
                      {intervaloDaSemana(inicio)}
                    </span>
                  </h1>
                  <nav aria-label="Navegar entre semanas" className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="icon">
                      <Link
                        to={`/semana/${somarDias(inicio, -DIAS_NA_SEMANA)}`}
                        aria-label="Semana anterior"
                      >
                        <ChevronLeft />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className={isEstaSemana ? 'pointer-events-none opacity-50' : undefined}
                    >
                      <Link
                        to={`/semana/${hoje}`}
                        aria-disabled={isEstaSemana}
                        tabIndex={isEstaSemana ? -1 : undefined}
                      >
                        Esta semana
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon">
                      <Link
                        to={`/semana/${somarDias(inicio, DIAS_NA_SEMANA)}`}
                        aria-label="Próxima semana"
                      >
                        <ChevronRight />
                      </Link>
                    </Button>
                  </nav>
                </div>
                {cardsDosGrupos.length > 0 && (
                  <AcoesDasSecoes
                    className="mt-2"
                    isTudoAberto={gruposSemana.isTudoAberto}
                    isTudoRecolhido={gruposSemana.isTudoRecolhido}
                    onExpandirTudo={gruposSemana.handleExpandirTudo}
                    onRecolherTudo={gruposSemana.handleRecolherTudo}
                  />
                )}
              </header>

              {!isCarregando && (
                <QuadroSemana
                  key={inicio}
                  semana={semana}
                  subtarefasPorTarefa={subtarefasPorTarefa}
                  hoje={hoje}
                />
              )}
              {(selecao.isSelecionando || selecao.temSelecao) && (
                <BarraSelecao
                  data={hoje}
                  hoje={hoje}
                  idsPendentes={[...idsDeTarefas, ...idsDeItens]}
                  idsGrupos={[]}
                  idsItens={idsDeItens}
                />
              )}
            </div>
          </ContextoSubetapas.Provider>
        </ContextoSelecao.Provider>
      </ContextoGruposSemana.Provider>
    </ContextoCategorias.Provider>
  )
}
