import { ArrowRight, ListChecks, Square } from 'lucide-react'
import { Link } from 'react-router'
import { textoDaQuantidade } from '@/lib/inicio'

/** Frase principal de Hoje e Atrasadas: peso médio, texto inteiro (quebra a linha, nunca corta). */
export function FraseDoResumo({ children }: { children: string }) {
  return <p className="mt-2 text-sm font-medium">{children}</p>
}

interface ContagemDeTiposProps {
  grupos: number
  /** Itens pendentes dos grupos, ao lado ("1 grupo · 1 item"); omitido ou 0 = não mostra. */
  itensDosGrupos?: number
  soltas: number
}

/**
 * Contagem em lista: uma linha por tipo com ícone à esquerda na cor de destaque com opacidade reduzida.
 * Grupos e tarefas soltas em cor de texto principal (13px), itens dos grupos alinhados ao texto na linha de baixo (12px cinza).
 * Tipo com zero não aparece.
 */
export function ContagemDeTipos({ grupos, itensDosGrupos = 0, soltas }: ContagemDeTiposProps) {
  if (grupos === 0 && soltas === 0) return null
  return (
    <ul aria-label="Grupos e tarefas soltas" className="mt-2 flex flex-col gap-1.5">
      {grupos > 0 && (
        <li className="flex flex-col">
          <div className="flex items-center gap-2 text-[0.8125rem] font-medium text-tinta">
            <ListChecks aria-hidden className="size-3.5 shrink-0 text-caneta/75" />
            <span>{textoDaQuantidade(grupos, 'grupo', 'grupos')}</span>
          </div>
          {itensDosGrupos > 0 && (
            <span className="pl-[1.375rem] text-xs font-normal text-grafite">
              {textoDaQuantidade(itensDosGrupos, 'item', 'itens')}
            </span>
          )}
        </li>
      )}
      {soltas > 0 && (
        <li className="flex items-center gap-2 text-[0.8125rem] font-medium text-tinta">
          <Square aria-hidden className="size-3.5 shrink-0 text-caneta/75" />
          <span>{textoDaQuantidade(soltas, 'tarefa solta', 'tarefas soltas')}</span>
        </li>
      )}
    </ul>
  )
}

interface BarraDoDiaProps {
  feitos: number
  total: number
}

/** Barra fina de progresso do dia (feitos / total) na cor de destaque do tema. */
export function BarraDoDia({ feitos, total }: BarraDoDiaProps) {
  return (
    <div
      role="progressbar"
      aria-label="Progresso de hoje"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={feitos}
      aria-valuetext={`${feitos} de ${total} feitos`}
      className="mt-2 h-1 overflow-hidden rounded-full bg-pauta"
    >
      <div
        className="h-full rounded-full bg-caneta transition-[width] duration-300 motion-reduce:transition-none"
        style={{ width: `${(feitos / total) * 100}%` }}
      />
    </div>
  )
}

interface LinkDoResumoProps {
  para: string
  children: string
}

/** "Ver o dia →" / "Ver atrasadas →" no pé do bloco. */
export function LinkDoResumo({ para, children }: LinkDoResumoProps) {
  return (
    <Link
      to={para}
      className="inline-flex items-center gap-1 text-xs font-medium text-violeta-profundo hover:underline"
    >
      {children}
      <ArrowRight aria-hidden className="size-3" />
    </Link>
  )
}
