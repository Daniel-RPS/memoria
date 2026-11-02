import { format, isValid } from 'date-fns'
import type { Category, Etapa, Procedure } from '@/db/types'

/** Minúsculas e sem acentos, para comparar nomes e buscar. */
export function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Etapas na ordem em que aparecem (a `ordem` pode ter vindo fora de sequência). */
export function etapasEmOrdem(procedimento: Pick<Procedure, 'etapas'>) {
  return [...procedimento.etapas].sort((a, b) => a.ordem - b.ordem)
}

/** Grava a posição de cada etapa na `ordem` (0, 1, 2…): excluir uma renumera as seguintes. */
export function numerarEtapas(etapas: Pick<Etapa, 'id' | 'texto'>[]): Etapa[] {
  return etapas.map(({ id, texto }, ordem) => ({ id, texto, ordem }))
}

function textoPesquisavel(procedimento: Procedure) {
  return normalizar(
    [procedimento.titulo, ...procedimento.etapas.map((etapa) => etapa.texto)].join('\n'),
  )
}

const porTitulo = (a: Procedure, b: Procedure) => a.titulo.localeCompare(b.titulo, 'pt-BR')

/**
 * Procedimentos que contêm todas as palavras do termo (sem diferenciar acentos e maiúsculas),
 * no título ou no texto das etapas. Quem tem a busca no título vem primeiro.
 */
export function buscarProcedimentos(procedimentos: Procedure[], termo: string) {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return [...procedimentos].sort(porTitulo)

  const pontuar = (procedimento: Procedure) => {
    const titulo = normalizar(procedimento.titulo)
    return palavras.every((palavra) => titulo.includes(palavra)) ? 0 : 1
  }
  return procedimentos
    .filter((procedimento) => {
      const texto = textoPesquisavel(procedimento)
      return palavras.every((palavra) => texto.includes(palavra))
    })
    .sort((a, b) => pontuar(a) - pontuar(b) || porTitulo(a, b))
}

export interface BlocoDeProcedimentos {
  /** `null` = bloco "Sem categoria". */
  categoria: Pick<Category, 'id' | 'nome' | 'cor'> | null
  procedimentos: Procedure[]
}

/**
 * Um bloco por categoria, na ordem das categorias, e "Sem categoria" no fim. Blocos vazios
 * não aparecem; a ordem dos procedimentos dentro do bloco é a recebida (a da busca).
 * Categoria que não existe mais conta como sem categoria.
 */
export function agruparPorCategoria(
  procedimentos: Procedure[],
  categorias: Pick<Category, 'id' | 'nome' | 'cor'>[],
): BlocoDeProcedimentos[] {
  const blocos: BlocoDeProcedimentos[] = categorias.map((categoria) => ({
    categoria: { id: categoria.id, nome: categoria.nome, cor: categoria.cor },
    procedimentos: procedimentos.filter((procedimento) => procedimento.categoryId === categoria.id),
  }))
  const idsDasCategorias = new Set(categorias.map((categoria) => categoria.id))
  blocos.push({
    categoria: null,
    procedimentos: procedimentos.filter(
      (procedimento) => !procedimento.categoryId || !idsDasCategorias.has(procedimento.categoryId),
    ),
  })
  return blocos.filter((bloco) => bloco.procedimentos.length > 0)
}

/** Quantas etapas a prévia do cartão mostra. */
export const ETAPAS_NA_PREVIA = 3

export interface PreviaDoProcedimento {
  /** As primeiras etapas, na ordem, já numeradas: "1. Acessar github". */
  etapas: string[]
  /** "+ 4 etapas" quando há mais que a prévia; senão `undefined`. */
  restantes?: string
  /** "2 etapas", "1 etapa", "0 etapas". */
  total: string
  /** Sem nenhuma etapa: o cartão mostra "Nenhuma etapa ainda". */
  isVazio: boolean
  /** "editado em 01/11"; `undefined` sem data válida. */
  editadoEm?: string
}

function textoEtapas(total: number) {
  return total === 1 ? '1 etapa' : `${total} etapas`
}

/** Prévia e contagens do cartão da lista: o componente só desenha. */
export function previaDoProcedimento(
  procedimento: Pick<Procedure, 'etapas' | 'atualizadoEm'>,
): PreviaDoProcedimento {
  const etapas = etapasEmOrdem(procedimento)
  const sobra = etapas.length - ETAPAS_NA_PREVIA
  const editado = new Date(procedimento.atualizadoEm)
  return {
    etapas: etapas
      .slice(0, ETAPAS_NA_PREVIA)
      .map((etapa, indice) => `${indice + 1}. ${etapa.texto.trim() || 'Etapa sem texto'}`),
    restantes: sobra > 0 ? `+ ${textoEtapas(sobra)}` : undefined,
    total: textoEtapas(etapas.length),
    isVazio: etapas.length === 0,
    // O momento gravado é UTC; `format` mostra o dia local.
    editadoEm: isValid(editado) ? `editado em ${format(editado, 'dd/MM')}` : undefined,
  }
}
