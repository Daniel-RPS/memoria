import { z } from 'zod'

export const TAMANHO_MAXIMO_TITULO = 200

export const esquemaTituloTarefa = z
  .string()
  .trim()
  .min(1, 'Escreva um nome.')
  .max(TAMANHO_MAXIMO_TITULO, `Use no máximo ${TAMANHO_MAXIMO_TITULO} caracteres.`)

export const esquemaNovoItem = z.object({ titulo: esquemaTituloTarefa })

export type NovoItemInput = z.infer<typeof esquemaNovoItem>

export const TAMANHO_MAXIMO_NOME_CATEGORIA = 60

/** Nome de categoria. */
export const esquemaNomeCategoria = z
  .string()
  .trim()
  .min(1, 'Escreva um nome.')
  .max(TAMANHO_MAXIMO_NOME_CATEGORIA, `Use no máximo ${TAMANHO_MAXIMO_NOME_CATEGORIA} caracteres.`)
