import { useCallback, useEffect, useRef, useState } from 'react'

/** Atraso para fechar um submenu quando o mouse sai dele (hover). */
export const ATRASO_FECHAR_SUBMENU_MS = 300

/**
 * Estado controlado de um submenu do Radix com tolerância de mouse:
 * - fechar por hover/foco espera `ATRASO_FECHAR_SUBMENU_MS` e é cancelado se o mouse voltar;
 * - fechar pelo teclado (Esc, seta) é imediato;
 * - com `isTravado` (ex.: formulário aberto) o hover nunca fecha: só o teclado.
 */
export function useSubmenuTolerante(isTravado: boolean) {
  const [isAberto, setIsAberto] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isTeclado = useRef(false)

  const cancelar = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = undefined
  }, [])

  useEffect(() => cancelar, [cancelar])

  const handleOpenChange = useCallback(
    (abrir: boolean) => {
      cancelar()
      if (abrir) {
        setIsAberto(true)
        return
      }
      if (isTeclado.current) {
        setIsAberto(false)
        return
      }
      if (isTravado) return
      timer.current = setTimeout(() => setIsAberto(false), ATRASO_FECHAR_SUBMENU_MS)
    },
    [cancelar, isTravado],
  )

  /** Props para o gatilho e o conteúdo: mouse de volta cancela o fechamento. */
  const propsDeHover = {
    onPointerEnter: () => {
      isTeclado.current = false
      cancelar()
    },
    onPointerMove: () => {
      isTeclado.current = false
    },
    onKeyDownCapture: () => {
      isTeclado.current = true
    },
  }

  return { isAberto, handleOpenChange, propsDeHover }
}
