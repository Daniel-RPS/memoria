import { createContext, useContext, useState } from 'react'

/**
 * Grupos abertos/recolhidos numa visita ao Dia ou à Semana, só na memória: ao abrir a tela
 * (ou trocar de dia/semana, que monta a tela de novo) todos os cards que já existem começam
 * recolhidos. Card que surge durante a visita (grupo criado, levado para outro dia, desfeito)
 * começa aberto, para mostrar o que acabou de acontecer.
 *
 * `idsIniciais` = ids dos cards quando os dados chegam; `undefined` enquanto carregam.
 */
export function useGruposDaVisita(idsIniciais: string[] | undefined) {
  const [conhecidos, setConhecidos] = useState<Set<string> | null>(null)
  const [alternados, setAlternados] = useState(() => new Set<string>())

  // Guarda os cards que já existiam ao abrir (uma vez, quando os dados chegam).
  if (conhecidos === null && idsIniciais !== undefined) setConhecidos(new Set(idsIniciais))

  /** Aberto por padrão só o card que surgiu na visita; alternar inverte o padrão. */
  function isAberto(id: string) {
    const isPadraoAberto = conhecidos !== null && !conhecidos.has(id)
    return alternados.has(id) ? !isPadraoAberto : isPadraoAberto
  }

  function definir(ids: string[], isAbrir: boolean) {
    setAlternados((atuais) => {
      const novos = new Set(atuais)
      for (const id of ids) {
        if (isAberto(id) === isAbrir) continue
        if (!novos.delete(id)) novos.add(id)
      }
      return novos
    })
  }

  return {
    isAberto,
    handleAlternar: (id: string) => definir([id], !isAberto(id)),
    handleExpandirTudo: (ids: string[]) => definir(ids, true),
    handleRecolherTudo: (ids: string[]) => definir(ids, false),
  }
}

type GruposDaVisita = ReturnType<typeof useGruposDaVisita>

/** Estado da visita dado pela tela (Dia ou Semana) e lido por cada card. */
export const ContextoGruposDaVisita = createContext<GruposDaVisita | null>(null)

/** Estado de um card: sem a tela em volta (ex.: em teste isolado), sempre aberto. */
export function useGrupoDaVisita(cardId: string) {
  const contexto = useContext(ContextoGruposDaVisita)
  return {
    isAberto: contexto?.isAberto(cardId) ?? true,
    handleAlternar: () => contexto?.handleAlternar(cardId),
    isRecolhivel: contexto !== null,
  }
}
