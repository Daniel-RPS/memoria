import { useId, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from 'cn'

interface SecaoRecolhivelProps {
  /** Nome do bloco (também o nome da região para o leitor de tela). */
  titulo: string
  /** Cor da bolinha, já ajustada para o tema; `null` = bolinha vazia; omitida = sem bolinha. */
  cor?: string | null
  /** Ícone escolhido da categoria, antes do nome. */
  icone?: ReactNode
  contagem: number
  isAberta: boolean
  onAlternar: () => void
  children: ReactNode
}

/**
 * Bloco com cabeçalho que abre e fecha o conteúdo (Notas e Procedimentos). Fechado, só o
 * cabeçalho fica; a altura anima por grid (0fr ↔ 1fr), como o grupo "Calendário" da barra.
 */
export function SecaoRecolhivel({
  titulo,
  cor,
  icone,
  contagem,
  isAberta,
  onAlternar,
  children,
}: SecaoRecolhivelProps) {
  const idConteudo = useId()
  return (
    <section aria-label={titulo}>
      <h2 className="text-lg font-bold">
        <button
          type="button"
          aria-expanded={isAberta}
          aria-controls={idConteudo}
          onClick={onAlternar}
          className="group/secao -mx-1 flex max-w-full items-center gap-2 rounded-md px-1 py-0.5 text-left outline-none focus-visible:outline-2 focus-visible:outline-caneta"
        >
          <ChevronRecolher isAberta={isAberta} className="group-hover/secao:text-tinta" />
          {cor !== undefined && (
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full border border-pauta"
              style={cor ? { backgroundColor: cor } : undefined}
            />
          )}
          {icone}
          <span className="min-w-0 break-words underline-offset-4 group-hover/secao:underline group-hover/secao:decoration-pauta">
            {titulo}
          </span>
          <span className="text-sm font-normal text-grafite tabular-nums">{contagem}</span>
        </button>
      </h2>
      <ConteudoRecolhivel id={idConteudo} isAberta={isAberta}>
        <div className="pt-3 pb-1">{children}</div>
      </ConteudoRecolhivel>
    </section>
  )
}

/** Seta do cabeçalho: aponta para o lado fechado e gira para baixo ao abrir. */
export function ChevronRecolher({
  isAberta,
  className,
}: {
  isAberta: boolean
  className?: string
}) {
  return (
    <ChevronRight
      aria-hidden
      className={cn(
        'size-4 shrink-0 text-grafite transition-[rotate] duration-400 ease-mola motion-reduce:transition-none',
        isAberta && 'rotate-90',
        className,
      )}
    />
  )
}

/**
 * Conteúdo que abre e fecha: a altura anima por grid (0fr ↔ 1fr). Fechado, `inert` e
 * `invisible` tiram o conteúdo do Tab e do leitor de tela. Usado pelo `SecaoRecolhivel` e pelo
 * card da Semana.
 */
export function ConteudoRecolhivel({
  id,
  isAberta,
  children,
}: {
  id: string
  isAberta: boolean
  children: ReactNode
}) {
  return (
    <div
      id={id}
      inert={!isAberta}
      className={cn(
        'grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        isAberta ? 'visible grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0',
      )}
    >
      {/* Respiro dentro do recorte: a borda de foco dos cartões não é cortada. */}
      <div className="-mx-1 min-h-0 overflow-hidden px-1">{children}</div>
    </div>
  )
}

interface AcoesDasSecoesProps {
  onExpandirTudo: () => void
  onRecolherTudo: () => void
  isTudoAberto: boolean
  isTudoRecolhido: boolean
  className?: string
}

/** "Expandir tudo · Recolher tudo", discretos, no topo da lista. */
export function AcoesDasSecoes({
  onExpandirTudo,
  onRecolherTudo,
  isTudoAberto,
  isTudoRecolhido,
  className,
}: AcoesDasSecoesProps) {
  const estilo =
    'rounded-sm px-1 text-xs text-grafite underline-offset-2 outline-none hover:text-tinta hover:underline focus-visible:outline-2 focus-visible:outline-caneta disabled:pointer-events-none disabled:opacity-50'
  return (
    <div className={cn('flex justify-end gap-2', className)}>
      <button type="button" className={estilo} disabled={isTudoAberto} onClick={onExpandirTudo}>
        Expandir tudo
      </button>
      <button type="button" className={estilo} disabled={isTudoRecolhido} onClick={onRecolherTudo}>
        Recolher tudo
      </button>
    </div>
  )
}
