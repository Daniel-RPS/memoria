import { z } from 'zod'
import type { Procedure } from '@/db/types'
import { etapasEmOrdem } from '@/lib/procedimentos'

/** Formulário de criar/editar procedimento. `categoryId` vazio = sem categoria. */
export const esquemaProcedimento = z.object({
  titulo: z.string().trim().min(1, 'Dê um título ao procedimento.'),
  categoryId: z.string(),
  etapas: z.array(z.object({ id: z.string().min(1), texto: z.string() })),
})

export type ValoresProcedimento = z.input<typeof esquemaProcedimento>
export type DadosProcedimento = z.output<typeof esquemaProcedimento>

/** Valores iniciais do formulário: vazio (novo) ou a partir do procedimento salvo. */
export function valoresDoFormulario(procedimento?: Procedure): ValoresProcedimento {
  if (!procedimento) return { titulo: '', categoryId: '', etapas: [] }
  return {
    titulo: procedimento.titulo,
    categoryId: procedimento.categoryId ?? '',
    etapas: etapasEmOrdem(procedimento).map(({ id, texto }) => ({ id, texto })),
  }
}
