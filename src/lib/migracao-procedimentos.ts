import type { Etapa, Procedure } from '@/db/types'

/**
 * Procedimento do modelo anterior (banco até a v6, backup até o formato 3):
 * seções com passos e subpassos, além de descrição, campos variáveis e versão.
 */
export interface ProcedimentoAntigo {
  id: string
  titulo: string
  categoryId?: string
  criadoEm: string
  atualizadoEm: string
  secoes: { passos: { id: string; texto: string; subpassos?: { id: string; texto: string }[] }[] }[]
}

/**
 * Converte para o modelo de etapas. Título, categoria e datas ficam; os passos de todas as
 * seções viram etapas na ordem, e cada subpasso vira uma etapa logo depois do seu passo.
 * O resto (descrição, código, alerta, campos variáveis, versão) não existe mais.
 */
export function converterProcedimentoAntigo(antigo: ProcedimentoAntigo): Procedure {
  const textos = antigo.secoes.flatMap((secao) =>
    secao.passos.flatMap((passo) => [passo, ...(passo.subpassos ?? [])]),
  )
  const etapas: Etapa[] = textos.map(({ id, texto }, ordem) => ({ id, texto, ordem }))
  return {
    id: antigo.id,
    titulo: antigo.titulo,
    ...(antigo.categoryId ? { categoryId: antigo.categoryId } : {}),
    etapas,
    criadoEm: antigo.criadoEm,
    atualizadoEm: antigo.atualizadoEm,
  }
}
