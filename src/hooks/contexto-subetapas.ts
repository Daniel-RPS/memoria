import { createContext, useContext } from 'react'
import type { Subtask } from '@/db/types'

const SEM_SUBETAPAS: Subtask[] = []

/**
 * Subetapas da tela por dono (id da tarefa solta ou do item de grupo), cada lista em ordem.
 * O Dia e a Semana fornecem; linhas de tarefa e de item só leem.
 */
export const ContextoSubetapas = createContext<Map<string, Subtask[]>>(new Map())

export function useSubetapasDe(donoId: string) {
  return useContext(ContextoSubetapas).get(donoId) ?? SEM_SUBETAPAS
}
