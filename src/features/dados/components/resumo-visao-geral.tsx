import { cn } from 'cn'
import { formatarDuracao } from '@/domain/tempo'
import type { RelatorioDeVisaoGeral } from '@/domain/visaoGeral'

interface CartaoDoResumo {
  rotulo: string
  valor: string
  apoio?: string
}

function montarCartoes(relatorio: RelatorioDeVisaoGeral): CartaoDoResumo[] {
  const { totalTarefas, diasNoPeriodo, mediaTarefasPorDiaTexto, tempoMedioMs, concluidasComTempo, totalConcluidas } = relatorio

  // Cartão 1: Tarefas: total do período. Apoio: "em N dias" (N = quantidade de dias do período).
  const apoioDias = diasNoPeriodo === 1 ? 'em 1 dia' : `em ${diasNoPeriodo} dias`
  const cartao1: CartaoDoResumo = {
    rotulo: 'Tarefas',
    valor: totalTarefas > 0 ? String(totalTarefas) : totalTarefas === 0 && diasNoPeriodo > 0 ? '0' : '—',
    apoio: apoioDias,
  }

  // Cartão 2: Média por dia: total ÷ diasNoPeriodo com 1 casa decimal e vírgula ("2,4").
  // Apoio: "tarefas por dia". Período sem tarefas: "—".
  const cartao2: CartaoDoResumo = {
    rotulo: 'Média por dia',
    valor: mediaTarefasPorDiaTexto,
    apoio: 'tarefas por dia',
  }

  // Cartão 3: Tempo médio por tarefa: média das CONCLUÍDAS do período com tempo medido.
  // Formato igual ao do Tempo ("12 min", "1h 05"). Apoio: "N de M concluídas com tempo medido".
  // Nenhuma com tempo: "—" e apoio "Sem tempo medido".
  let valorTempo = '—'
  let apoioTempo = 'Sem tempo medido'
  if (tempoMedioMs !== undefined && concluidasComTempo > 0) {
    valorTempo = formatarDuracao(tempoMedioMs)
    apoioTempo = `${concluidasComTempo} de ${totalConcluidas} concluídas com tempo medido`
  }

  const cartao3: CartaoDoResumo = {
    rotulo: 'Tempo médio por tarefa',
    valor: valorTempo,
    apoio: apoioTempo,
  }

  return [cartao1, cartao2, cartao3]
}

const BORDAS_DO_BLOCO = [
  'pr-3 min-[700px]:pr-4',
  'border-l border-pauta pl-3 min-[700px]:px-4',
  'border-l border-pauta pl-3 min-[700px]:px-4',
]

/** Linha de 3 cartões no mesmo estilo e tamanho dos cartões do Números. */
export function ResumoVisaoGeral({ relatorio }: { relatorio: RelatorioDeVisaoGeral }) {
  const cartoes = montarCartoes(relatorio)

  return (
    <dl
      aria-label="Resumo dos cartões"
      className="grid grid-cols-1 sm:grid-cols-3 items-start gap-y-4 border-y border-pauta py-3.5 text-sm sm:gap-y-0"
    >
      {cartoes.map((cartao, indice) => (
        <div key={cartao.rotulo} className={cn('flex min-w-0 flex-col', BORDAS_DO_BLOCO[indice])}>
          <dt className="truncate text-xs font-medium text-grafite">{cartao.rotulo}</dt>
          <dd className="mt-0.5 text-xl font-bold tracking-tight whitespace-nowrap text-tinta tabular-nums">
            {cartao.valor}
          </dd>
          <dd className="mt-0.5 min-h-[1.25rem] truncate text-xs text-grafite tabular-nums">
            {cartao.apoio}
          </dd>
        </div>
      ))}
    </dl>
  )
}
