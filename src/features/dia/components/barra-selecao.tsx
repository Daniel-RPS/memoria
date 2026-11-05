import { useState } from 'react'
import { DialogoEscolherDia } from '@/components/dialogo-escolher-dia'
import { Button } from '@/components/ui/button'
import type { DataLocal } from '@/db/types'
import { useAndamento } from '@/hooks/use-andamento'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { usePrioridade } from '@/hooks/use-prioridade'
import { useSelecaoDaFolha } from '@/features/dia/hooks/use-selecao'

interface BarraSelecaoProps {
  data: DataLocal
  hoje: DataLocal
  /** Pendentes visíveis (tarefas, cards e itens), na ordem da folha (para "Todas"). */
  idsPendentes: string[]
  /** Quais desses ids são cards de grupo e itens: são copiados, não movidos. */
  idsGrupos: string[]
  idsItens: string[]
}

/** Barra fixa no rodapé com as ações sobre as tarefas selecionadas. */
export function BarraSelecao({ data, hoje, idsPendentes, idsGrupos, idsItens }: BarraSelecaoProps) {
  const { selecionados, encerrar, selecionarTodos } = useSelecaoDaFolha()
  const { mover, adiar } = useMoverTarefas()
  const { marcarEmAndamento, pararAndamento } = useAndamento()
  const { marcarPrioridade, tirarPrioridade } = usePrioridade()
  const [isEscolhendoDia, setIsEscolhendoDia] = useState(false)
  // Só conta o que ainda está visível (uma tarefa pode ter saído da folha).
  const ids = idsPendentes.filter((id) => selecionados.has(id))
  const quantidade = ids.length
  const isFutura = data > hoje
  const deGrupos = {
    grupos: ids.filter((id) => idsGrupos.includes(id)),
    itens: ids.filter((id) => idsItens.includes(id)),
  }
  const tarefas = ids.filter((id) => !idsGrupos.includes(id) && !idsItens.includes(id))

  /** Só tarefas soltas e itens têm "em andamento"; o card inteiro não. */
  const alvosDeAndamento = { tarefas, itens: deGrupos.itens }
  const temAlvoDeAndamento = tarefas.length + deGrupos.itens.length > 0

  async function handleAndamento(isMarcar: boolean) {
    await (isMarcar ? marcarEmAndamento(alvosDeAndamento) : pararAndamento(alvosDeAndamento))
    encerrar()
  }

  async function handlePrioridade(isMarcar: boolean) {
    await (isMarcar ? marcarPrioridade(alvosDeAndamento) : tirarPrioridade(alvosDeAndamento))
    encerrar()
  }

  async function handleAdiar() {
    await adiar(tarefas, deGrupos)
    encerrar()
  }

  async function handleMover(destino: DataLocal) {
    await mover(tarefas, destino, deGrupos)
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
      <Button
        size="sm"
        variant="secondary"
        disabled={!temAlvoDeAndamento}
        onClick={() => void handleAndamento(true)}
      >
        Em andamento
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={!temAlvoDeAndamento}
        onClick={() => void handleAndamento(false)}
      >
        Parar andamento
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={!temAlvoDeAndamento}
        onClick={() => void handlePrioridade(true)}
      >
        Prioridade
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={!temAlvoDeAndamento}
        onClick={() => void handlePrioridade(false)}
      >
        Tirar prioridade
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
