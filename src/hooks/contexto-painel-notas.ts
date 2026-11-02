import { createContext, useContext } from 'react'
import type { Vinculo } from '@/db/types'
import { chaveDoVinculo } from '@/lib/notas'

/** Gaveta de notas aberta a partir de qualquer tela (menus ⋯, indicadores). */
export interface PainelDeNotas {
  /**
   * Abre as notas do alvo: `criar` cria uma nota nova ligada a ele e abre no editor; sem
   * `criar`, abre a única nota direto ou a lista quando há mais de uma.
   */
  abrir: (vinculo: Vinculo, opcoes?: { criar?: boolean }) => void
  /** Notas por alvo (`chaveDoVinculo`), mantidas em dia pelo provedor. */
  contagem: Map<string, number>
}

export const ContextoPainelNotas = createContext<PainelDeNotas>({
  abrir: () => {},
  contagem: new Map(),
})

export function usePainelDeNotas() {
  return useContext(ContextoPainelNotas)
}

/** Quantas notas o alvo tem (0 sem nota). */
export function useQuantasNotas(vinculo: Vinculo) {
  return useContext(ContextoPainelNotas).contagem.get(chaveDoVinculo(vinculo)) ?? 0
}
