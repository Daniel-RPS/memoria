import { useState } from 'react'

export const CHAVE_GRUPO_CALENDARIO = 'memoria:grupo-calendario-aberto'

/** Último estado escolhido; sem nada salvo (ou sem acesso ao armazenamento), aberto. */
function lerSalvo(): boolean {
  try {
    return localStorage.getItem(CHAVE_GRUPO_CALENDARIO) !== 'false'
  } catch {
    return true
  }
}

function salvar(isAberto: boolean) {
  try {
    localStorage.setItem(CHAVE_GRUPO_CALENDARIO, String(isAberto))
  } catch {
    // Sem armazenamento (janela privada, dados bloqueados): só não lembra.
  }
}

/**
 * Aberto/fechado do grupo "Calendário" na barra lateral. Abre sozinho numa visão do
 * calendário (Dia, Semana, Mês, Ano); fora delas, vale o que o usuário escolheu por último.
 */
export function useGrupoCalendarioAberto(isNoCalendario: boolean) {
  const [isAberto, setIsAberto] = useState(() => isNoCalendario || lerSalvo())
  const [estavaNoCalendario, setEstavaNoCalendario] = useState(isNoCalendario)

  // Ao entrar numa visão do calendário com o grupo fechado, ele abre para mostrar onde se está.
  if (isNoCalendario !== estavaNoCalendario) {
    setEstavaNoCalendario(isNoCalendario)
    if (isNoCalendario) setIsAberto(true)
  }

  function handleAlternar() {
    const novo = !isAberto
    salvar(novo)
    setIsAberto(novo)
  }

  return { isAberto, handleAlternar }
}
