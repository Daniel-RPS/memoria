import { createContext, useContext } from 'react'
import type { LembreteComAlvo } from '@/db/repositories/lembrete-repository'
import type { Lembrete } from '@/db/types'

export interface DadosDosLembretes {
  /** Todos os lembretes com o alvo (`undefined` enquanto carrega). */
  linhas: LembreteComAlvo[] | undefined
  /** Lembretes por id do alvo (tarefa ou item). */
  porAlvo: Map<string, Lembrete[]>
  /** Avisos disparados ou perdidos que a pessoa ainda não viu. */
  naoVistos: number
}

/** Preenchido pelo `ProvedorDeLembretes` na raiz; sem ele (testes), vazio. */
export const ContextoLembretes = createContext<DadosDosLembretes>({
  linhas: undefined,
  porAlvo: new Map(),
  naoVistos: 0,
})

const NENHUM: Lembrete[] = []

export function useDadosDosLembretes() {
  return useContext(ContextoLembretes)
}

/** Lembretes de uma tarefa ou item (lista vazia sem nenhum). */
export function useLembretesDe(alvoId: string) {
  return useContext(ContextoLembretes).porAlvo.get(alvoId) ?? NENHUM
}
