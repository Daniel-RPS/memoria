import { cn } from 'cn'

// Recolher/expandir: a largura corre com a mesma mola em toda a barra.
export const TRANSICAO_DA_BARRA = 'duration-400 ease-mola-suave motion-reduce:transition-none'

/** Visual comum dos itens da barra lateral (links e itens que abrem a roda). */
export function classesDoItemDaBarra(isAtiva: boolean, isRecolhida: boolean) {
  return cn(
    // O ícone fica no lugar enquanto a barra estreita: muda só o recuo, e o nome some
    // por opacidade (continua sendo o nome acessível do item).
    'flex h-8 w-full items-center gap-2.5 overflow-hidden rounded-md text-sm whitespace-nowrap transition-[padding] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-barra-texto',
    TRANSICAO_DA_BARRA,
    isRecolhida ? 'px-4' : 'px-2',
    isAtiva
      ? 'bg-caneta font-semibold text-primary-foreground'
      : 'text-barra-suave hover:bg-barra-realce hover:text-barra-texto',
  )
}
