import { createContext, useContext, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listarIdsDasSeries } from '@/db/repositories/group-repository'
import { podarGruposEsquecidos, useLayoutDoDia } from '@/hooks/use-layout-do-dia'

/**
 * Grupos abertos e recolhidos no Dia e na Semana, lembrados entre visitas pela SÉRIE do grupo
 * (o cartão levado para outro dia herda o estado do original). Grupo sem estado salvo abre
 * recolhido. Também esquece as séries que deixaram de existir.
 */
export function useGruposLembrados() {
  const { isGrupoAberto, handleDefinirGrupos } = useLayoutDoDia()
  const idsDasSeries = useLiveQuery(() => listarIdsDasSeries(), [])

  useEffect(() => {
    if (idsDasSeries) podarGruposEsquecidos(idsDasSeries)
  }, [idsDasSeries])

  return {
    isAberto: isGrupoAberto,
    handleAlternar: (seriesId: string) => handleDefinirGrupos([seriesId], !isGrupoAberto(seriesId)),
    handleExpandirTudo: (seriesIds: string[]) => handleDefinirGrupos(seriesIds, true),
    handleRecolherTudo: (seriesIds: string[]) => handleDefinirGrupos(seriesIds, false),
  }
}

type GruposLembrados = ReturnType<typeof useGruposLembrados>

/** Estado dado pela tela (Dia ou Semana) e lido por cada cartão de grupo. */
export const ContextoGruposLembrados = createContext<GruposLembrados | null>(null)

/** Estado de um grupo: sem a tela em volta (ex.: em teste isolado), sempre aberto. */
export function useGrupoLembrado(seriesId: string) {
  const contexto = useContext(ContextoGruposLembrados)
  return {
    isAberto: contexto?.isAberto(seriesId) ?? true,
    handleAlternar: () => contexto?.handleAlternar(seriesId),
    isRecolhivel: contexto !== null,
  }
}
