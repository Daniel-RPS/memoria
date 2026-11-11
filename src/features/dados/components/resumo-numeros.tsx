import { cn } from 'cn'
import type { RelatorioDeNumeros } from '@/domain/numeros'

interface CartaoDoResumo {
  rotulo: string
  valor: string
  apoio?: string
}

function cartoesDoResumo(relatorio: RelatorioDeNumeros): CartaoDoResumo[] {
  if (relatorio.total === 0) {
    return ['Tarefas', 'Concluídas', 'Pendentes', 'Adiadas'].map((rotulo) => ({
      rotulo,
      valor: '—',
    }))
  }
  const { atrasadas } = relatorio
  return [
    { rotulo: 'Tarefas', valor: String(relatorio.total), apoio: relatorio.comparacao?.texto },
    {
      rotulo: 'Concluídas',
      valor: String(relatorio.concluidas),
      apoio: `${relatorio.percentualConcluidas}% do total`,
    },
    {
      rotulo: 'Pendentes',
      valor: String(relatorio.pendentes),
      apoio:
        atrasadas > 0 ? `${atrasadas} ${atrasadas === 1 ? 'atrasada' : 'atrasadas'}` : undefined,
    },
    { rotulo: 'Adiadas', valor: String(relatorio.adiadas), apoio: 'mudaram de dia' },
  ]
}

/** Bordas de cada bloco: 2 por linha no estreito, 4 numa linha a partir de 700 px. */
const BORDAS_DO_BLOCO = [
  'pr-3 min-[700px]:pr-4',
  'border-l border-pauta pl-3 min-[700px]:px-4',
  'border-pauta border-l-0 min-[700px]:border-l pr-3 min-[700px]:px-4',
  'border-l border-pauta pl-3 min-[700px]:pl-4',
]

/** Linha de 4 blocos da seção "Tarefas no período", no mesmo desenho do resumo do Tempo. */
export function ResumoNumeros({ relatorio }: { relatorio: RelatorioDeNumeros }) {
  return (
    <dl
      aria-label="Resumo do período"
      className="grid grid-cols-2 gap-y-4 border-y border-pauta py-3.5 text-sm min-[700px]:grid-cols-4 min-[700px]:gap-y-0"
    >
      {cartoesDoResumo(relatorio).map((cartao, indice) => (
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
