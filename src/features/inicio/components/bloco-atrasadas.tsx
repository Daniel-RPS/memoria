import { CalendarPlus } from 'lucide-react'
import { Link } from 'react-router'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { textoHaDias, type Atrasada } from '@/lib/inicio'
import { ResumoLateral } from '@/features/inicio/components/resumo-lateral'

interface BlocoAtrasadasProps {
  atrasadas: Atrasada[]
}

/** Quantas linhas mostrar; o resto vira "e mais N". */
const MAXIMO_DE_LINHAS = 8

function idDa(atrasada: Atrasada) {
  return atrasada.tipo === 'tarefa' ? atrasada.tarefa.id : atrasada.grupo.card.id
}

/**
 * Pendentes de dias que passaram, com "há X dias" e "Trazer para hoje" (tarefa solta é
 * movida; card leva os pendentes para o card de hoje, como no resto do app).
 */
export function BlocoAtrasadas({ atrasadas }: BlocoAtrasadasProps) {
  const { hoje, mover } = useMoverTarefas()
  const visiveis = atrasadas.slice(0, MAXIMO_DE_LINHAS)
  const restantes = atrasadas.length - visiveis.length

  function handleTrazer(lista: Atrasada[]) {
    const tarefas = lista.flatMap((item) => (item.tipo === 'tarefa' ? [item.tarefa.id] : []))
    const grupos = lista.flatMap((item) => (item.tipo === 'grupo' ? [item.grupo.card.id] : []))
    void mover(tarefas, hoje, { grupos })
  }

  return (
    <ResumoLateral
      titulo="Atrasadas"
      extra={
        atrasadas.length > 1 && (
          <button
            type="button"
            onClick={() => handleTrazer(atrasadas)}
            className="text-xs font-medium text-violeta-profundo hover:underline"
          >
            Trazer todas para hoje
          </button>
        )
      }
    >
      {atrasadas.length === 0 ? (
        <p className="py-2 text-sm text-grafite">Nada atrasado.</p>
      ) : (
        <ul className="pt-1">
          {visiveis.map((atrasada) => {
            const titulo =
              atrasada.tipo === 'tarefa' ? atrasada.tarefa.titulo : atrasada.grupo.serie.titulo
            const data =
              atrasada.tipo === 'tarefa' ? atrasada.tarefa.data : atrasada.grupo.card.data
            return (
              <li key={idDa(atrasada)} className="flex min-h-8 items-center gap-2 text-sm">
                <Link
                  to={`/dia/${data}`}
                  className="min-w-0 flex-1 truncate hover:underline"
                  title={`Abrir ${titulo} no dia`}
                >
                  {titulo}
                  {atrasada.tipo === 'grupo' && (
                    <span className="text-grafite">
                      {' '}
                      · {atrasada.pendentes} {atrasada.pendentes === 1 ? 'pendente' : 'pendentes'}
                    </span>
                  )}
                </Link>
                <span className="shrink-0 rounded-sm bg-marca-texto px-1.5 text-xs text-violeta-profundo">
                  {textoHaDias(atrasada.dias)}
                </span>
                <button
                  type="button"
                  aria-label={`Trazer ${titulo} para hoje`}
                  title="Trazer para hoje"
                  onClick={() => handleTrazer([atrasada])}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-grafite hover:bg-accent hover:text-tinta"
                >
                  <CalendarPlus aria-hidden className="size-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {restantes > 0 && (
        <p className="pt-1 text-xs text-grafite">
          e mais {restantes} {restantes === 1 ? 'atrasada' : 'atrasadas'}
        </p>
      )}
    </ResumoLateral>
  )
}
