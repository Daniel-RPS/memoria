import { useId, useState, type ReactNode } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { cn } from 'cn'
import { temRascunho } from '@/lib/rascunhos'

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
  /** Chave de rascunho: se existir rascunho salvo, já começa aberto. */
  chaveRascunho?: string
  /** Variante visual: 'linha' (padrão) para Lista/Colunas, ou 'painel' para Cartões com destaque. */
  variante?: 'linha' | 'painel'
  /** Estilo de acento do painel ('caneta' para Grupos ou 'grafite' para Soltas). */
  acento?: 'caneta' | 'grafite'
  children?: ReactNode
}

/**
 * Seção da folha do dia ("Grupos" ou "Tarefas soltas"): cabeçalho recolhível que recolhe a seção
 * inteira, contagem e o botão de criar à direita. Vazia, continua à vista com uma mensagem explicativa.
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
  chaveRascunho,
  variante = 'linha',
  acento = 'caneta',
  children,
}: SecaoDoDiaProps) {
  const idConteudo = useId()
  const [isCriando, setIsCriando] = useState(() =>
    chaveRascunho ? temRascunho(chaveRascunho) : false,
  )
  const isFaixaAgora = isFaixa && isRecolhida
  const isPainel = variante === 'painel'

  function handleAdicionar() {
    if (isRecolhida) onAlternar()
    if (onAdicionar) {
      onAdicionar()
    } else {
      setIsCriando(true)
    }
  }

  const estilosPainel =
    acento === 'caneta'
      ? {
          section:
            'rounded-xl border border-[color-mix(in_srgb,var(--color-caneta)_35%,var(--color-pauta))] bg-[color-mix(in_srgb,var(--color-caneta)_5%,var(--color-papel))] overflow-hidden',
          header:
            'bg-[color-mix(in_srgb,var(--color-caneta)_10%,var(--color-papel))] border-b border-[color-mix(in_srgb,var(--color-caneta)_35%,var(--color-pauta))] px-4 py-3',
          faixaVertical: 'w-1 self-stretch rounded-full bg-caneta',
          iconeCaixa:
            'size-8 rounded-lg bg-[color-mix(in_srgb,var(--color-caneta)_15%,transparent)] text-caneta flex items-center justify-center shrink-0',
          pilula:
            'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums bg-[color-mix(in_srgb,var(--color-caneta)_15%,transparent)] text-caneta',
        }
      : {
          section:
            'rounded-xl border border-pauta bg-[color-mix(in_srgb,var(--color-grafite)_5%,var(--color-papel))] overflow-hidden',
          header:
            'bg-[color-mix(in_srgb,var(--color-grafite)_10%,var(--color-papel))] border-b border-pauta px-4 py-3',
          faixaVertical: 'w-1 self-stretch rounded-full bg-grafite',
          iconeCaixa:
            'size-8 rounded-lg bg-[color-mix(in_srgb,var(--color-grafite)_15%,transparent)] text-grafite flex items-center justify-center shrink-0',
          pilula:
            'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums bg-[color-mix(in_srgb,var(--color-grafite)_15%,transparent)] text-grafite',
        }

  return (
    <section
      aria-label={titulo}
      data-recolhida={isRecolhida || undefined}
      data-variante={variante}
      className={cn(
        'min-w-0',
        isFaixaAgora && '@min-[48rem]:h-full',
        isPainel && estilosPainel.section,
      )}
    >
      <header
        className={cn(
          'flex min-h-10 items-center gap-2',
          !isPainel && 'border-b border-pauta',
          isPainel && estilosPainel.header,
          isFaixaAgora &&
            '@min-[48rem]:h-full @min-[48rem]:min-h-48 @min-[48rem]:flex-col @min-[48rem]:border-r @min-[48rem]:border-b-0',
        )}
      >
        {isPainel && <span aria-hidden className={estilosPainel.faixaVertical} />}
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={!isRecolhida}
          aria-controls={idConteudo}
          aria-label={`${titulo}, ${contagem.rotulo}`}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 self-stretch rounded-sm text-sm font-medium text-grafite hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta',
            !isPainel && 'pr-2',
            isPainel && 'text-base font-semibold text-tinta',
            isFaixaAgora &&
              '@min-[48rem]:flex-none @min-[48rem]:justify-start @min-[48rem]:px-2 @min-[48rem]:py-2 @min-[48rem]:[writing-mode:vertical-rl]',
          )}
        >
          <ChevronRight
            aria-hidden
            className={cn(
              'size-4 shrink-0 transition-transform motion-reduce:transition-none text-grafite',
              !isRecolhida && 'rotate-90',
            )}
          />
          {icone &&
            (isPainel ? (
              <span className={estilosPainel.iconeCaixa}>{icone}</span>
            ) : (
              <span className="shrink-0">{icone}</span>
            ))}
          <span className="whitespace-nowrap">{titulo}</span>
          {isPainel ? (
            <span aria-hidden className={estilosPainel.pilula}>
              {contagem.texto}
            </span>
          ) : (
            <>
              <span aria-hidden className="text-grafite/70">
                ·
              </span>
              <span aria-hidden className="tabular-nums">
                {contagem.texto}
              </span>
            </>
          )}
        </button>
        {!isSemAdicionar && rotuloAdicionar && (
          <button
            type="button"
            onClick={handleAdicionar}
            className={cn(
              'flex shrink-0 items-center gap-1 text-sm focus-visible:outline-2 focus-visible:outline-caneta transition-colors',
              !isPainel && 'rounded-sm px-2 py-1 text-grafite hover:text-caneta',
              isPainel &&
                'rounded-md border border-pauta bg-papel px-3 py-1 font-medium text-grafite hover:border-caneta/60 hover:text-caneta',
              isFaixaAgora && '@min-[48rem]:hidden',
            )}
          >
            <Plus aria-hidden className="size-4" />
            {rotuloAdicionar}
          </button>
        )}
      </header>
      {/* Recolhida, o conteúdo nem é montado: o que está escondido não vira alvo de soltar. */}
      <div id={idConteudo} hidden={isRecolhida} className={cn(isPainel && 'p-4')}>
        {!isRecolhida && (
          <>
            {isCriando && !isSemAdicionar && campo && (
              <div className={cn(!isPainel && 'border-b border-pauta', isPainel && 'mb-4')}>
                {campo(() => setIsCriando(false))}
              </div>
            )}
            {textoVazio && !isCriando && (
              <p
                className={cn(
                  'text-sm text-grafite',
                  !isPainel && 'border-b border-pauta py-3 pl-7',
                  isPainel && 'py-6 text-center',
                )}
              >
                {textoVazio}
              </p>
            )}
            {children}
          </>
        )}
      </div>
    </section>
  )
}
