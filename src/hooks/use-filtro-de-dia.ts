import { useState } from 'react'
import { gravarPreferencia, lerPreferencia } from '@/app/preferencia-local'
import { lerFiltroDeData, type AtalhoDeData, type FiltroDeData } from '@/lib/filtro-de-data'

/** Filtro por dia de uma tela, lembrado entre sessões em `chave` (sem nada salvo: qualquer dia). */
export function useFiltroDeDia(chave: string, atalhos: readonly AtalhoDeData[]) {
  const [filtro, setFiltro] = useState<FiltroDeData>(() =>
    lerFiltroDeData(lerPreferencia(chave), atalhos),
  )

  function handleMudar(novo: FiltroDeData) {
    setFiltro(novo)
    gravarPreferencia(chave, JSON.stringify(novo))
  }

  return { filtro, handleMudar }
}
