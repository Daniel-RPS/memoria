import { useId, useState } from 'react'
import { Link } from 'react-router'
import { cn } from 'cn'
import { FileteDeAndamento, IndicadorAndamento } from '@/components/indicador-andamento'
import { IndicadorPrioridade } from '@/components/indicador-prioridade'
import { HorarioDaTarefa } from '@/components/horario/horario-da-tarefa'
import { IndicadorNotas } from '@/components/notas/indicador-notas'
import { Checkbox } from '@/components/ui/checkbox'
import { definirConclusao } from '@/db/repositories/task-repository'
import type { DataLocal, Subtask, Task } from '@/db/types'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { classificarTarefa } from '@/lib/categorias'
import { diasPendente, progressoSubtarefas } from '@/lib/tarefas'
import { useSelecaoDaFolha } from '@/features/dia/hooks/use-selecao'
import { BotaoProgresso } from '@/features/dia/components/botao-progresso'
import { ListaSubtarefas } from '@/features/dia/components/lista-subtarefas'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'

interface CartaoTarefaProps {
  tarefa: Task
  subtarefas: Subtask[]
  hoje: DataLocal
  /** Cópia que acompanha o ponteiro enquanto arrasta. */
  isSobreposto?: boolean
}

/** Tarefa compacta da semana: uma linha da pauta com caixa, título e sinais (atraso, categoria). */
export function CartaoTarefa({ tarefa, subtarefas, hoje, isSobreposto }: CartaoTarefaProps) {
  const classificacao = classificarTarefa(tarefa, useCategoriasDoContexto())
  const corNaTela = useCorNaTela()
  const dias = diasPendente(tarefa, hoje)
  const progresso = progressoSubtarefas(subtarefas)
  // Na Semana (coluna estreita) as subetapas começam recolhidas: só o "1/3".
  const [isSubetapasAbertas, setIsSubetapasAbertas] = useState(false)
  // Sem menu ⋯ na Semana: o chip abre o popover para alterar ou remover o horário.
  const [isHorarioAberto, setIsHorarioAberto] = useState(false)
  const idPainel = useId()

  const isEmAndamento = tarefa.status === 'pendente' && tarefa.emAndamento === true
  const isPrioritaria = tarefa.status === 'pendente' && tarefa.prioridade === true
  const { selecionados } = useSelecaoDaFolha()
  const isSelecionada = !isSobreposto && selecionados.has(tarefa.id)

  return (
    <div
      data-em-andamento={isEmAndamento || undefined}
      data-prioridade={isPrioritaria || undefined}
      data-selecionada={isSelecionada || undefined}
      className={cn(
        'group/linha relative flex items-start gap-1.5 border-b border-pauta py-1 pr-1 pl-1 text-[0.8125rem] leading-snug hover:bg-accent/60',
        isSelecionada && 'bg-accent',
        isSobreposto && 'rotate-1 rounded-sm border bg-papel shadow-lg ring-2 ring-caneta/40',
      )}
    >
      {isEmAndamento && <FileteDeAndamento />}
      <Checkbox
        checked={false}
        onCheckedChange={() => void definirConclusao(tarefa.id, true)}
        aria-label={`Concluir ${tarefa.titulo}`}
        className="mt-px size-3.5 rounded-[3px] border-[1.5px] border-tinta/45 bg-papel"
      />
      <div className="min-w-0 flex-1">
        {isPrioritaria && <IndicadorPrioridade isCompacto className="mr-1 align-[-0.125rem]" />}
        <Link
          to={`/dia/${tarefa.data}`}
          className="break-words hover:underline focus-visible:outline-2 focus-visible:outline-caneta"
        >
          {tarefa.titulo}
        </Link>
        {isEmAndamento && <IndicadorAndamento isCompacto className="ml-1.5" />}
        {!isSobreposto && (
          <HorarioDaTarefa
            alvo={{ tipo: 'tarefa', id: tarefa.id }}
            horario={tarefa.horario}
            titulo={tarefa.titulo}
            isAberto={isHorarioAberto}
            onMudarAberto={setIsHorarioAberto}
            isCompacto
            className="ml-1.5"
          />
        )}
        {!isSobreposto && (
          <IndicadorNotas
            vinculo={{ tipo: 'tarefa', id: tarefa.id }}
            titulo={tarefa.titulo}
            revelarCom="linha"
            className="my-0 ml-1 inline-flex h-4 px-0 align-[-0.125rem]"
          />
        )}

        {(dias !== null || progresso || classificacao) && (
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-grafite">
            {dias !== null && (
              <span className="rounded-[3px] bg-marca-texto px-1 font-medium text-violeta-profundo">
                há {dias} {dias === 1 ? 'dia' : 'dias'}
              </span>
            )}
            {progresso && !isSobreposto && (
              <BotaoProgresso
                isCompacto
                progresso={progresso}
                tituloTarefa={tarefa.titulo}
                isAberto={isSubetapasAbertas}
                idPainel={idPainel}
                onAlternar={() => setIsSubetapasAbertas((atual) => !atual)}
              />
            )}
            {classificacao && (
              <span className="flex items-center gap-1">
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: corNaTela(classificacao.cor) }}
                />
                {classificacao.rotulo}
              </span>
            )}
          </p>
        )}
        {progresso && isSubetapasAbertas && !isSobreposto && (
          <div id={idPainel} data-sem-arrasto="" className="cursor-auto pt-0.5">
            <ListaSubtarefas
              isCompacto
              dono={tarefa}
              subtarefas={subtarefas}
              isFocandoNovaSubtarefa={false}
              onFechar={() => setIsSubetapasAbertas(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
