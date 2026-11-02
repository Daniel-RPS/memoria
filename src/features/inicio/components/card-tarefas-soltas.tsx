import { Dot } from 'lucide-react'
import { IndicadorNotas } from '@/components/notas/indicador-notas'
import type { SoltaDoResumo } from '@/lib/inicio'
import {
  BotaoTrazer,
  LinhaMarcavel,
  PontoDaCategoria,
  SeloHaDias,
} from '@/features/inicio/components/linha-marcavel'
import { useAcoesDoInicio } from '@/features/inicio/hooks/use-acoes-do-inicio'

interface CardTarefasSoltasProps {
  soltas: SoltaDoResumo[]
  /** Em Atrasadas: mostra "há X dias" e "Trazer para hoje" em cada tarefa. */
  onTrazer?: (tarefaId: string) => void
}

/** As tarefas sem grupo num card só, depois dos grupos. Sem tarefa, o card não aparece. */
export function CardTarefasSoltas({ soltas, onTrazer }: CardTarefasSoltasProps) {
  const { definirConclusao } = useAcoesDoInicio()
  if (soltas.length === 0) return null

  return (
    <div
      role="group"
      aria-label="Tarefas soltas"
      className="rounded-md border border-pauta bg-card py-1.5 pr-2 pl-3"
    >
      <p aria-hidden className="-ml-1.5 flex items-center text-xs text-grafite">
        <Dot className="size-4" />
        Tarefas soltas
      </p>
      <ul>
        {soltas.map(({ tarefa, dias }) => (
          <LinhaMarcavel
            key={tarefa.id}
            titulo={tarefa.titulo}
            isFeita={tarefa.status === 'concluida'}
            onMarcar={(isFeita) => void definirConclusao(tarefa.id, isFeita)}
            selo={onTrazer && dias !== null && <SeloHaDias dias={dias} />}
          >
            <IndicadorNotas
              vinculo={{ tipo: 'tarefa', id: tarefa.id }}
              titulo={tarefa.titulo}
              revelarCom="linha"
            />
            <PontoDaCategoria dono={tarefa} />
            {onTrazer && (
              <BotaoTrazer
                rotulo={`Trazer ${tarefa.titulo} para hoje`}
                onTrazer={() => onTrazer(tarefa.id)}
                revelarCom="linha"
              />
            )}
          </LinhaMarcavel>
        ))}
      </ul>
    </div>
  )
}
