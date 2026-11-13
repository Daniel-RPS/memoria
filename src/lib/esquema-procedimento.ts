import { z } from 'zod'
import type { Procedure } from '@/db/types'
import { esquemaIcone } from '@/lib/icones'
import { etapasEmOrdem } from '@/lib/procedimentos'

/** Formulário de criar/editar procedimento. `categoryId` vazio = sem categoria. */
export const esquemaProcedimento = z.object({
  titulo: z.string().trim().min(1, 'Dê um título ao procedimento.'),
  /** Emoji ou marca antes do título; ausente = sem ícone. */
  icone: esquemaIcone.optional(),
  categoryId: z.string(),
  favorito: z.boolean().optional(),
  etapas: z.array(
    z.object({
      id: z.string().min(1),
      texto: z.string(),
      rotulo: z.string().max(40).optional(),
    }),
  ),
})

export type ValoresProcedimento = z.input<typeof esquemaProcedimento>
export type DadosProcedimento = z.output<typeof esquemaProcedimento>

/** Valores iniciais do formulário: vazio (novo) ou a partir do procedimento salvo. */
export function valoresDoFormulario(procedimento?: Procedure): ValoresProcedimento {
  if (!procedimento) return { titulo: '', categoryId: '', etapas: [] }
  return {
    titulo: procedimento.titulo,
    icone: procedimento.icone,
    categoryId: procedimento.categoryId ?? '',
    favorito: procedimento.favorito,
    etapas: etapasEmOrdem(procedimento).map(({ id, texto, rotulo }) => ({
      id,
      texto,
      rotulo: rotulo || undefined,
    })),
  }
}
