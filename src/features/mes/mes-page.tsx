import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { ContextoCategorias } from '@/hooks/contexto-categorias'
import { useCategorias } from '@/hooks/use-categorias'
import { useHoje } from '@/hooks/use-hoje'
import { useGruposDoPeriodo } from '@/hooks/use-grupos-do-periodo'
import { useTarefasDoPeriodo } from '@/hooks/use-tarefas-do-periodo'
import { inicioDoMes, isMesmoMes, nomeDoMes, semanasDoMes, somarMeses } from '@/lib/calendario'
import { isDataLocalValida } from '@/lib/datas'
import { GradeMes } from '@/features/mes/components/grade-mes'

export function MesPage() {
  const { data } = useParams()
  const hoje = useHoje()

  if (!isDataLocalValida(data)) return <Navigate to={`/mes/${hoje}`} replace />

  return <Mes key={inicioDoMes(data)} inicio={inicioDoMes(data)} hoje={hoje} />
}

function Mes({ inicio, hoje }: { inicio: string; hoje: string }) {
  const semanas = semanasDoMes(inicio)
  const primeiro = semanas[0][0]
  const ultimo = semanas.at(-1)!.at(-1)!
  const { tarefas, isCarregando } = useTarefasDoPeriodo(primeiro, ultimo)
  const { grupos, isCarregando: isCarregandoGrupos } = useGruposDoPeriodo(primeiro, ultimo)
  const { categorias } = useCategorias()
  const isEsteMes = isMesmoMes(inicio, hoje)
  const [nome, ano] = nomeDoMes(inicio).split(' de ')

  return (
    <ContextoCategorias.Provider value={categorias}>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <h1 className="flex items-baseline gap-3">
          <span className="text-5xl font-extrabold tracking-[-0.03em] capitalize [font-stretch:75%]">
            {nome}
          </span>
          <Link
            to={`/ano/${ano}`}
            className="text-xl text-grafite hover:text-caneta focus-visible:outline-2 focus-visible:outline-caneta"
          >
            {ano}
          </Link>
        </h1>
        <nav aria-label="Navegar entre meses" className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon">
            <Link to={`/mes/${somarMeses(inicio, -1)}`} aria-label="Mês anterior">
              <ChevronLeft />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className={isEsteMes ? 'pointer-events-none opacity-50' : undefined}
          >
            <Link
              to={`/mes/${hoje}`}
              aria-disabled={isEsteMes}
              tabIndex={isEsteMes ? -1 : undefined}
            >
              Este mês
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon">
            <Link to={`/mes/${somarMeses(inicio, 1)}`} aria-label="Próximo mês">
              <ChevronRight />
            </Link>
          </Button>
        </nav>
      </header>

      {!isCarregando && !isCarregandoGrupos && (
        <GradeMes
          inicioDoMes={inicio}
          semanas={semanas}
          tarefas={tarefas}
          grupos={grupos}
          hoje={hoje}
        />
      )}
    </ContextoCategorias.Provider>
  )
}
