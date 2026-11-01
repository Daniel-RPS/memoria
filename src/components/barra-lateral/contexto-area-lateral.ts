import { createContext } from 'react'

/**
 * Espaço da barra lateral que a página aberta pode ocupar (ex.: o filtro do Dia).
 * O `LayoutApp` fornece o elemento; a página continua dona do estado e só desenha lá.
 */
export const ContextoAreaLateral = createContext<HTMLElement | null>(null)
