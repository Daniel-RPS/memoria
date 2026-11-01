import { useState } from 'react'
import { gravarPreferencia, lerPreferencia } from '@/app/preferencia-local'

export const CHAVE_GRUPO_CALENDARIO = 'memoria:grupo-calendario-aberto'

/**
 * Aberto/fechado do grupo "Calendário" na barra lateral. Abre sozinho numa visão do
 * calendário (Dia, Semana, Mês, Ano); fora delas, vale o que o usuário escolheu por último.
 */
export function useGrupoCalendarioAberto(isNoCalendario: boolean) {
  const [isAberto, setIsAberto] = useState(
    // Sem nada salvo (ou sem acesso ao armazenamento), aberto.
    () => isNoCalendario || lerPreferencia(CHAVE_GRUPO_CALENDARIO) !== 'false',
  )
  const [estavaNoCalendario, setEstavaNoCalendario] = useState(isNoCalendario)

  // Ao entrar numa visão do calendário com o grupo fechado, ele abre para mostrar onde se está.
  if (isNoCalendario !== estavaNoCalendario) {
    setEstavaNoCalendario(isNoCalendario)
    if (isNoCalendario) setIsAberto(true)
  }

  function handleAlternar() {
    const novo = !isAberto
    gravarPreferencia(CHAVE_GRUPO_CALENDARIO, String(novo))
    setIsAberto(novo)
  }

  return { isAberto, handleAlternar }
}
