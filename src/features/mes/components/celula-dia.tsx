import { useDroppable } from '@dnd-kit/core'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from 'cn'
import { CirculoHoje } from '@/components/circulo-hoje'
import type { DataLocal, Task } from '@/db/types'
import { isMesmoMes } from '@/lib/calendario'
import { deDataLocal } from '@/lib/datas'
import { pendentesDo, type GrupoDoDia } from '@/lib/grupos'
import { ChipGrupoArrastavel, ChipTarefaArrastavel } from '@/features/mes/components/chip-tarefa'

/** Prefixo do id da área de soltar de cada célula (o resto é a data). */
export const PREFIXO_CELULA = 'celula:'

/** Quantos chips (tarefas e cards) aparecem por dia antes do "+N". */
const MAXIMO_VISIVEL = 3

interface CelulaDiaProps {
  data: DataLocal
  hoje: DataLocal
  inicioDoMes: DataLocal
  pendentes: Task[]
  /** Cards com itens pendentes: um chip cada. */
  gruposComPendentes: GrupoDoDia[]
  /** Tarefas soltas e itens de grupo pendentes. */
  quantidadePendentes: number
  /** Tarefas soltas e itens de grupo feitos (transferidos não contam). */
  quantidadeConcluidas: number
}

function descrever(pendentes: number, concluidas: number) {
  const partes = []
  if (pendentes > 0) partes.push(pendentes === 1 ? '1 pendente' : `${pendentes} pendentes`)
  if (concluidas > 0) partes.push(concluidas === 1 ? '1 concluída' : `${concluidas} concluídas`)
  return partes.length > 0 ? partes.join(', ') : 'nada marcado'
}

/** Um dia da grade: número (abre o dia), até 3 chips e o resumo do resto. */
export function CelulaDia({
  data,
  hoje,
  inicioDoMes,
  pendentes,
  gruposComPendentes,
  quantidadePendentes,
  quantidadeConcluidas,
}: CelulaDiaProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `${PREFIXO_CELULA}${data}` })
  const dia = deDataLocal(data)
  const isHoje = data === hoje
  const isForaDoMes = !isMesmoMes(data, inicioDoMes)
  const chips = [
    ...pendentes.map((tarefa) => ({ tipo: 'tarefa' as const, tarefa })),
    ...gruposComPendentes.map((grupo) => ({ tipo: 'grupo' as const, grupo })),
  ]
  const escondidas = chips.length - MAXIMO_VISIVEL
  const nomeCompleto = format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })

  return (
    <li
      ref={setNodeRef}
      aria-label={`${nomeCompleto}: ${descrever(quantidadePendentes, quantidadeConcluidas)}`}
      className={cn(
        'flex min-h-28 min-w-0 flex-col gap-1 border-r border-b border-pauta p-1.5 [&:nth-child(7n)]:border-r-0',
        isForaDoMes && 'bg-nevoa/60',
        isHoje && 'bg-marca-texto/40',
        isOver && 'bg-accent',
      )}
    >
      <Link
        to={`/dia/${data}`}
        aria-label={`Abrir ${nomeCompleto}`}
        className={cn(
          'relative flex size-7 items-center justify-center self-start rounded-full text-sm font-semibold tabular-nums hover:bg-accent focus-visible:outline-2 focus-visible:outline-caneta',
          isForaDoMes && 'font-normal text-grafite',
          isHoje && 'font-bold text-caneta',
        )}
      >
        {format(dia, 'd')}
        {isHoje && <CirculoHoje />}
      </Link>
      <div className="flex min-w-0 flex-col gap-0.5">
        {chips
          .slice(0, MAXIMO_VISIVEL)
          .map((chip) =>
            chip.tipo === 'tarefa' ? (
              <ChipTarefaArrastavel key={chip.tarefa.id} tarefa={chip.tarefa} hoje={hoje} />
            ) : (
              <ChipGrupoArrastavel
                key={chip.grupo.card.id}
                grupo={chip.grupo}
                quantidade={pendentesDo(chip.grupo).length}
                hoje={hoje}
              />
            ),
          )}
      </div>
      {(escondidas > 0 || quantidadeConcluidas > 0) && (
        <Link
          to={`/dia/${data}`}
          className="mt-auto flex items-center gap-2 rounded-sm px-1 text-xs text-grafite hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta"
        >
          {escondidas > 0 && <span>+{escondidas}</span>}
          {quantidadeConcluidas > 0 && (
            <span className="flex items-center gap-0.5">
              <Check aria-hidden className="size-3" />
              {quantidadeConcluidas}
              <span className="sr-only">
                {quantidadeConcluidas === 1 ? 'concluída' : 'concluídas'}
              </span>
            </span>
          )}
        </Link>
      )}
    </li>
  )
}
