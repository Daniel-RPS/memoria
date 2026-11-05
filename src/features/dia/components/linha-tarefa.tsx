import { useState, type ReactNode } from 'react'
import { Paperclip } from 'lucide-react'
import { cn } from 'cn'
import { PainelAnexos } from '@/components/anexos/painel-anexos'
import { FileteDeAndamento, IndicadorAndamento } from '@/components/indicador-andamento'
import { ComBandeira } from '@/components/indicador-prioridade'
import { alvoDePrioridade } from '@/hooks/use-atalho-prioridade'
import { IndicadorNotas } from '@/components/notas/indicador-notas'
import { Checkbox } from '@/components/ui/checkbox'
import type { DataLocal, Subtask, Task } from '@/db/types'
import { classificarTarefa } from '@/lib/categorias'
import { diasPendente, progressoSubtarefas, textoDiasPendente } from '@/lib/tarefas'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { useAcoesTarefa } from '@/features/dia/hooks/use-acoes-tarefa'
import { useExtrasDaTarefa } from '@/features/dia/hooks/contexto-extras'
import { useSelecaoDaFolha } from '@/features/dia/hooks/use-selecao'
import { BotaoProgresso } from '@/features/dia/components/botao-progresso'
import { ListaSubtarefas } from '@/features/dia/components/lista-subtarefas'
import { MenuTarefa } from '@/features/dia/components/menu-tarefa'
import { TituloEditavel } from '@/components/titulo-editavel'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'

interface LinhaTarefaProps {
  tarefa: Task
  subtarefas: Subtask[]
  hoje: DataLocal
  /** Alça de arrastar; ausente nas concluídas. */
  alca?: ReactNode
}

/**
 * Uma linha pautada: caixa de seleção, título, selo de atraso, progresso e menu.
 * As subtarefas abrem logo abaixo, recuadas.
 */
export function LinhaTarefa({ tarefa, subtarefas, hoje, alca }: LinhaTarefaProps) {
  const { definirConclusao, renomearTarefa } = useAcoesTarefa()
  const [isEditando, setIsEditando] = useState(false)
  const [isSubtarefasAbertas, setIsSubtarefasAbertas] = useState(false)
  const [isFocandoNovaSubtarefa, setIsFocandoNovaSubtarefa] = useState(false)
  const [isAnexosAbertos, setIsAnexosAbertos] = useState(false)
  const { quantidadeAnexos } = useExtrasDaTarefa(tarefa.id)
  const isConcluida = tarefa.status === 'concluida'
  const isEmAndamento = tarefa.status === 'pendente' && tarefa.emAndamento === true
  const isPrioritaria = tarefa.status === 'pendente' && tarefa.prioridade === true
  const dias = diasPendente(tarefa, hoje)
  const progresso = progressoSubtarefas(subtarefas)
  const classificacao = classificarTarefa(tarefa, useCategoriasDoContexto())
  const corNaTela = useCorNaTela()
  const idPainel = `subtarefas-${tarefa.id}`
  const idPainelAnexos = `anexos-${tarefa.id}`
  const { isSelecionando, selecionados, alternar } = useSelecaoDaFolha()
  // No modo "Selecionar", pendentes viram itens de seleção (sem arrastar, editar nem menu).
  const isSelecionavel = isSelecionando && !isConcluida
  const isSelecionada = isSelecionavel && selecionados.has(tarefa.id)

  function handleSalvarTitulo(titulo: string) {
    setIsEditando(false)
    if (titulo !== tarefa.titulo) void renomearTarefa(tarefa.id, titulo)
  }

  function handleAdicionarSubtarefa() {
    setIsSubtarefasAbertas(true)
    setIsFocandoNovaSubtarefa(true)
  }

  function handleAbrirAnexos() {
    setIsAnexosAbertos(true)
  }

  function handleAlternarSubtarefas() {
    setIsSubtarefasAbertas((atual) => !atual)
    setIsFocandoNovaSubtarefa(false)
  }

  return (
    <div className="relative border-b border-pauta">
      <div
        data-em-andamento={isEmAndamento || undefined}
        data-prioridade={isPrioritaria || undefined}
        {...alvoDePrioridade('tarefa', tarefa.id, tarefa.status === 'pendente')}
        className={cn(
          'group/linha relative flex min-h-12 items-center gap-2 pr-2 pl-1',
          isSelecionada && 'bg-accent',
        )}
      >
        {isEmAndamento && <FileteDeAndamento />}
        <span className="flex w-5 shrink-0 justify-center">{!isSelecionavel && alca}</span>
        {isSelecionavel ? (
          <Checkbox
            checked={isSelecionada}
            onCheckedChange={() => alternar(tarefa.id)}
            aria-label={`Selecionar ${tarefa.titulo}`}
            className="size-5 rounded-full border-2 border-caneta data-[state=checked]:bg-caneta"
          />
        ) : (
          <Checkbox
            checked={isConcluida}
            onCheckedChange={(marcada) => void definirConclusao(tarefa.id, marcada === true)}
            aria-label={isConcluida ? `Desmarcar ${tarefa.titulo}` : `Concluir ${tarefa.titulo}`}
            className="size-5 rounded-[4px] border-[1.5px] border-tinta/45 bg-papel data-[state=checked]:border-caneta data-[state=checked]:bg-caneta"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 py-2 pl-1">
          <ComBandeira isPrioritario={isPrioritaria && !isEditando}>
            {isSelecionavel ? (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => alternar(tarefa.id)}
                className="min-w-0 text-left text-base break-words"
              >
                {tarefa.titulo}
              </button>
            ) : (
              <TituloEditavel
                titulo={tarefa.titulo}
                isEditando={isEditando}
                onIniciarEdicao={() => setIsEditando(true)}
                onSalvar={handleSalvarTitulo}
                onCancelar={() => setIsEditando(false)}
                className={cn(isConcluida && 'text-grafite line-through decoration-tinta/50')}
              />
            )}
          </ComBandeira>
          {isEmAndamento && !isEditando && <IndicadorAndamento desde={tarefa.emAndamentoDesde} />}
          {!isEditando && (
            <IndicadorNotas vinculo={{ tipo: 'tarefa', id: tarefa.id }} titulo={tarefa.titulo} />
          )}
          {dias !== null && !isEditando && (
            <span className="text-xs font-medium whitespace-nowrap text-alerta">
              {textoDiasPendente(dias)}
            </span>
          )}
          {classificacao && !isEditando && (
            <span className="flex items-center gap-1.5 text-sm whitespace-nowrap text-grafite">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: corNaTela(classificacao.cor) }}
              />
              {classificacao.rotulo}
            </span>
          )}
          {progresso && !isEditando && (
            <BotaoProgresso
              progresso={progresso}
              tituloTarefa={tarefa.titulo}
              isAberto={isSubtarefasAbertas}
              idPainel={idPainel}
              onAlternar={handleAlternarSubtarefas}
            />
          )}
          {quantidadeAnexos > 0 && !isEditando && (
            <button
              type="button"
              onClick={() => setIsAnexosAbertos((atual) => !atual)}
              aria-expanded={isAnexosAbertos}
              aria-controls={idPainelAnexos}
              aria-label={`Anexos de ${tarefa.titulo}: ${quantidadeAnexos === 1 ? '1 anexo' : `${quantidadeAnexos} anexos`}`}
              className="flex items-center gap-1 rounded-sm text-sm text-grafite tabular-nums hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta"
            >
              <Paperclip aria-hidden className="size-3.5" />
              {quantidadeAnexos}
            </button>
          )}
        </div>
        {!isSelecionavel && (
          <MenuTarefa
            tarefa={tarefa}
            hoje={hoje}
            onRenomear={() => setIsEditando(true)}
            onAdicionarSubtarefa={handleAdicionarSubtarefa}
            onAbrirAnexos={handleAbrirAnexos}
          />
        )}
      </div>

      {isAnexosAbertos && (
        <div id={idPainelAnexos} className="pr-3 pb-3 pl-[3.25rem]">
          <PainelAnexos
            dono={{ tipo: 'task', id: tarefa.id }}
            descricaoDono={`da tarefa ${tarefa.titulo}`}
          />
        </div>
      )}
      {isSubtarefasAbertas && (
        <div id={idPainel} className="pb-2 pl-[3.25rem]">
          <ListaSubtarefas
            dono={tarefa}
            subtarefas={subtarefas}
            isFocandoNovaSubtarefa={isFocandoNovaSubtarefa}
            onFechar={() => setIsSubtarefasAbertas(false)}
          />
        </div>
      )}
    </div>
  )
}
