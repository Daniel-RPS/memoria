/** Foco num lugar onde se digita: atalhos de uma tecla e Ctrl+Z global ficam de fora. */
export function isCampoDeTexto(alvo: EventTarget | null) {
  return (
    alvo instanceof HTMLElement &&
    (alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName))
  )
}
