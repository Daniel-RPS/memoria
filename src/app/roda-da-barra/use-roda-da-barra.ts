import { useEffect, useRef, useState } from 'react'

export type IdDaRoda = 'calendario' | 'organizacao' | 'ajustes' | 'dados'
/** Como a roda abriu: pelo teclado, ela leva o foco ao primeiro setor. */
export type OrigemDaRoda = 'hover' | 'clique' | 'teclado'

export interface RodaAberta {
  id: IdDaRoda
  origem: OrigemDaRoda
}

/** Quase na hora: só o bastante para não abrir ao cruzar a barra com o mouse. */
const ATRASO_PARA_ABRIR_MS = 60
/** Dá tempo de atravessar o vão entre o item e a roda sem ela piscar. */
const ATRASO_PARA_FECHAR_MS = 180

/**
 * Qual roda da barra lateral está aberta (no máximo uma). O mouse abre e fecha com atraso; com
 * uma roda já aberta, passar para outro item troca na hora. Travada (mini-seletor de tema aberto),
 * sair com o mouse não fecha.
 */
export function useRodaDaBarra() {
  const [aberta, setAberta] = useState<RodaAberta | null>(null)
  const temporizador = useRef<number | undefined>(undefined)
  const isTravada = useRef(false)

  function cancelarAtraso() {
    window.clearTimeout(temporizador.current)
    temporizador.current = undefined
  }

  useEffect(() => cancelarAtraso, [])

  function abrir(id: IdDaRoda, origem: OrigemDaRoda) {
    cancelarAtraso()
    isTravada.current = false
    setAberta({ id, origem })
  }

  function handleFechar() {
    cancelarAtraso()
    isTravada.current = false
    setAberta(null)
  }

  function handleEntrarComMouse(id: IdDaRoda) {
    cancelarAtraso()
    if (aberta?.id === id) return
    if (aberta) {
      abrir(id, 'hover')
      return
    }
    temporizador.current = window.setTimeout(() => abrir(id, 'hover'), ATRASO_PARA_ABRIR_MS)
  }

  function handleSairComMouse() {
    cancelarAtraso()
    if (isTravada.current) return
    temporizador.current = window.setTimeout(handleFechar, ATRASO_PARA_FECHAR_MS)
  }

  /** Clique/toque alterna. Clique de mouse numa roda aberta pelo hover só a deixa fixa. */
  function handleClicar(id: IdDaRoda, isMouse: boolean) {
    if (aberta?.id !== id) {
      abrir(id, 'clique')
    } else if (isMouse && aberta.origem === 'hover') {
      abrir(id, 'clique')
    } else {
      handleFechar()
    }
  }

  function handleAbrirPeloTeclado(id: IdDaRoda) {
    abrir(id, 'teclado')
  }

  function handleTravar(isTravar: boolean) {
    isTravada.current = isTravar
    if (isTravar) cancelarAtraso()
  }

  return {
    aberta,
    handleEntrarComMouse,
    handleSairComMouse,
    handleClicar,
    handleAbrirPeloTeclado,
    handleFechar,
    handleTravar,
  }
}

export type ControleDaRoda = ReturnType<typeof useRodaDaBarra>
