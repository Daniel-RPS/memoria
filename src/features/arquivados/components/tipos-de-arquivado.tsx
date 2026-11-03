import { ListChecks, ListOrdered, SquareCheckBig, StickyNote, type LucideIcon } from 'lucide-react'
import type { TipoArquivado } from '@/lib/arquivados'

/** Ícone de cada tipo, o mesmo das telas deles na barra lateral quando há. */
export const ICONES_DOS_TIPOS: Record<TipoArquivado, LucideIcon> = {
  tarefa: SquareCheckBig,
  grupo: ListChecks,
  nota: StickyNote,
  procedimento: ListOrdered,
}
