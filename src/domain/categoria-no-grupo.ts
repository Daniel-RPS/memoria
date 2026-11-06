/**
 * Categoria ao colocar tarefa solta num grupo (ou tirar o item dele). O item NÃO tem categoria
 * própria: usa a da série do grupo. Por isso a tarefa que entra num grupo de outra categoria (ou
 * sem categoria) perde a dela, e o item que sai do grupo vira tarefa sem categoria. A regra não
 * muda; aqui só se decide QUANDO avisar e com que texto. Sem banco: o repositório aplica.
 */

/** Categoria e subcategoria de uma tarefa ou de uma série de grupo. */
export interface ParDeCategoria {
  categoryId?: string | undefined
  subcategoryId?: string | undefined
}

/** O que a linha tinha e o que ficou valendo depois da conversão. */
export interface MudancaDeCategoria {
  de: ParDeCategoria
  para: ParDeCategoria
}

/**
 * Tarefa solta → item do grupo. Avisa só se a tarefa tinha categoria e ela (ou a subcategoria)
 * se perde: grupo de outra categoria, sem categoria ou com outra subcategoria/sem a dela. Só
 * GANHAR subcategoria (tarefa "Trabalho" em grupo "Trabalho › Reuniões") não perde nada: sem aviso.
 */
export function mudancaAoEntrarNoGrupo(
  tarefa: ParDeCategoria,
  serie: ParDeCategoria,
): MudancaDeCategoria | null {
  if (!tarefa.categoryId) return null
  const isMesmaCategoria = tarefa.categoryId === serie.categoryId
  const isSubcategoriaMantida =
    tarefa.subcategoryId === undefined || tarefa.subcategoryId === serie.subcategoryId
  if (isMesmaCategoria && isSubcategoriaMantida) return null
  return {
    de: { categoryId: tarefa.categoryId, subcategoryId: tarefa.subcategoryId },
    para: { categoryId: serie.categoryId, subcategoryId: serie.subcategoryId },
  }
}

/** Item → tarefa solta: a tarefa nasce sem categoria, então avisa se o grupo tinha uma. */
export function mudancaAoSairDoGrupo(serie: ParDeCategoria): MudancaDeCategoria | null {
  if (!serie.categoryId) return null
  return { de: { categoryId: serie.categoryId, subcategoryId: serie.subcategoryId }, para: {} }
}

/** Um aviso pronto para virar texto: quem mudou, em que grupo e os nomes das categorias. */
export interface AvisoDeCategoria {
  sentido: 'entrou' | 'saiu'
  titulo: string
  grupo: string
  /** Nome do que se perdeu ("Trabalho" ou "Trabalho › Reuniões"). */
  perdida: string
  /** A linha terminou sem categoria. */
  isSemCategoria: boolean
}

/** Nomes por id (categorias e subcategorias juntas: ids são UUIDs, não colidem). */
export type NomesDeCategoria = ReadonlyMap<string, string>

/** "Trabalho" ou "Trabalho › Reuniões"; id que sumiu fica de fora. */
export function nomeDoPar(par: ParDeCategoria, nomes: NomesDeCategoria) {
  const categoria = par.categoryId ? nomes.get(par.categoryId) : undefined
  const subcategoria = par.subcategoryId ? nomes.get(par.subcategoryId) : undefined
  if (!categoria) return ''
  return subcategoria ? `${categoria} › ${subcategoria}` : categoria
}

export function montarAviso(
  sentido: AvisoDeCategoria['sentido'],
  titulo: string,
  grupo: string,
  mudanca: MudancaDeCategoria,
  nomes: NomesDeCategoria,
): AvisoDeCategoria {
  return {
    sentido,
    titulo,
    grupo,
    perdida: nomeDoPar(mudanca.de, nomes),
    isSemCategoria: !mudanca.para.categoryId,
  }
}

/** Texto do aviso (um por operação); `null` se nenhuma linha mudou de categoria. */
export function textoDoAviso(avisos: AvisoDeCategoria[]): string | null {
  if (avisos.length === 0) return null
  if (avisos.length > 1) return `${avisos.length} tarefas deixaram suas categorias.`
  const [{ sentido, titulo, grupo, perdida, isSemCategoria }] = avisos
  if (sentido === 'saiu') return `"${titulo}" saiu do grupo ${grupo} e ficou sem categoria.`
  if (isSemCategoria) return `"${titulo}" foi para o grupo ${grupo} e ficou sem categoria.`
  return `"${titulo}" foi para o grupo ${grupo} e deixou a categoria ${perdida}.`
}
