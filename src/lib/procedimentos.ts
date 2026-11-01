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
