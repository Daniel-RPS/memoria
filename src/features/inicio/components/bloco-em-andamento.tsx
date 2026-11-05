import { ListChecks, Square } from 'lucide-react'
import { PontoDeAndamento } from '@/components/indicador-andamento'
import type { ResumoDeAndamento } from '@/domain/andamento'
import { LinkDoResumo } from '@/features/inicio/components/partes-do-resumo'
import { ResumoLateral } from '@/features/inicio/components/resumo-lateral'
import { textoDaQuantidade } from '@/lib/inicio'

interface BlocoEmAndamentoProps {
  resumo: ResumoDeAndamento | null
}

/**
 * Bloco que aparece no topo da coluna da direita do Início SOMENTE quando há
 * itens ou tarefas soltas com `emAndamento = true`. Sem nada em andamento, não renderiza nada.
 */
export function BlocoEmAndamento({ resumo }: BlocoEmAndamentoProps) {
  if (!resumo || resumo.total === 0) return null

  const { grupos, soltas, total, diaDestino } = resumo

  return (
    <ResumoLateral
      rotuloAria="Em andamento"
      glow="accent"
      titulo={
        <span className="flex items-center gap-1.5">
          <PontoDeAndamento />
          <span>Em andamento</span>
        </span>
      }
      extra={<span className="text-xs tabular-nums text-grafite">{total} agora</span>}
    >
      <ul aria-label="Grupos e tarefas em andamento" className="mt-2 flex flex-col gap-1.5">
        {grupos.map((grupo) => (
          <li
            key={grupo.seriesId}
            className="flex items-baseline justify-between gap-2 text-[0.8125rem]"
          >
            <div className="flex min-w-0 items-baseline gap-2">
              <ListChecks
                aria-hidden
                className="size-3.5 shrink-0 translate-y-0.5 text-caneta/75"
              />
              <span className="break-words font-medium text-tinta">{grupo.nome}</span>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-grafite">
              {textoDaQuantidade(grupo.quantidade, 'item', 'itens')}
            </span>
          </li>
        ))}
        {soltas > 0 && (
          <li className="flex items-center gap-2 text-[0.8125rem]">
            <Square aria-hidden className="size-3.5 shrink-0 text-caneta/75" />
            <span className="font-medium text-tinta">
              {textoDaQuantidade(soltas, 'tarefa solta', 'tarefas soltas')}
            </span>
          </li>
        )}
      </ul>
      {diaDestino && (
        <div className="mt-2">
          <LinkDoResumo para={`/dia/${diaDestino}`}>Ver no dia</LinkDoResumo>
        </div>
      )}
    </ResumoLateral>
  )
}
