import { DialogoEscolherDia } from '@/components/dialogo-escolher-dia'
import type { DataLocal } from '@/db/types'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { pendentesDo, type GrupoDoDia } from '@/lib/grupos'

interface DialogoLevarPendentesProps {
  grupo: GrupoDoDia
  hoje: DataLocal
  isAberto: boolean
  onMudarAberto: (isAberto: boolean) => void
}

/** "Levar pendentes para…": escolhe o dia e leva todos os pendentes do card numa operação. */
export function DialogoLevarPendentes({
  grupo,
  hoje,
  isAberto,
  onMudarAberto,
}: DialogoLevarPendentesProps) {
  const { mover } = useMoverTarefas()
  const { card, serie } = grupo
  const quantidade = pendentesDo(grupo).length

  return (
    <DialogoEscolherDia
      isAberto={isAberto}
      onMudarAberto={onMudarAberto}
      titulo={`Levar pendentes de “${serie.titulo}”`}
      descricao={`${quantidade === 1 ? 'O item pendente vai' : `Os ${quantidade} itens pendentes vão`} para o card “${serie.titulo}” do dia escolhido. Este card fica aqui como registro.`}
      dataInicial={card.data}
      hoje={hoje}
      onEscolher={(destino) => void mover([], destino, { grupos: [card.id] })}
    />
  )
}
