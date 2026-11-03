import { CampoNovoItem } from '@/components/campo-novo-item'
import type { DataLocal } from '@/db/types'
import { useAcoesTarefa } from '@/features/dia/hooks/use-acoes-tarefa'

interface NovaTarefaProps {
  data: DataLocal
  /** Chamado quando o campo perde o foco vazio (volta ao botão "+ Nova tarefa"). */
  onFechar?: () => void
}

/** Linha em branco da seção "Tarefas soltas": cria com Enter e continua pronta para a próxima. */
export function NovaTarefa({ data, onFechar }: NovaTarefaProps) {
  const { criarTarefa } = useAcoesTarefa()

  return (
    <div className="flex items-center pl-1">
      <span className="w-5 shrink-0" />
      <div className="min-w-0 flex-1 pl-2">
        <CampoNovoItem
          rotulo="Nova tarefa"
          autoFocus
          onSairVazio={onFechar}
          onCriar={(titulo) => criarTarefa({ titulo, data })}
        />
      </div>
    </div>
  )
}
