import { useCallback, useSyncExternalStore } from 'react'
import { gravarPreferencia, lerPreferencia } from '@/app/preferencia-local'

export type ModoEtapas = 'lista' | 'cartoes'

export const CHAVE_MODO_ETAPAS = 'memoria:procedimento-modo-etapas'
const EVENTO = 'memoria:preferencia-modo-etapas'

export function lerModoEtapas(valor: string | null): ModoEtapas {
  return valor === 'cartoes' ? 'cartoes' : 'lista'
}

function assinar(avisar: () => void) {
  const handleArmazenamento = (evento: StorageEvent) => {
    if (evento.key === null || evento.key === CHAVE_MODO_ETAPAS) {
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

function lerInstantaneo(): ModoEtapas {
  return lerModoEtapas(lerPreferencia(CHAVE_MODO_ETAPAS))
}

function gravar(valor: ModoEtapas) {
  gravarPreferencia(CHAVE_MODO_ETAPAS, valor)
  window.dispatchEvent(new Event(EVENTO))
}

/**
 * Modo de exibição das etapas de procedimento (Lista ou Cartões), salvo no localStorage
 * e compartilhado entre todos os procedimentos.
 */
export function useModoEtapas() {
  const modo = useSyncExternalStore(assinar, lerInstantaneo)
  const handleEscolherModo = useCallback((novo: ModoEtapas) => gravar(novo), [])
  return { modo, handleEscolherModo }
}
