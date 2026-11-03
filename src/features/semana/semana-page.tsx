import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { AcoesDasSecoes } from '@/components/secao-recolhivel'
import { Button } from '@/components/ui/button'
import { ContextoCategorias } from '@/hooks/contexto-categorias'
import { useCategorias } from '@/hooks/use-categorias'
import { useHoje } from '@/hooks/use-hoje'
import { useSecoesRecolhidas } from '@/hooks/use-secoes-recolhidas'
import { deDataLocal, isDataLocalValida, somarDias } from '@/lib/datas'
import { inicioDaSemana, intervaloDaSemana } from '@/lib/semana'
import { QuadroSemana } from '@/features/semana/components/quadro-semana'
import {
  ContextoCardsRecolhidos,
  ESCOPO_CARDS_DA_SEMANA,
} from '@/features/semana/hooks/use-cards-recolhidos'
import { useTarefasDaSemana } from '@/features/semana/hooks/use-tarefas-da-semana'

const DIAS_NA_SEMANA = 7

export function SemanaPage() {
  const { data } = useParams()
  const dataHoje = useHoje()

  if (!isDataLocalValida(data)) return <Navigate to={`/semana/${dataHoje}`} replace />

  return <Semana inicio={inicioDaSemana(data)} hoje={dataHoje} />
}

function Semana({ inicio, hoje }: { inicio: string; hoje: string }) {
  const { categorias } = useCategorias()
  const { semana, subtarefasPorTarefa, isCarregando } = useTarefasDaSemana(inicio)
  const isEstaSemana = inicio === inicioDaSemana(hoje)
  const recolhidos = useSecoesRecolhidas(ESCOPO_CARDS_DA_SEMANA, false)
  const idsDosCards = semana.flatMap((dia) =>
    dia.entradas.flatMap((entrada) => (entrada.tipo === 'grupo' ? [entrada.grupo.card.id] : [])),
  )

  return (
    <ContextoCategorias.Provider value={categorias}>
      <ContextoCardsRecolhidos.Provider value={recolhidos}>
        {/* A folha da semana: cabeçalho e, abaixo do traço, os 7 dias lado a lado. */}
        <div className="rounded-lg border border-pauta bg-papel px-4 pt-5 pb-6 sm:px-6">
          <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <h1 className="flex flex-col">
              <span className="text-sm text-grafite">
                {isEstaSemana ? 'Esta semana' : 'Semana'}, {format(deDataLocal(inicio), 'yyyy')}
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
          </header>
          {idsDosCards.length > 0 && (
            <AcoesDasSecoes
              className="mt-2"
              isTudoAberto={idsDosCards.every(recolhidos.isAberta)}
              isTudoRecolhido={!idsDosCards.some(recolhidos.isAberta)}
              onExpandirTudo={() => recolhidos.handleExpandirTudo(idsDosCards)}
              onRecolherTudo={() => recolhidos.handleRecolherTudo(idsDosCards)}
            />
          )}

          {!isCarregando && (
            <QuadroSemana
              key={inicio}
              semana={semana}
              subtarefasPorTarefa={subtarefasPorTarefa}
              hoje={hoje}
            />
          )}
        </div>
      </ContextoCardsRecolhidos.Provider>
    </ContextoCategorias.Provider>
  )
}
