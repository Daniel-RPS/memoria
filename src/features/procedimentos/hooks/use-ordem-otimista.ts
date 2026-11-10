import { useState } from 'react'

/**
 * Ordem mostrada logo depois de arrastar, até o banco devolver a gravada (sem piscar a ordem
 * antiga). Qualquer mudança nos ids recebidos descarta a ordem otimista.
 */
export function useOrdemOtimista(ids: string[]) {
  const chave = ids.join('|')
  const [estado, setEstado] = useState<{ base: string; ids: string[] } | null>(null)
  const atuais = estado && estado.base === chave ? estado.ids : ids
  return {
    ids: atuais,
    definir: (novos: string[]) => setEstado({ base: chave, ids: novos }),
  }
}
