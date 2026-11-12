import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from 'cn'

interface GrupoConcluidasDoCardProps {
  quantidade: number
  children: ReactNode
}

/**
 * Bloco recolhível "Concluídas (n)" dentro do cartão no modo Cartões.
 * Começa recolhido e mantém o estado em memória no próprio componente.
 */
export function GrupoConcluidasDoCard({ quantidade, children }: GrupoConcluidasDoCardProps) {
  const [isRecolhido, setIsRecolhido] = useState(true)

  if (quantidade === 0) return null

  return (
    <div className="mt-1 border-t border-pauta/60">
      <button
        type="button"
        onClick={() => setIsRecolhido(!isRecolhido)}
        aria-expanded={!isRecolhido}
        className="flex min-h-9 w-full items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-grafite hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta"
      >
        <ChevronRight
          aria-hidden
          className={cn(
            'size-3.5 transition-transform motion-reduce:transition-none',
            !isRecolhido && 'rotate-90',
          )}
        />
        Concluídas ({quantidade})
      </button>
      {!isRecolhido && (
        <ul aria-label="Concluídas" className="border-t border-pauta/40">
          {children}
        </ul>
      )}
    </div>
  )
}
