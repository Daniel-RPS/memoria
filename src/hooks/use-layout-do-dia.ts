import { useMemo, useSyncExternalStore } from 'react'
import { gravarPreferencia, lerPreferencia } from '@/app/preferencia-local'
import {
  alternarSecao,
  definirGruposAbertos,
  isGrupoAberto,
  isSecaoRecolhida,
  lerLayoutDoDia,
  podarGrupos,
  serializarLayoutDoDia,
  type LayoutDoDia,
} from '@/lib/layout-do-dia'
import type { SecaoDoDia } from '@/lib/visao-do-dia'

export const CHAVE_LAYOUT_DO_DIA = 'memoria:dia-layout'
const EVENTO = 'memoria:layout-do-dia'

/** Sem localStorage (janela privada), o estado vale só até recarregar. */
let textoEmMemoria: string | null = null

function assinar(avisar: () => void) {
  const handleArmazenamento = (evento: StorageEvent) => {
    if (evento.key === null || evento.key === CHAVE_LAYOUT_DO_DIA) avisar()
  }
  window.addEventListener(EVENTO, avisar)
  window.addEventListener('storage', handleArmazenamento)
  return () => {
    window.removeEventListener(EVENTO, avisar)
    window.removeEventListener('storage', handleArmazenamento)
  }
}

function lerTexto() {
  return lerPreferencia(CHAVE_LAYOUT_DO_DIA) ?? textoEmMemoria
}

/** Lê o que está guardado AGORA, aplica a mudança e grava (duas telas não se atropelam). */
function atualizar(mudar: (atual: LayoutDoDia) => LayoutDoDia) {
  const atual = lerLayoutDoDia(lerTexto())
  const novo = mudar(atual)
  if (novo === atual) return
  const texto = serializarLayoutDoDia(novo)
  gravarPreferencia(CHAVE_LAYOUT_DO_DIA, texto)
  // Só guarda na memória se o navegador não aceitou gravar.
  textoEmMemoria = lerPreferencia(CHAVE_LAYOUT_DO_DIA) === texto ? null : texto
  window.dispatchEvent(new Event(EVENTO))
}

/** Esquece os grupos cujas séries não existem mais (função estável, sem estado de tela). */
export function podarGruposEsquecidos(seriesExistentes: string[]) {
  atualizar((atual) => podarGrupos(atual, seriesExistentes))
}

/**
 * Seções recolhidas e grupos abertos do Dia e da Semana, lembrados no navegador (sincroniza as
 * abas). Regras em `lib/layout-do-dia`.
 */
export function useLayoutDoDia() {
  const texto = useSyncExternalStore(assinar, lerTexto)
  const layout = useMemo(() => lerLayoutDoDia(texto), [texto])

  return {
    layout,
    isSecaoRecolhida: (secao: SecaoDoDia) => isSecaoRecolhida(layout, secao),
    isGrupoAberto: (seriesId: string) => isGrupoAberto(layout, seriesId),
    handleAlternarSecao: (secao: SecaoDoDia) => atualizar((atual) => alternarSecao(atual, secao)),
    handleDefinirGrupos: (seriesIds: string[], isAbrir: boolean) =>
      atualizar((atual) => definirGruposAbertos(atual, seriesIds, isAbrir)),
  }
}
