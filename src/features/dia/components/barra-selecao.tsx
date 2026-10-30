import { useState } from 'react'
import { DialogoEscolherDia } from '@/components/dialogo-escolher-dia'
import { Button } from '@/components/ui/button'
import type { DataLocal } from '@/db/types'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { useSelecaoDaFolha } from '@/features/dia/hooks/use-selecao'

interface BarraSelecaoProps {
  data: DataLocal
  hoje: DataLocal
  /** Pendentes visíveis, na ordem da folha (para "Selecionar todas"). */
  idsPendentes: string[]
}

/** Barra fixa no rodapé com as ações sobre as tarefas selecionadas. */
export function BarraSelecao({ data, hoje, idsPendentes }: BarraSelecaoProps) {
  const { selecionados, encerrar, selecionarTodos } = useSelecaoDaFolha()
  const { mover, adiar } = useMoverTarefas()
  const [isEscolhendoDia, setIsEscolhendoDia] = useState(false)
  // Só conta o que ainda está visível (uma tarefa pode ter saído da folha).
  const ids = idsPendentes.filter((id) => selecionados.has(id))
  const quantidade = ids.length
  const isFutura = data > hoje

  async function handleAdiar() {
    await adiar(ids)
    encerrar()
  }

  async function handleMover(destino: DataLocal) {
    await mover(ids, destino)
    encerrar()
  }

  return (
    <div
      role="toolbar"
      aria-label="Ações para as tarefas selecionadas"
      className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center gap-2 rounded-md border border-tinta/20 bg-tinta px-3 py-2 text-papel shadow-lg"
    >
      <p aria-live="polite" className="mr-auto px-1 text-sm font-semibold">
        {quantidade === 0
          ? 'Escolha as tarefas'
          : quantidade === 1
            ? '1 selecionada'
            : `${quantidade} selecionadas`}
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="text-papel hover:bg-papel/15 hover:text-papel"
        onClick={() => selecionarTodos(idsPendentes)}
      >
        Todas
      </Button>
      <Button size="sm" variant="secondary" disabled={quantidade === 0} onClick={handleAdiar}>
        {isFutura ? 'Adiar um dia' : 'Adiar para amanhã'}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={quantidade === 0}
        onClick={() => setIsEscolhendoDia(true)}
      >
        Mover para…
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-papel hover:bg-papel/15 hover:text-papel"
        onClick={encerrar}
      >
        Cancelar
      </Button>

      <DialogoEscolherDia
        isAberto={isEscolhendoDia}
        onMudarAberto={setIsEscolhendoDia}
        titulo={quantidade === 1 ? 'Mover 1 tarefa' : `Mover ${quantidade} tarefas`}
        dataInicial={data}
        hoje={hoje}
        onEscolher={(destino) => void handleMover(destino)}
      />
    </div>
  )
}
