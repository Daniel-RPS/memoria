import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from 'cn'
import { IconeDaEntidade } from '@/components/icones/icone-da-entidade'
import { useTempoVisivel } from '@/hooks/use-tempo-visivel'
import type { PayloadDoAviso } from '@/lib/entrega-de-avisos'
import { SLUG_DO_APP } from '@/lib/icones'

/** Quanto tempo (com a aba visível) o card espera antes de sair sozinho. */
export const DURACAO_DO_CARD_MS = 2 * 60_000
/** Quantos cards ficam na tela ao mesmo tempo; os outros esperam na fila. */
export const MAXIMO_DE_CARDS = 3
/** Duração da entrada e da saída do card. */
export const DURACAO_DA_ANIMACAO_MS = 250

const ISOTIPO = { tipo: 'marca', valor: SLUG_DO_APP } as const

interface PilhaDeAvisosProps {
  /** Cards na tela, o mais novo por último (fica em cima). */
  avisos: PayloadDoAviso[]
  /** Fechou no X: visto. */
  onFechar: (lembreteId: string) => void
  /** Clicou no corpo: visto, e leva ao dia da tarefa. */
  onAbrir: (aviso: PayloadDoAviso) => void
  /** Passou o tempo sem interação: sai, mas continua não visto. */
  onExpirar: (lembreteId: string) => void
}

/**
 * Cards de aviso no canto inferior direito, empilhados de baixo para cima, acima de qualquer
 * tela ou modal sem bloquear cliques fora deles.
 */
export function PilhaDeAvisos({ avisos, onFechar, onAbrir, onExpirar }: PilhaDeAvisosProps) {
  if (avisos.length === 0) return null
  return (
    <div
      data-pilha-de-avisos=""
      className="pointer-events-none fixed right-4 bottom-4 z-[200] flex w-[min(22rem,calc(100vw-2rem))] flex-col-reverse gap-2"
    >
      {avisos.map((aviso) => (
        <CardDeAviso
          key={aviso.lembreteId}
          aviso={aviso}
          onFechar={() => onFechar(aviso.lembreteId)}
          onAbrir={() => onAbrir(aviso)}
          onExpirar={() => onExpirar(aviso.lembreteId)}
        />
      ))}
    </div>
  )
}

interface CardDeAvisoProps {
  aviso: PayloadDoAviso
  onFechar: () => void
  onAbrir: () => void
  onExpirar: () => void
}

function CardDeAviso({ aviso, onFechar, onAbrir, onExpirar }: CardDeAvisoProps) {
  const [isSaindo, setIsSaindo] = useState(false)

  /** Toca a saída (descendo) e só então tira o card. */
  function sair(depois: () => void) {
    if (isSaindo) return
    setIsSaindo(true)
    const isReduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    window.setTimeout(depois, isReduzido ? 0 : DURACAO_DA_ANIMACAO_MS)
  }

  useTempoVisivel(DURACAO_DO_CARD_MS, () => sair(onExpirar))

  return (
    <div
      role="status"
      aria-live="polite"
      data-card-de-aviso=""
      className={cn(
        'glass-surface group/aviso pointer-events-auto relative overflow-hidden rounded-lg border border-caneta/35 shadow-lg dark:border-caneta/45',
        'duration-250 ease-out motion-reduce:slide-in-from-bottom-0 motion-reduce:slide-out-to-bottom-0',
        isSaindo
          ? 'animate-out fill-mode-forwards fade-out-0 slide-out-to-bottom-6'
          : 'animate-in fade-in-0 slide-in-from-bottom-6',
      )}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-caneta" />
      <button
        type="button"
        onClick={() => sair(onAbrir)}
        className="flex w-full items-start gap-3 py-3 pr-10 pl-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <IconeDaEntidade icone={ISOTIPO} tamanho="lg" className="mt-0.5 size-8" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold tracking-wide text-caneta uppercase">
            {aviso.contexto}
          </span>
          <span className="mt-0.5 line-clamp-2 block font-semibold break-words text-tinta">
            {aviso.alvo.titulo}
          </span>
          {aviso.detalhe && (
            <span className="mt-0.5 block truncate text-xs text-grafite tabular-nums">
              {aviso.detalhe}
            </span>
          )}
        </span>
      </button>
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => sair(onFechar)}
        className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md text-grafite outline-none hover:bg-accent hover:text-tinta focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  )
}
