import { useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ContextoAreaLateral } from '@/components/barra-lateral/contexto-area-lateral'

/** Desenha `children` na barra lateral; fora do layout (ou antes dele montar), não desenha. */
export function NaBarraLateral({ children }: { children: ReactNode }) {
  const area = useContext(ContextoAreaLateral)
  return area ? createPortal(children, area) : null
}
