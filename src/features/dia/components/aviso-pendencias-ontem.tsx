import { Button } from '@/components/ui/button'
import type { DataLocal } from '@/db/types'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { usePendenciasDeOntem } from '@/features/dia/hooks/use-pendencias-de-ontem'

interface AvisoPendenciasOntemProps {
  hoje: DataLocal
}

/** Na folha de hoje: oferece trazer de uma vez o que ficou pendente ontem. */
export function AvisoPendenciasOntem({ hoje }: AvisoPendenciasOntemProps) {
  const quantidade = usePendenciasDeOntem(hoje)
  const { trazerDeOntem } = useMoverTarefas()

  if (quantidade === 0) return null

  return (
    <div
      role="status"
      className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md bg-marca-texto px-4 py-2.5"
    >
      <p className="text-violeta-profundo">
        {quantidade === 1
          ? 'Ficou 1 tarefa pendente ontem.'
          : `Ficaram ${quantidade} tarefas pendentes ontem.`}
      </p>
      <Button onClick={() => void trazerDeOntem()}>Trazer para hoje</Button>
    </div>
  )
}
