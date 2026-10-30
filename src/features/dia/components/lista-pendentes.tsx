import type { DataLocal, Subtask, Task } from '@/db/types'
import { useAcoesTarefa } from '@/features/dia/hooks/use-acoes-tarefa'
import { ItemPendente } from '@/features/dia/components/item-pendente'
import { ListaOrdenavel } from '@/features/dia/components/lista-ordenavel'

interface ListaPendentesProps {
  pendentes: Task[]
  subtarefasPorTarefa: Map<string, Subtask[]>
  hoje: DataLocal
}

const SEM_SUBTAREFAS: Subtask[] = []

export function ListaPendentes({ pendentes, subtarefasPorTarefa, hoje }: ListaPendentesProps) {
  const { reordenarTarefa } = useAcoesTarefa()

  return (
    <ListaOrdenavel
      itens={pendentes}
      rotulo="Pendentes"
      onReordenar={reordenarTarefa}
      renderItem={(tarefa) => (
        <ItemPendente
          key={tarefa.id}
          tarefa={tarefa}
          subtarefas={subtarefasPorTarefa.get(tarefa.id) ?? SEM_SUBTAREFAS}
          hoje={hoje}
        />
      )}
    />
  )
}
