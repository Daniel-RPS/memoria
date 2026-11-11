import type { CanalDeAviso, TipoAlvoDoLembrete } from '@/db/types'

/** O que um aviso leva para qualquer canal (app hoje; WhatsApp e e-mail depois). */
export interface PayloadDoAviso {
  lembreteId: string
  alvo: { tipo: TipoAlvoDoLembrete; id: string; titulo: string; data: string; horario?: string }
  antecedenciaMin: number
  /** "Agora", "Em 10 min", "Amanhã". */
  contexto: string
  /** "18:00 · Grupo X". */
  detalhe: string
}

export type Entregador = (payload: PayloadDoAviso) => void

/**
 * Entrega o aviso em cada canal pedido. Só o canal "app" tem entregador por ora; canal sem
 * entregador é ignorado, então WhatsApp/e-mail entram aqui depois sem mudar quem chama.
 */
export function entregar(
  canais: readonly CanalDeAviso[],
  payload: PayloadDoAviso,
  entregadores: Partial<Record<CanalDeAviso, Entregador>>,
) {
  for (const canal of canais) entregadores[canal]?.(payload)
}
