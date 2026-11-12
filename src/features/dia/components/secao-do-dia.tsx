import { useId, useState, type ReactNode } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { cn } from 'cn'

interface SecaoDoDiaProps {
  titulo: string
  /** Contagem ao lado do título ("2", "1/3") e o mesmo em palavras para o leitor de tela. */
  contagem: { texto: string; rotulo: string }
  /** Texto do botão de criar, ex.: "Novo grupo". */
  rotuloAdicionar?: string
  isRecolhida: boolean
  onAlternar: () => void
  /** No modo Colunas, recolhida vira uma faixa estreita com o nome na vertical. */
  isFaixa?: boolean
  /** Sem o botão de criar (ex.: selecionando). */
  isSemAdicionar?: boolean
  /** Linha discreta quando não há nada na seção. */
  textoVazio?: string
  /** Ícone antes do título da seção (ex.: ListChecks). */
  icone?: ReactNode
  /** Ação customizada do botão de criar se não usar o campo embutido. */
  onAdicionar?: () => void
  /** Campo de criar, aberto pelo botão; `fechar` volta ao botão. */
  campo?: (fechar: () => void) => ReactNode
  children?: ReactNode
}

/**
 * Seção da folha do dia ("Grupos" ou "Tarefas soltas"): cabeçalho discreto que recolhe a seção
 * inteira, contagem e o botão de criar à direita. Vazia, continua à vista com uma linha que
 * explica o que vai ali.
 */
export function SecaoDoDia({
  titulo,
  contagem,
  rotuloAdicionar,
  isRecolhida,
  onAlternar,
  isFaixa = false,
  isSemAdicionar = false,
  textoVazio,
  icone,
  onAdicionar,
  campo,
  children,
}: SecaoDoDiaProps) {
  const idConteudo = useId()
  const [isCriando, setIsCriando] = useState(false)
  const isFaixaAgora = isFaixa && isRecolhida

  function handleAdicionar() {
    if (isRecolhida) onAlternar()
    if (onAdicionar) {
      onAdicionar()
    } else {
      setIsCriando(true)
    }
  }

  return (
    <section
      aria-label={titulo}
      data-recolhida={isRecolhida || undefined}
      className={cn('min-w-0', isFaixaAgora && '@min-[48rem]:h-full')}
    >
      <header
        className={cn(
          'flex min-h-10 items-center gap-2 border-b border-pauta',
          isFaixaAgora &&
            '@min-[48rem]:h-full @min-[48rem]:min-h-48 @min-[48rem]:flex-col @min-[48rem]:border-r @min-[48rem]:border-b-0',
        )}
      >
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={!isRecolhida}
          aria-controls={idConteudo}
          aria-label={`${titulo}, ${contagem.rotulo}`}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1.5 self-stretch rounded-sm pr-2 text-sm font-medium text-grafite hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta',
            isFaixaAgora &&
              '@min-[48rem]:flex-none @min-[48rem]:justify-start @min-[48rem]:px-2 @min-[48rem]:py-2 @min-[48rem]:[writing-mode:vertical-rl]',
          )}
        >
          <ChevronRight
            aria-hidden
            className={cn(
              'size-4 shrink-0 transition-transform motion-reduce:transition-none',
              !isRecolhida && 'rotate-90',
            )}
          />
          {icone && <span className="shrink-0">{icone}</span>}
          <span className="whitespace-nowrap">{titulo}</span>
          <span aria-hidden className="text-grafite/70">
            ·
          </span>
          <span aria-hidden className="tabular-nums">
            {contagem.texto}
          </span>
        </button>
        {!isSemAdicionar && rotuloAdicionar && (
          <button
            type="button"
            onClick={handleAdicionar}
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-sm text-grafite hover:text-caneta focus-visible:outline-2 focus-visible:outline-caneta',
              isFaixaAgora && '@min-[48rem]:hidden',
            )}
          >
            <Plus aria-hidden className="size-4" />
            {rotuloAdicionar}
          </button>
        )}
      </header>
      {/* Recolhida, o conteúdo nem é montado: o que está escondido não vira alvo de soltar. */}
      <div id={idConteudo} hidden={isRecolhida}>
        {!isRecolhida && (
          <>
            {isCriando && !isSemAdicionar && campo && (
              <div className="border-b border-pauta">{campo(() => setIsCriando(false))}</div>
            )}
            {textoVazio && !isCriando && (
              <p className="border-b border-pauta py-3 pl-7 text-sm text-grafite">{textoVazio}</p>
            )}
            {children}
          </>
        )}
      </div>
    </section>
  )
}
