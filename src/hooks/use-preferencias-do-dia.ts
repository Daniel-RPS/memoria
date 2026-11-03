import { useCallback, useSyncExternalStore } from 'react'
import { gravarPreferencia, lerPreferencia } from '@/app/preferencia-local'
import { lerModoDoDia, lerOrdemDoDia, type ModoDoDia, type OrdemDoDia } from '@/lib/visao-do-dia'

export const CHAVE_MODO_DO_DIA = 'memoria:dia-modo'
export const CHAVE_ORDEM_DO_DIA = 'memoria:dia-ordem'
const EVENTO = 'memoria:preferencias-do-dia'

function assinar(avisar: () => void) {
  const handleArmazenamento = (evento: StorageEvent) => {
    if (
      evento.key === null ||
      evento.key === CHAVE_MODO_DO_DIA ||
      evento.key === CHAVE_ORDEM_DO_DIA
    ) {
      avisar()
    }
  }
  window.addEventListener(EVENTO, avisar)
  window.addEventListener('storage', handleArmazenamento)
  return () => {
    window.removeEventListener(EVENTO, avisar)
    window.removeEventListener('storage', handleArmazenamento)
  }
}

function lerInstantaneo() {
  return `${lerModoDoDia(lerPreferencia(CHAVE_MODO_DO_DIA))}|${lerOrdemDoDia(lerPreferencia(CHAVE_ORDEM_DO_DIA))}`
}

function gravar(chave: string, valor: string) {
  gravarPreferencia(chave, valor)
  window.dispatchEvent(new Event(EVENTO))
}

/**
 * Modo (Lista/Colunas) e ordem das seções da visão Dia, lembrados no navegador. Lido também
 * pelo `LayoutApp`, que alarga a página no modo Colunas.
 */
export function usePreferenciasDoDia() {
  const [modo, ordem] = useSyncExternalStore(assinar, lerInstantaneo).split('|') as [
    ModoDoDia,
    OrdemDoDia,
  ]
  const handleEscolherModo = useCallback((novo: ModoDoDia) => gravar(CHAVE_MODO_DO_DIA, novo), [])
  const handleEscolherOrdem = useCallback(
    (nova: OrdemDoDia) => gravar(CHAVE_ORDEM_DO_DIA, nova),
    [],
  )
  return { modo, ordem, handleEscolherModo, handleEscolherOrdem }
}
