import type { Subtask, Task } from '@/db/types'
import { useAcoesSubtarefa } from '@/features/dia/hooks/use-acoes-subtarefa'
import { CampoNovoItem } from '@/features/dia/components/campo-novo-item'
import { ItemSubtarefa } from '@/features/dia/components/item-subtarefa'
import { ListaOrdenavel } from '@/features/dia/components/lista-ordenavel'

interface ListaSubtarefasProps {
  tarefa: Task
  subtarefas: Subtask[]
  /** Foca "Nova subtarefa" ao abrir (vindo de "Adicionar subtarefa" no menu). */
  isFocandoNovaSubtarefa: boolean
  /** Fecha o painel quando ele ainda não tem subtarefas e o campo fica vazio. */
  onFechar: () => void
}

/** Subtarefas reordenáveis de uma tarefa, com a linha para criar a próxima. */
export function ListaSubtarefas({
  tarefa,
  subtarefas,
  isFocandoNovaSubtarefa,
  onFechar,
}: ListaSubtarefasProps) {
  const { criarSubtarefa, reordenarSubtarefa } = useAcoesSubtarefa()

  return (
    <div>
      <ListaOrdenavel
        itens={subtarefas}
        rotulo={`Subtarefas de ${tarefa.titulo}`}
        onReordenar={reordenarSubtarefa}
        renderItem={(subtarefa) => <ItemSubtarefa key={subtarefa.id} subtarefa={subtarefa} />}
      />
      <div className="pl-7">
        <CampoNovoItem
          rotulo="Nova subtarefa"
          tamanho="compacto"
          autoFocus={isFocandoNovaSubtarefa}
          onSairVazio={subtarefas.length === 0 ? onFechar : undefined}
          onCriar={(titulo) => criarSubtarefa({ taskId: tarefa.id, titulo })}
        />
      </div>
    </div>
  )
}
