import { useState } from 'react'
import type { Subtask } from '@/db/types'
import { useAcoesSubtarefa } from '@/features/dia/hooks/use-acoes-subtarefa'
import { CampoNovoItem } from '@/components/campo-novo-item'
import { ItemSubtarefa } from '@/features/dia/components/item-subtarefa'
import { ListaOrdenavel } from '@/components/lista-ordenavel'

interface ListaSubtarefasProps {
  /** Tarefa solta ou item de grupo dono das subetapas. */
  dono: { id: string; titulo: string }
  subtarefas: Subtask[]
  /** Foca "Nova subetapa" ao abrir (vindo de "Adicionar subetapa" no menu). */
  isFocandoNovaSubtarefa: boolean
  /** Fecha o painel: campo vazio sem subetapas, ou Esc no campo vazio. */
  onFechar: () => void
  /** Semana: tipografia menor. */
  isCompacto?: boolean
}

/**
 * Subetapas reordenáveis de uma tarefa ou item, com a linha para criar a próxima: Enter cria e
 * continua, colar várias linhas cria várias, Backspace na linha vazia volta para a anterior
 * (e, numa subetapa vazia, apaga e volta), Esc no campo vazio sai.
 */
export function ListaSubtarefas({
  dono,
  subtarefas,
  isFocandoNovaSubtarefa,
  onFechar,
  isCompacto = false,
}: ListaSubtarefasProps) {
  const { criarSubtarefa, criarSubtarefas, excluirSubtarefa, reordenarSubtarefa } =
    useAcoesSubtarefa()
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null)
  const ultima = subtarefas.at(-1)

  async function handleApagarVazia(subtarefa: Subtask) {
    const indice = subtarefas.findIndex((outra) => outra.id === subtarefa.id)
    setIdEmEdicao(subtarefas[indice - 1]?.id ?? null)
    await excluirSubtarefa(subtarefa.id)
  }

  return (
    <div>
      <ListaOrdenavel
        itens={subtarefas}
        rotulo={`Subetapas de ${dono.titulo}`}
        onReordenar={reordenarSubtarefa}
        renderItem={(subtarefa) => (
          <ItemSubtarefa
            key={subtarefa.id}
            subtarefa={subtarefa}
            isEditando={idEmEdicao === subtarefa.id}
            onMudarEdicao={(isEditando) => setIdEmEdicao(isEditando ? subtarefa.id : null)}
            onApagarVazio={() => void handleApagarVazia(subtarefa)}
            isCompacto={isCompacto}
          />
        )}
      />
      <div className="pl-7">
        <CampoNovoItem
          rotulo="Nova subetapa"
          tamanho="compacto"
          autoFocus={isFocandoNovaSubtarefa}
          onSairVazio={subtarefas.length === 0 ? onFechar : undefined}
          onSairComEsc={onFechar}
          onApagarVazio={ultima ? () => setIdEmEdicao(ultima.id) : undefined}
          onCriar={(titulo) => criarSubtarefa({ taskId: dono.id, titulo })}
          onColarVarias={(titulos) => criarSubtarefas(dono.id, titulos)}
        />
      </div>
    </div>
  )
}
