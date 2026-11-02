import { lazy, Suspense, useState } from 'react'
import { SmilePlus } from 'lucide-react'
import { cn } from 'cn'
import { IconeDaEntidade } from '@/components/icones/icone-da-entidade'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Icone } from '@/db/types'

// O painel (emojis e marcas) só é baixado quando o seletor abre: fora do bundle principal.
const PainelIcones = lazy(() =>
  import('@/components/icones/painel-icones').then((modulo) => ({
    default: modulo.PainelIcones,
  })),
)

interface SeletorIconeProps {
  icone?: Icone
  /** `undefined` = "Sem ícone". */
  onEscolher: (icone: Icone | undefined) => void
  /** Nome do botão para o leitor de tela: "Ícone do procedimento", "Ícone da categoria Casa". */
  rotulo: string
  tamanho?: 'md' | 'lg'
  className?: string
}

/**
 * Botão com o ícone atual (ou uma carinha) ao lado do título/nome; abre o seletor de emoji e
 * marcas. Escolher aplica e fecha.
 */
export function SeletorIcone({
  icone,
  onEscolher,
  rotulo,
  tamanho = 'md',
  className,
}: SeletorIconeProps) {
  const [isAberto, setIsAberto] = useState(false)

  function handleEscolher(novo: Icone | undefined) {
    onEscolher(novo)
    setIsAberto(false)
  }

  return (
    <Popover open={isAberto} onOpenChange={setIsAberto}>
      <PopoverTrigger
        type="button"
        aria-label={rotulo}
        title={icone ? 'Trocar ícone' : 'Escolher ícone'}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md text-grafite outline-none hover:bg-accent hover:text-tinta focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:bg-accent',
          tamanho === 'lg' ? 'size-9' : 'size-6',
          className,
        )}
      >
        {icone ? (
          <IconeDaEntidade icone={icone} tamanho={tamanho} />
        ) : (
          <SmilePlus aria-hidden className={tamanho === 'lg' ? 'size-5' : 'size-4'} />
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={8}
        className="w-[min(22rem,calc(100vw-1rem))] p-0"
      >
        <Suspense
          fallback={
            <p className="flex h-96 items-center justify-center text-sm text-grafite">
              Carregando…
            </p>
          }
        >
          <PainelIcones atual={icone} onEscolher={handleEscolher} />
        </Suspense>
      </PopoverContent>
    </Popover>
  )
}
