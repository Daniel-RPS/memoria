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
import { ContextoGruposLembrados, useGruposLembrados } from '@/hooks/use-grupos-lembrados'
import { deDataLocal, isDataLocalValida, somarDias } from '@/lib/datas'
import { inicioDaSemana, intervaloDaSemana } from '@/lib/semana'
import { QuadroSemana } from '@/features/semana/components/quadro-semana'
import { useTarefasDaSemana } from '@/features/semana/hooks/use-tarefas-da-semana'

const DIAS_NA_SEMANA = 7
/** Chave antiga dos cards recolhidos da Semana (por card); hoje vale `memoria:dia-layout`, por série. */
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
  // Séries com card na semana (o estado aberto/recolhido é lembrado por série).
  const idsDasSeries = [
    ...new Set(
      semana.flatMap((dia) =>
        dia.entradas.flatMap((entrada) =>
          entrada.tipo === 'grupo' ? [entrada.grupo.serie.id] : [],
        ),
      ),
    ),
  ]
  const recolhidos = useGruposLembrados()

  return (
    <ContextoCategorias.Provider value={categorias}>
      <ContextoGruposLembrados.Provider value={recolhidos}>
        {/* A folha da semana: cabeçalho e, abaixo do traço, os 7 dias lado a lado. */}
        <div className="rounded-lg border border-pauta bg-papel px-4 pt-5 pb-6 sm:px-6">
          {/* O traço é do cabeçalho (fora da rolagem das colunas): vai de ponta a ponta. */}
          <header className="border-b-2 border-tinta pb-4">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
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
            </div>
            {idsDasSeries.length > 0 && (
              <AcoesDasSecoes
                className="mt-2"
                isTudoAberto={idsDasSeries.every(recolhidos.isAberto)}
                isTudoRecolhido={!idsDasSeries.some(recolhidos.isAberto)}
                onExpandirTudo={() => recolhidos.handleExpandirTudo(idsDasSeries)}
                onRecolherTudo={() => recolhidos.handleRecolherTudo(idsDasSeries)}
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
        </div>
      </ContextoGruposLembrados.Provider>
    </ContextoCategorias.Provider>
  )
}
