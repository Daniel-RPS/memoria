import type { DataLocal } from '@/db/types'
import { useTarefasDoDia } from '@/features/dia/hooks/use-tarefas-do-dia'
import { GrupoConcluidas } from '@/features/dia/components/grupo-concluidas'
import { ListaPendentes } from '@/features/dia/components/lista-pendentes'
import { NovaTarefa } from '@/features/dia/components/nova-tarefa'

interface FolhaDoDiaProps {
  data: DataLocal
  hoje: DataLocal
}

/** A folha pautada do dia: pendentes, linha para nova tarefa e o grupo de concluídas. */
export function FolhaDoDia({ data, hoje }: FolhaDoDiaProps) {
  const { pendentes, concluidas, isCarregando } = useTarefasDoDia(data)
  const isVazio = !isCarregando && pendentes.length === 0

  return (
    <section aria-label="Tarefas do dia" className="mt-8">
      <div className="rounded-md border border-pauta bg-papel">
        {isVazio && (
          <p className="border-b border-pauta px-4 py-3 text-grafite">
            {concluidas.length > 0
              ? 'Tudo feito neste dia.'
              : 'Nada marcado para este dia. Escreva a primeira tarefa abaixo.'}
          </p>
        )}
        <ListaPendentes pendentes={pendentes} hoje={hoje} />
        <NovaTarefa data={data} />
      </div>
      <GrupoConcluidas concluidas={concluidas} hoje={hoje} />
    </section>
  )
}
