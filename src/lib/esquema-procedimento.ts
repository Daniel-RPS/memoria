import { z } from 'zod'
import type { Procedure } from '@/db/types'
import type { DadosProcedimento } from '@/db/repositories/procedure-repository'
import { TAMANHO_MAXIMO_TITULO } from '@/lib/esquemas'
import { normalizar } from '@/lib/procedimentos'

const id = z.string().min(1)

const esquemaSubpasso = z.object({
  id,
  texto: z.string().trim().min(1, 'Escreva o subpasso ou remova a linha.'),
})

const esquemaPasso = z.object({
  id,
  texto: z.string().trim().min(1, 'Escreva o que fazer neste passo.'),
  codigo: z.string(),
  alerta: z.string(),
  subpassos: z.array(esquemaSubpasso),
})

const esquemaSecao = z.object({
  id,
  titulo: z.string().trim().min(1, 'Dê um nome à seção.'),
  passos: z.array(esquemaPasso).min(1, 'A seção precisa de pelo menos um passo.'),
})

const esquemaCampo = z.object({
  id,
  nome: z
    .string()
    .trim()
    .min(1, 'Dê um nome ao campo.')
    .regex(/^[^{}]+$/, 'O nome não pode ter chaves { }.'),
  tipo: z.enum(['texto', 'numero', 'data', 'credencial']),
  /** Só para credencial: ONDE a senha está. Nunca existe campo para o valor da senha. */
  localCredencial: z.string(),
})

export const esquemaProcedimento = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, 'Dê um título ao procedimento.')
    .max(TAMANHO_MAXIMO_TITULO, `Use no máximo ${TAMANHO_MAXIMO_TITULO} caracteres.`),
  categoryId: z.string(),
  descricao: z.string(),
  camposVariaveis: z.array(esquemaCampo).superRefine((campos, contexto) => {
    const vistos = new Set<string>()
    campos.forEach((campo, indice) => {
      const nome = normalizar(campo.nome)
      if (nome && vistos.has(nome)) {
        contexto.addIssue({
          code: 'custom',
          message: 'Já existe um campo com esse nome.',
          path: [indice, 'nome'],
        })
      }
      vistos.add(nome)
    })
  }),
  secoes: z.array(esquemaSecao).min(1, 'Adicione pelo menos uma seção.'),
})

export type ValoresProcedimento = z.infer<typeof esquemaProcedimento>
export type ValoresSecao = ValoresProcedimento['secoes'][number]
export type ValoresPasso = ValoresSecao['passos'][number]

export function novoPasso(): ValoresPasso {
  return { id: crypto.randomUUID(), texto: '', codigo: '', alerta: '', subpassos: [] }
}

export function novaSecao(titulo = ''): ValoresSecao {
  return { id: crypto.randomUUID(), titulo, passos: [novoPasso()] }
}

/** Valores do formulário para um procedimento novo ou existente. */
export function valoresDoFormulario(procedimento?: Procedure): ValoresProcedimento {
  if (!procedimento) {
    return {
      titulo: '',
      categoryId: '',
      descricao: '',
      camposVariaveis: [],
      secoes: [novaSecao('Passos')],
    }
  }
  return {
    titulo: procedimento.titulo,
    categoryId: procedimento.categoryId ?? '',
    descricao: procedimento.descricao,
    camposVariaveis: procedimento.camposVariaveis.map((campo) => ({
      ...campo,
      localCredencial: campo.localCredencial ?? '',
    })),
    secoes: procedimento.secoes.map((secao) => ({
      id: secao.id,
      titulo: secao.titulo,
      passos: secao.passos.map((passo) => ({
        id: passo.id,
        texto: passo.texto,
        codigo: passo.codigo ?? '',
        alerta: passo.alerta ?? '',
        subpassos: passo.subpassos,
      })),
    })),
  }
}

/**
 * Converte o formulário validado no que o repositório salva: textos vazios viram ausentes e
 * os anexos de cada passo (que o editor ainda não mostra) são mantidos.
 */
export function dadosDoFormulario(
  valores: ValoresProcedimento,
  original?: Procedure,
): DadosProcedimento {
  const anexosPorPasso = new Map(
    original?.secoes.flatMap((secao) => secao.passos.map((passo) => [passo.id, passo.anexos])),
  )
  const opcional = (texto: string) => (texto.trim() ? texto : undefined)
  return {
    titulo: valores.titulo.trim(),
    categoryId: opcional(valores.categoryId),
    descricao: valores.descricao.trim(),
    camposVariaveis: valores.camposVariaveis.map((campo) => ({
      id: campo.id,
      nome: campo.nome.trim(),
      tipo: campo.tipo,
      localCredencial:
        campo.tipo === 'credencial' ? opcional(campo.localCredencial.trim()) : undefined,
    })),
    secoes: valores.secoes.map((secao) => ({
      id: secao.id,
      titulo: secao.titulo.trim(),
      passos: secao.passos.map((passo) => ({
        id: passo.id,
        texto: passo.texto.trim(),
        codigo: opcional(passo.codigo),
        alerta: opcional(passo.alerta.trim()),
        anexos: anexosPorPasso.get(passo.id) ?? [],
        subpassos: passo.subpassos.map((subpasso) => ({
          id: subpasso.id,
          texto: subpasso.texto.trim(),
        })),
      })),
    })),
  }
}
