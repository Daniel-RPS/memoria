import { useState } from 'react'
import { gravarPreferencia, lerPreferencia } from '@/app/preferencia-local'
import type { Icone } from '@/db/types'
import { adicionarAosRecentes, lerRecentes } from '@/lib/icones'

export const CHAVE_ICONES_RECENTES = 'memoria:icones-recentes'

/** "Usados recentemente" do seletor de ícones (emojis e marcas), lembrado neste navegador. */
export function useIconesRecentes() {
  const [recentes, setRecentes] = useState(() => lerRecentes(lerPreferencia(CHAVE_ICONES_RECENTES)))

  function handleUsado(icone: Icone) {
    const novos = adicionarAosRecentes(recentes, icone)
    setRecentes(novos)
    gravarPreferencia(CHAVE_ICONES_RECENTES, JSON.stringify(novos))
  }

  return { recentes, handleUsado }
}
