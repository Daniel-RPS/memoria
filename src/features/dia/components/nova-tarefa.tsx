import type { DataLocal } from '@/db/types'
import { useAcoesTarefa } from '@/features/dia/hooks/use-acoes-tarefa'
import { CampoNovoItem } from '@/features/dia/components/campo-novo-item'

interface NovaTarefaProps {
  data: DataLocal
}

/** Próxima linha em branco da folha do dia. */
export function NovaTarefa({ data }: NovaTarefaProps) {
  const { criarTarefa } = useAcoesTarefa()

  return (
    <div className="flex items-center pl-1">
      <span className="w-5 shrink-0" />
      <div className="min-w-0 flex-1 pl-2">
        <CampoNovoItem rotulo="Nova tarefa" onCriar={(titulo) => criarTarefa({ titulo, data })} />
      </div>
    </div>
  )
}
