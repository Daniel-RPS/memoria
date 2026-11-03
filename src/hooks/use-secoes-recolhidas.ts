import { useState } from 'react'
import { gravarPreferencia, lerPreferencia } from '@/app/preferencia-local'

const PREFIXO = 'memoria:recolhidos:'
/**
 * Quantos ids recolhidos guarda por escopo (os mais recentes). Na Semana cada card de cada dia
 * tem o seu: sem limite, a lista cresceria para sempre com cards antigos.
 */
export const RECOLHIDOS_NO_MAXIMO = 300

function lerRecolhidas(escopo: string) {
  try {
    const lido: unknown = JSON.parse(lerPreferencia(PREFIXO + escopo) ?? '[]')
    return new Set(
      Array.isArray(lido) ? lido.filter((id): id is string => typeof id === 'string') : [],
    )
  } catch {
    return new Set<string>()
  }
}

/**
 * Quais blocos de uma lista estão recolhidos, lembrado por `escopo` (ex.: `notas:categoria`):
 * guarda os ids recolhidos; sem nada salvo, tudo aberto.
 *
 * Com busca ou filtro ativo (`isFiltrando`), todos os blocos abrem sozinhos e o que o usuário
 * recolher vale só até limpar o filtro: o estado salvo não muda.
 */
export function useSecoesRecolhidas(escopo: string, isFiltrando: boolean) {
  const [salvas, setSalvas] = useState(() => ({ escopo, ids: lerRecolhidas(escopo) }))
  const [temporarias, setTemporarias] = useState(() => new Set<string>())
  const [estavaFiltrando, setEstavaFiltrando] = useState(isFiltrando)

  // Trocou de modo: lê o estado salvo do novo escopo.
  if (salvas.escopo !== escopo) setSalvas({ escopo, ids: lerRecolhidas(escopo) })
  // Começou (ou voltou) a filtrar: tudo aberto de novo.
  if (estavaFiltrando !== isFiltrando) {
    setEstavaFiltrando(isFiltrando)
    setTemporarias(new Set())
  }

  const recolhidas = isFiltrando ? temporarias : salvas.ids

  function definir(novas: Set<string>) {
    if (isFiltrando) {
      setTemporarias(novas)
      return
    }
    setSalvas({ escopo, ids: novas })
    gravarPreferencia(PREFIXO + escopo, JSON.stringify([...novas].slice(-RECOLHIDOS_NO_MAXIMO)))
  }

  function handleAlternar(id: string) {
    const novas = new Set(recolhidas)
    if (!novas.delete(id)) novas.add(id)
    definir(novas)
  }

  /** Abre os blocos mostrados (os outros ids salvos continuam como estão). */
  function handleExpandirTudo(ids: string[]) {
    const novas = new Set(recolhidas)
    for (const id of ids) novas.delete(id)
    definir(novas)
  }

  function handleRecolherTudo(ids: string[]) {
    definir(new Set([...recolhidas, ...ids]))
  }

  return {
    isAberta: (id: string) => !recolhidas.has(id),
    handleAlternar,
    handleExpandirTudo,
    handleRecolherTudo,
  }
}
