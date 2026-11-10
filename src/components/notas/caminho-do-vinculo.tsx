import { Fragment } from 'react'
import {
  ChevronRight,
  CircleCheck,
  ListChecks,
  ListOrdered,
  SquareCheck,
  StickyNote,
  Tag,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { cn } from 'cn'
import type { DonoDaNota, TrechoDoCaminho } from '@/lib/notas'

const ICONE: Record<TrechoDoCaminho['tipo'], LucideIcon> = {
  categoria: Tag,
  grupo: ListChecks,
  item: SquareCheck,
  tarefa: CircleCheck,
  procedimento: ListOrdered,
}

/** Nome lido pelo leitor de tela antes de cada trecho (o ícone faz esse papel na tela). */
const NOME: Record<TrechoDoCaminho['tipo'], string> = {
  categoria: 'Categoria',
  grupo: 'Grupo',
  item: 'Item',
  tarefa: 'Tarefa',
  procedimento: 'Procedimento',
}

interface CaminhoDoVinculoProps {
  dono: DonoDaNota
  /**
   * Grupo, tarefa e item abrem o Dia; procedimento abre o editor dele (no cartão, ficam acima do
   * link do cartão).
   */
  isComLinks?: boolean
  /** `cabecalho`: "Hostinger › Fazer Deploy · Hostinger" (categoria no fim), letra maior. */
  variante?: 'linha' | 'cabecalho'
  className?: string
}

function Trecho({ trecho, isComLink }: { trecho: TrechoDoCaminho; isComLink: boolean }) {
  const Icone = ICONE[trecho.tipo]
  const conteudo = (
    <>
      <Icone aria-hidden className="size-3.5 shrink-0 self-center" />
      <span className="sr-only">{NOME[trecho.tipo]} </span>
      {/* Quebra só entre palavras: nunca "09:0-" no meio de "09:00". */}
      <span className="min-w-0 wrap-normal hyphens-none">{trecho.texto}</span>
    </>
  )
  if (isComLink && trecho.procedimentoId) {
    return (
      <Link
        to={`/procedimentos/${trecho.procedimentoId}`}
        title={`Abrir o procedimento ${trecho.texto}`}
        className="relative z-10 inline-flex min-w-0 gap-1 rounded-sm underline-offset-2 hover:text-tinta hover:underline focus-visible:outline-2 focus-visible:outline-caneta"
      >
        {conteudo}
      </Link>
    )
  }
  if (isComLink && trecho.tipo !== 'categoria' && trecho.data) {
    return (
      <Link
        to={`/dia/${trecho.data}`}
        title={`Abrir ${trecho.texto} no dia`}
        className="relative z-10 inline-flex min-w-0 gap-1 rounded-sm underline-offset-2 hover:text-tinta hover:underline focus-visible:outline-2 focus-visible:outline-caneta"
      >
        {conteudo}
      </Link>
    )
  }
  return <span className="inline-flex min-w-0 gap-1">{conteudo}</span>
}

/**
 * A quem a nota pertence: "Categoria › Grupo › Item", "Categoria › Tarefa",
 * "Categoria › Procedimento" ou "Nota avulsa".
 */
export function CaminhoDoVinculo({
  dono,
  isComLinks = false,
  variante = 'linha',
  className,
}: CaminhoDoVinculoProps) {
  if (dono.caminho.length === 0) {
    return (
      <span className={cn('inline-flex items-baseline gap-1 text-grafite', className)}>
        <StickyNote aria-hidden className="size-3.5 shrink-0 self-center" />
        Nota avulsa
      </span>
    )
  }
  // Procedimento mantém "Categoria › Procedimento" também no cabeçalho.
  const isCategoriaNoFim = variante === 'cabecalho' && dono.tipo !== 'procedimento'
  const categoria = dono.caminho.find((trecho) => trecho.tipo === 'categoria')
  const trechos = isCategoriaNoFim
    ? dono.caminho.filter((trecho) => trecho.tipo !== 'categoria')
    : dono.caminho
  return (
    <span className={cn('flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-grafite', className)}>
      {trechos.map((trecho, indice) => (
        <Fragment key={`${trecho.tipo}-${indice}`}>
          {indice > 0 && (
            <ChevronRight aria-hidden className="size-3 shrink-0 self-center opacity-70" />
          )}
          <Trecho trecho={trecho} isComLink={isComLinks} />
        </Fragment>
      ))}
      {isCategoriaNoFim && categoria && (
        <>
          <span aria-hidden>·</span>
          <Trecho trecho={categoria} isComLink={false} />
        </>
      )}
    </span>
  )
}
