import { createContext, useContext, useEffect, useState } from 'react'

export interface Selecao {
  isSelecionando: boolean
  selecionados: Set<string>
  iniciar: () => void
  encerrar: () => void
  alternar: (id: string) => void
  selecionarTodos: (ids: string[]) => void
}

/** Estado do modo "Selecionar" da folha do dia. Esc encerra. */
export function useSelecao(): Selecao {
  const [isSelecionando, setIsSelecionando] = useState(false)
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set())

  function encerrar() {
    setIsSelecionando(false)
    setSelecionados(new Set())
  }

  useEffect(() => {
    if (!isSelecionando) return
    function handleKeyDown(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        setIsSelecionando(false)
        setSelecionados(new Set())
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSelecionando])

  return {
    isSelecionando,
    selecionados,
    iniciar: () => setIsSelecionando(true),
    encerrar,
    alternar: (id) =>
      setSelecionados((atuais) => {
        const proximos = new Set(atuais)
        if (proximos.has(id)) proximos.delete(id)
        else proximos.add(id)
        return proximos
      }),
    selecionarTodos: (ids) => setSelecionados(new Set(ids)),
  }
}

const SEM_SELECAO: Selecao = {
  isSelecionando: false,
  selecionados: new Set(),
  iniciar: () => {},
  encerrar: () => {},
  alternar: () => {},
  selecionarTodos: () => {},
}

export const ContextoSelecao = createContext<Selecao>(SEM_SELECAO)

export function useSelecaoDaFolha() {
  return useContext(ContextoSelecao)
}
