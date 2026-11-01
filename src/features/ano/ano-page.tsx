import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { useHoje } from '@/hooks/use-hoje'
import { useGruposDoPeriodo } from '@/hooks/use-grupos-do-periodo'
import { useTarefasDoPeriodo } from '@/hooks/use-tarefas-do-periodo'
import { mesesDoAno, resumirPorDia } from '@/lib/calendario'
import { itensParaResumo } from '@/lib/grupos'
import { LegendaAno } from '@/features/ano/components/legenda-ano'
import { MiniMes } from '@/features/ano/components/mini-mes'

const ANO_MINIMO = 1900
const ANO_MAXIMO = 2999

function anoValido(texto: string | undefined) {
  const ano = Number(texto)
  return Number.isInteger(ano) && ano >= ANO_MINIMO && ano <= ANO_MAXIMO ? ano : null
}

export function AnoPage() {
  const { ano: textoAno } = useParams()
  const hoje = useHoje()
  const ano = anoValido(textoAno)

  if (ano === null) return <Navigate to={`/ano/${hoje.slice(0, 4)}`} replace />

  return <Ano key={ano} ano={ano} hoje={hoje} />
}

function Ano({ ano, hoje }: { ano: number; hoje: string }) {
  const { tarefas, isCarregando } = useTarefasDoPeriodo(`${ano}-01-01`, `${ano}-12-31`)
  const { grupos, isCarregando: isCarregandoGrupos } = useGruposDoPeriodo(
    `${ano}-01-01`,
    `${ano}-12-31`,
  )
  // Itens de grupo contam como tarefas do dia (transferidos não contam).
  const resumo = resumirPorDia([...tarefas, ...itensParaResumo(grupos)], hoje)
  const isEsteAno = hoje.startsWith(String(ano))

  return (
    // A folha do ano: cabeçalho e legenda; abaixo do traço, os 12 meses.
    <div className="rounded-lg border border-pauta bg-papel px-4 pt-5 pb-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <h1 className="text-6xl font-extrabold tracking-[-0.04em] tabular-nums [font-stretch:75%]">
          {ano}
        </h1>
        <nav aria-label="Navegar entre anos" className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon">
            <Link to={`/ano/${ano - 1}`} aria-label="Ano anterior">
              <ChevronLeft />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className={isEsteAno ? 'pointer-events-none opacity-50' : undefined}
          >
            <Link
              to={`/ano/${hoje.slice(0, 4)}`}
              aria-disabled={isEsteAno}
              tabIndex={isEsteAno ? -1 : undefined}
            >
              Este ano
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon">
            <Link to={`/ano/${ano + 1}`} aria-label="Próximo ano">
              <ChevronRight />
            </Link>
          </Button>
        </nav>
      </header>

      <LegendaAno />

      {!isCarregando && !isCarregandoGrupos && (
        <div className="mt-5 grid gap-x-8 gap-y-10 border-t-2 border-tinta pt-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mesesDoAno(ano).map((inicio) => (
            <MiniMes key={inicio} inicio={inicio} hoje={hoje} resumo={resumo} />
          ))}
        </div>
      )}
    </div>
  )
}
