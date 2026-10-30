import { z } from 'zod'

export const TAMANHO_MAXIMO_TITULO = 200

export const esquemaTituloTarefa = z
  .string()
  .trim()
  .min(1, 'Escreva o nome da tarefa.')
  .max(TAMANHO_MAXIMO_TITULO, `Use no máximo ${TAMANHO_MAXIMO_TITULO} caracteres.`)

export const esquemaNovoItem = z.object({ titulo: esquemaTituloTarefa })

export type NovoItemInput = z.infer<typeof esquemaNovoItem>
