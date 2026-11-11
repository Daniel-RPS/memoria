import { cn } from 'cn'
import type { RelatorioDeNumeros } from '@/domain/numeros'
import {
  COR_CONCLUIDAS,
  COR_EM_ABERTO,
  COR_NAO_CONCLUIDAS,
} from '@/features/dados/components/cores-dos-numeros'

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
    { rotulo: 'Concluídas', valor: String(relatorio.concluidas) },
    {
      rotulo: 'Pendentes',
      valor: String(relatorio.pendentes),
      apoio:
        atrasadas > 0 ? `${atrasadas} ${atrasadas === 1 ? 'atrasada' : 'atrasadas'}` : undefined,
    },
    { rotulo: 'Adiadas', valor: String(relatorio.adiadas), apoio: 'mudaram de dia' },
  ]
}

/**
 * Bordas de cada bloco: 2 por linha no estreito (o 5º ocupa a linha toda), 5 numa linha a
 * partir de 700 px, separados por traço.
 */
const BORDAS_DO_BLOCO = [
  'pr-3 min-[700px]:pr-4',
  'border-l border-pauta pl-3 min-[700px]:px-4',
  'border-pauta border-l-0 min-[700px]:border-l pr-3 min-[700px]:px-4',
  'border-l border-pauta pl-3 min-[700px]:px-4',
  'col-span-2 border-pauta min-[700px]:col-span-1 min-[700px]:border-l min-[700px]:pl-4',
]

/** Linha de 5 blocos da seção "Tarefas no período", no mesmo desenho do resumo do Tempo. */
export function ResumoNumeros({ relatorio }: { relatorio: RelatorioDeNumeros }) {
  return (
    <dl
      aria-label="Resumo do período"
      className="grid grid-cols-2 items-start gap-y-4 border-y border-pauta py-3.5 text-sm min-[700px]:grid-cols-5 min-[700px]:gap-y-0"
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
      <CartaoConcluidasENao relatorio={relatorio} className={BORDAS_DO_BLOCO[4]} />
    </dl>
  )
}

interface CartaoConcluidasENaoProps {
  relatorio: RelatorioDeNumeros
  className?: string
}

/** "Concluídas × não concluídas": as duas com número e % do total e a barra das três classes. */
function CartaoConcluidasENao({ relatorio, className }: CartaoConcluidasENaoProps) {
  const linhas = [
    {
      rotulo: 'Concluídas',
      cor: COR_CONCLUIDAS.fundo,
      quantidade: relatorio.concluidas,
      percentual: relatorio.percentualConcluidas,
    },
    {
      rotulo: 'Não concluídas',
      cor: COR_NAO_CONCLUIDAS.fundo,
      quantidade: relatorio.naoConcluidas,
      percentual: relatorio.percentualNaoConcluidas,
    },
  ]
  const larguraDe = (quantidade: number) => `${(quantidade / relatorio.total) * 100}%`

  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <dt className="truncate text-xs font-medium text-grafite">Concluídas × não concluídas</dt>
      {relatorio.total === 0 ? (
        <dd className="mt-0.5 text-xl font-bold tracking-tight text-tinta">—</dd>
      ) : (
        <dd className="mt-1.5 grid gap-1">
          {linhas.map((linha) => (
            <div key={linha.rotulo} className="flex min-w-0 items-center gap-1.5 text-xs">
              <span aria-hidden className={cn('size-2 shrink-0 rounded-full', linha.cor)} />
              <span className="truncate text-tinta">{linha.rotulo}</span>
              <span className="ml-auto shrink-0 font-medium whitespace-nowrap text-grafite tabular-nums">
                {linha.quantidade} · {linha.percentual}%
              </span>
            </div>
          ))}
          <div
            aria-hidden
            className={cn('mt-1 flex h-1.5 overflow-hidden rounded-full', COR_EM_ABERTO.fundo)}
          >
            <div
              className={cn('h-full', COR_CONCLUIDAS.fundo)}
              style={{ width: larguraDe(relatorio.concluidas) }}
            />
            <div
              className={cn('h-full', COR_NAO_CONCLUIDAS.fundo)}
              style={{ width: larguraDe(relatorio.naoConcluidas) }}
            />
          </div>
        </dd>
      )}
    </div>
  )
}
