import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface DicaDaBarraProps {
  texto: string
  /** Falso deixa a dica desligada (ex.: barra expandida, onde o nome já aparece). */
  isLigada?: boolean
  /** Um único elemento focável: vira o gatilho da dica. */
  children: ReactNode
}

/** Dica ao lado direito de um item da barra lateral. */
export function DicaDaBarra({ texto, isLigada = true, children }: DicaDaBarraProps) {
  return (
    // Desligada pelo `open`, e não tirando o Tooltip: a árvore fica igual ao recolher/expandir.
    <Tooltip open={isLigada ? undefined : false}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {texto}
      </TooltipContent>
    </Tooltip>
  )
}
