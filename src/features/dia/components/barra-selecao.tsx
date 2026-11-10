import { useState } from 'react'
import { DialogoEscolherDia } from '@/components/dialogo-escolher-dia'
import { Button } from '@/components/ui/button'
import type { DataLocal } from '@/db/types'
import { useAcoesDeArquivo } from '@/hooks/use-acoes-de-arquivo'
import { useAndamento } from '@/hooks/use-andamento'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { usePrioridade } from '@/hooks/use-prioridade'
import { todasSaoDeHoje } from '@/domain/andamento'
import { useSelecaoDaFolha } from '@/features/dia/hooks/use-selecao'

interface BarraSelecaoProps {
  data: DataLocal
  hoje: DataLocal
  /** Pendentes visíveis (tarefas, cards e itens), na ordem da folha (para "Todas"). */
  idsPendentes: string[]
  /** Quais desses ids são cards de grupo e itens: são copiados, não movidos. */
  idsGrupos: string[]
  idsItens: string[]
  /**
   * Quais ids são de HOJE (só eles podem ser marcados em andamento). Ausente = todos se `data`
   * é hoje, senão nenhum. A Semana passa os dos dias de hoje.
   */
  idsDeHoje?: string[]
}

/** Barra fixa no rodapé com as ações sobre as tarefas selecionadas. */
export function BarraSelecao({
  data,
  hoje,
  idsPendentes,
  idsGrupos,
  idsItens,
  idsDeHoje,
}: BarraSelecaoProps) {
  const { selecionados, tipo, encerrar, selecionarTodos } = useSelecaoDaFolha()
  const { arquivarComAviso } = useAcoesDeArquivo()
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
  // "Em andamento" só aparece se TODAS as selecionadas forem de hoje.
  const deHoje = new Set(idsDeHoje ?? (data === hoje ? idsPendentes : []))
  const podeMarcarEmAndamento =
    temAlvoDeAndamento &&
    todasSaoDeHoje(
      [...tarefas, ...deGrupos.itens].map((id) => (deHoje.has(id) ? hoje : '')),
      hoje,
    )

  async function handleAndamento(isMarcar: boolean) {
    await (isMarcar ? marcarEmAndamento(alvosDeAndamento) : pararAndamento(alvosDeAndamento))
    encerrar()
  }

  async function handlePrioridade(isMarcar: boolean) {
    await (isMarcar ? marcarPrioridade(alvosDeAndamento) : tirarPrioridade(alvosDeAndamento))
    encerrar()
  }

  async function handleArquivar() {
    await arquivarComAviso(
      { tarefas, itens: deGrupos.itens },
      [...tarefas, ...deGrupos.itens].map(() => 'tarefa' as const),
    )
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

  // Subetapas selecionadas: só se reordenam (arrastar ou Alt+↑/↓); as ações abaixo são das linhas.
  if (tipo === 'subetapas') {
    return (
      <div
        role="toolbar"
        aria-label="Subetapas selecionadas"
        className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center gap-2 rounded-md border border-tinta/20 bg-tinta px-3 py-2 text-papel shadow-lg"
      >
        <p aria-live="polite" className="mr-auto px-1 text-sm font-semibold">
          {selecionados.size === 1
            ? '1 subetapa selecionada'
            : `${selecionados.size} subetapas selecionadas`}
          <span className="ml-2 font-normal text-papel/70">
            Arraste ou use Alt+↑ e Alt+↓ para reordenar
          </span>
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-papel hover:bg-papel/15 hover:text-papel"
          onClick={encerrar}
        >
          Cancelar
        </Button>
      </div>
    )
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
      {podeMarcarEmAndamento && (
        <Button size="sm" variant="secondary" onClick={() => void handleAndamento(true)}>
          Em andamento
        </Button>
      )}
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
        size="sm"
        variant="secondary"
        disabled={!temAlvoDeAndamento}
        onClick={() => void handleArquivar()}
      >
        Arquivar
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
