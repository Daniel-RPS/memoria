import { useCallback, type MouseEvent } from 'react'

/** Onde o duplo clique tem dono próprio: link, caixa, chip, botão e campos. */
const ALVOS_IGNORADOS =
  'a, button, input, textarea, select, label, [role="checkbox"], [role="menuitem"], [data-sem-duplo-clique]'

/**
 * Duplo clique na área livre da linha (fora de link, caixa, chip ou botão) entra em edição do título.
 * Espalhe o retorno no elemento da linha: `<div {...duploClique}>`.
 */
export function useDuploCliqueParaEditar(onIniciarEdicao: () => void, isAtivo = true) {
  const onDoubleClick = useCallback(
    (evento: MouseEvent<HTMLElement>) => {
      if (!isAtivo) return
      const alvo = evento.target
      if (!(alvo instanceof Element) || !alvo.isConnected) return
      if (alvo.closest(ALVOS_IGNORADOS)) return
      // Popovers e menus do Radix são portais: o evento chega pela árvore do React, mas o
      // alvo está fora da linha.
      if (!evento.currentTarget.contains(alvo)) return
      window.getSelection()?.removeAllRanges()
      onIniciarEdicao()
    },
    [isAtivo, onIniciarEdicao],
  )

  return { onDoubleClick }
}
