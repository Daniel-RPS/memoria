import { cn } from 'cn'
import { TONS } from '@/features/ano/tons'

const FAIXAS = [
  { tom: 1, texto: '1 tarefa' },
  { tom: 2, texto: '2 a 3' },
  { tom: 3, texto: '4 ou mais' },
] as const

/** Explica os tons e a marca de atraso da visão de ano. */
export function LegendaAno() {
  return (
    <ul
      aria-label="Legenda"
      className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-grafite"
    >
      {FAIXAS.map((faixa) => (
        <li key={faixa.tom} className="flex items-center gap-1.5">
          <span aria-hidden className={cn('size-3.5 rounded-sm', TONS[faixa.tom])} />
          {faixa.texto}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="size-1.5 rounded-full bg-tinta ring-1 ring-papel" />
        tem pendência atrasada
      </li>
    </ul>
  )
}
