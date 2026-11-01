import { useState } from 'react'
import { gravarPreferencia, lerPreferencia } from '@/app/preferencia-local'

export const CHAVE_FILTRO_DO_MAPA = 'memoria:inicio-filtro-mapa'

/** Categoria do filtro do mapa, lembrada entre sessões (sem nada = todas). */
export function useFiltroDoMapa() {
  const [categoryId, setCategoryId] = useState<string | undefined>(
    () => lerPreferencia(CHAVE_FILTRO_DO_MAPA) || undefined,
  )

  function handleEscolher(novo: string | undefined) {
    setCategoryId(novo)
    gravarPreferencia(CHAVE_FILTRO_DO_MAPA, novo ?? '')
  }

  return { categoryId, handleEscolher }
}
