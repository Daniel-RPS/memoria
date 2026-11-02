import { StickyNote } from 'lucide-react'
import { cn } from 'cn'
import type { Vinculo } from '@/db/types'
import { usePainelDeNotas, useQuantasNotas } from '@/hooks/contexto-painel-notas'
import { textoQuantasNotas } from '@/lib/notas'

interface IndicadorNotasProps {
  vinculo: Vinculo
  /** Nome do alvo nos rótulos ("Notas de Fazer Deploy: 2 notas"). */
  titulo: string
  /**
   * Sem nota, mostra "Adicionar nota" ao passar o mouse no grupo nomeado do Tailwind (no
   * Início, que não tem menu ⋯). Sem isso, nada aparece enquanto não houver nota.
   */
  revelarCom?: 'linha' | 'grupo'
  className?: string
}

/**
 * Ícone discreto de nota ao lado do título, com o número quando há mais de uma. Abre a gaveta
 * de notas. Pequeno e fora do fluxo de arrasto (`data-sem-arrasto`).
 */
export function IndicadorNotas({ vinculo, titulo, revelarCom, className }: IndicadorNotasProps) {
  const quantas = useQuantasNotas(vinculo)
  const { abrir } = usePainelDeNotas()
  if (quantas === 0 && !revelarCom) return null
  const isAdicionar = quantas === 0

  return (
    <button
      type="button"
      data-sem-arrasto
      onClick={() => abrir(vinculo, { criar: isAdicionar })}
      aria-label={
        isAdicionar
          ? `Adicionar nota em ${titulo}`
          : `Notas de ${titulo}: ${textoQuantasNotas(quantas)}`
      }
      title={isAdicionar ? 'Adicionar nota' : textoQuantasNotas(quantas)}
      className={cn(
        '-my-0.5 inline-flex h-6 shrink-0 items-center gap-0.5 rounded px-1 text-xs text-grafite tabular-nums hover:bg-accent hover:text-caneta focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-caneta',
        isAdicionar &&
          (revelarCom === 'linha'
            ? 'opacity-0 group-focus-within/linha:opacity-100 group-hover/linha:opacity-100'
            : 'opacity-0 group-focus-within/grupo:opacity-100 group-hover/grupo:opacity-100'),
        className,
      )}
    >
      <StickyNote aria-hidden className="size-3.5" />
      {quantas > 1 && quantas}
    </button>
  )
}
