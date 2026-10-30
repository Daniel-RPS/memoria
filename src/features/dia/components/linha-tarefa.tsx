import { useState, type ReactNode } from 'react'
import { cn } from 'cn'
import { Checkbox } from '@/components/ui/checkbox'
import type { DataLocal, Task } from '@/db/types'
import { diasPendente, textoDiasPendente } from '@/lib/tarefas'
import { useAcoesTarefa } from '@/features/dia/hooks/use-acoes-tarefa'
import { MenuTarefa } from '@/features/dia/components/menu-tarefa'
import { TituloEditavel } from '@/features/dia/components/titulo-editavel'

interface LinhaTarefaProps {
  tarefa: Task
  hoje: DataLocal
  /** Alça de arrastar; ausente nas concluídas. */
  alca?: ReactNode
}

/** Uma linha pautada: caixa de seleção, título, selo de atraso e menu de ações. */
export function LinhaTarefa({ tarefa, hoje, alca }: LinhaTarefaProps) {
  const { definirConclusao, renomearTarefa } = useAcoesTarefa()
  const [isEditando, setIsEditando] = useState(false)
  const isConcluida = tarefa.status === 'concluida'
  const dias = diasPendente(tarefa, hoje)

  function handleSalvarTitulo(titulo: string) {
    setIsEditando(false)
    if (titulo !== tarefa.titulo) void renomearTarefa(tarefa.id, titulo)
  }

  return (
    <div className="group flex min-h-12 items-center gap-2 border-b border-pauta pr-2 pl-1">
      <span className="flex w-5 shrink-0 justify-center">{alca}</span>
      <Checkbox
        checked={isConcluida}
        onCheckedChange={(marcada) => void definirConclusao(tarefa.id, marcada === true)}
        aria-label={isConcluida ? `Desmarcar ${tarefa.titulo}` : `Concluir ${tarefa.titulo}`}
        className="size-5 rounded-[4px] border-2 border-tinta/70 data-[state=checked]:border-caneta data-[state=checked]:bg-caneta"
      />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 py-2 pl-1">
        <TituloEditavel
          titulo={tarefa.titulo}
          isEditando={isEditando}
          onIniciarEdicao={() => setIsEditando(true)}
          onSalvar={handleSalvarTitulo}
          onCancelar={() => setIsEditando(false)}
          className={cn(isConcluida && 'text-grafite line-through decoration-tinta/50')}
        />
        {dias !== null && !isEditando && (
          <span className="bg-[linear-gradient(transparent_12%,var(--marca-texto)_12%,var(--marca-texto)_88%,transparent_88%)] px-1 text-sm whitespace-nowrap">
            {textoDiasPendente(dias)}
          </span>
        )}
      </div>
      <MenuTarefa tarefa={tarefa} onRenomear={() => setIsEditando(true)} />
    </div>
  )
}
