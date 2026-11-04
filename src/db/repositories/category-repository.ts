import { db } from '@/db/database'
import type { Category, Icone, Subcategory, TipoCategoria } from '@/db/types'
import { agora, gravarNovaPosicao } from '@/db/repositories/ordenacao'
import { limparCategoriaDasSessoes } from '@/domain/tempo'
import { isMesmoNome, montarCategorias, NOMES_DO_TIPO, outroTipo, somarUso } from '@/lib/categorias'
import { coresRecentes, proximaCor } from '@/lib/cores'
import { ErroDeValidacao } from '@/lib/erros'
import { esquemaNomeCategoria } from '@/lib/esquemas'
import { iconeValido } from '@/lib/icones'

/** Nome limpo e válido; senão lança `ErroDeValidacao` com a mensagem para o campo. */
function nomeValido(nome: string) {
  const resultado = esquemaNomeCategoria.safeParse(nome)
  if (!resultado.success) throw new ErroDeValidacao(resultado.error.issues[0].message)
  return resultado.data
}

function maiorOrdem(itens: { ordem: number }[]) {
  return Math.max(0, ...itens.map((item) => item.ordem))
}

function categoriasDoTipoNoBanco(tipo: TipoCategoria) {
  return db.categories.filter((categoria) => categoria.tipo === tipo).toArray()
}

/** Lança `ErroDeValidacao` se outra categoria do mesmo tipo já tem o nome. */
function exigirNomeLivre(nome: string, doTipo: Category[], idIgnorado?: string) {
  if (
    doTipo.some((categoria) => categoria.id !== idIgnorado && isMesmoNome(categoria.nome, nome))
  ) {
    throw new ErroDeValidacao('Já existe uma categoria com esse nome.')
  }
}

/**
 * Todas as categorias (dos dois tipos) com suas subcategorias, na ordem do usuário. As telas
 * buscam a cor pelo id em todas; quem escolhe categoria filtra pelo tipo.
 */
export async function listarCategorias() {
  const [categorias, subcategorias] = await Promise.all([
    db.categories.toArray(),
    db.subcategories.toArray(),
  ])
  return montarCategorias(categorias, subcategorias)
}

/** Últimas cores personalizadas (fora da paleta) usadas em categorias e subcategorias. */
export async function listarCoresRecentes() {
  const [categorias, subcategorias] = await Promise.all([
    db.categories.toArray(),
    db.subcategories.toArray(),
  ])
  return coresRecentes([...categorias, ...subcategorias])
}

/**
 * Quantas tarefas (de qualquer dia e status), grupos e procedimentos usam cada categoria.
 * Lê só as chaves dos índices, sem carregar os registros.
 */
export async function contarUsoDasCategorias() {
  const [tarefas, grupos, procedimentos] = await Promise.all([
    db.tasks.orderBy('categoryId').keys(),
    db.groupSeries.orderBy('categoryId').keys(),
    db.procedures.orderBy('categoryId').keys(),
  ])
  return somarUso({
    tarefas: tarefas.map(String),
    grupos: grupos.map(String),
    procedimentos: procedimentos.map(String),
  })
}

/**
 * Cria a categoria no fim da lista do tipo (sem tipo = grupo); sem `cor`, usa a próxima cor
 * livre da paleta nesse tipo. Nome repetido só é recusado dentro do mesmo tipo.
 */
export async function criarCategoria(dados: {
  nome: string
  cor?: string
  tipo?: TipoCategoria
}): Promise<Category> {
  const nome = nomeValido(dados.nome)
  const tipo = dados.tipo ?? 'grupo'
  return db.transaction('rw', db.categories, async () => {
    const doTipo = await categoriasDoTipoNoBanco(tipo)
    exigirNomeLivre(nome, doTipo)
    const momento = agora()
    const categoria: Category = {
      id: crypto.randomUUID(),
      nome,
      cor: dados.cor ?? proximaCor(doTipo),
      tipo,
      ordem: maiorOrdem(doTipo) + 1,
      criadoEm: momento,
      atualizadoEm: momento,
    }
    await db.categories.add(categoria)
    return categoria
  })
}

export async function atualizarCategoria(id: string, mudancas: { nome?: string; cor?: string }) {
  const nome = mudancas.nome === undefined ? undefined : nomeValido(mudancas.nome)
  await db.transaction('rw', db.categories, async () => {
    const atual = await db.categories.get(id)
    if (!atual) return
    if (nome !== undefined) exigirNomeLivre(nome, await categoriasDoTipoNoBanco(atual.tipo), id)
    await db.categories.update(id, {
      ...(nome !== undefined && { nome }),
      ...(mudancas.cor !== undefined && { cor: mudancas.cor }),
      atualizadoEm: agora(),
    })
  })
}

/** Troca o ícone da categoria; `undefined` = "Sem ícone" (o campo some do registro). */
export async function definirIconeDaCategoria(id: string, icone: Icone | undefined) {
  const valido = icone && iconeValido(icone)
  if (icone && !valido) throw new ErroDeValidacao('Ícone inválido.')
  await db.categories.update(id, { icone: valido, atualizadoEm: agora() })
}

/**
 * Grava a nova posição de `idMovido` entre as categorias de UM tipo (`idsEmOrdem` já
 * reordenado, só com as do tipo): a ordem do outro tipo não muda.
 */
export async function reordenarCategoria(idsEmOrdem: string[], idMovido: string) {
  await db.transaction('rw', db.categories, () =>
    gravarNovaPosicao(db.categories, idsEmOrdem, idMovido),
  )
}

/**
 * Passa a categoria (com as subcategorias) para o outro tipo, no fim da lista dele. Os itens
 * do tipo antigo que a usavam (tarefas e grupos, ou procedimentos) ficam sem categoria.
 * Recusa com `ErroDeValidacao` se o outro tipo já tem uma categoria com o mesmo nome.
 */
export async function moverCategoriaDeTipo(id: string) {
  await db.transaction(
    'rw',
    [db.categories, db.tasks, db.procedures, db.groupSeries, db.sessions],
    async () => {
      const categoria = await db.categories.get(id)
      if (!categoria) return
      const destino = outroTipo(categoria.tipo)
      const doDestino = await categoriasDoTipoNoBanco(destino)
      if (doDestino.some((outra) => isMesmoNome(outra.nome, categoria.nome))) {
        throw new ErroDeValidacao(
          `Já existe “${categoria.nome}” em ${NOMES_DO_TIPO[destino].plural}. Renomeie antes de mover.`,
        )
      }
      const momento = agora()
      const semCategoria = {
        categoryId: undefined,
        subcategoryId: undefined,
        atualizadoEm: momento,
      }
      const tabelas = categoria.tipo === 'grupo' ? [db.tasks, db.groupSeries] : [db.procedures]
      for (const tabela of tabelas) {
        await tabela.where('categoryId').equals(id).modify(semCategoria)
      }
      if (categoria.tipo === 'grupo') {
        await limparCategoriaDasSessoes(id, momento)
      }
      await db.categories.update(id, {
        tipo: destino,
        ordem: maiorOrdem(doDestino) + 1,
        atualizadoEm: momento,
      })
    },
  )
}

/**
 * Exclui a categoria e as subcategorias dela. Tarefas, grupos, procedimentos e sessões de tempo
 * NÃO são apagados: só ficam sem categoria.
 */
export async function excluirCategoria(id: string) {
  await db.transaction(
    'rw',
    [db.categories, db.subcategories, db.tasks, db.procedures, db.groupSeries, db.sessions],
    async () => {
      const momento = agora()
      const semCategoria = {
        categoryId: undefined,
        subcategoryId: undefined,
        atualizadoEm: momento,
      }
      await db.tasks.where('categoryId').equals(id).modify(semCategoria)
      await db.groupSeries.where('categoryId').equals(id).modify(semCategoria)
      await db.procedures.where('categoryId').equals(id).modify(semCategoria)
      await limparCategoriaDasSessoes(id, momento)
      await db.subcategories.where('categoryId').equals(id).delete()
      await db.categories.delete(id)
    },
  )
}

/**
 * Cria uma categoria de Grupo a partir de uma de Procedimentos ("Usar de Procedimentos"):
 * mesmo nome, cor, ícone e subcategorias (nome, cor e ordem), mas independente da original.
 * Nome já usado em Grupos lança `ErroDeValidacao`, como em `criarCategoria`.
 */
export async function criarDeCategoriaDeProcedimento(idOrigem: string): Promise<Category> {
  return db.transaction('rw', db.categories, db.subcategories, async () => {
    const origem = await db.categories.get(idOrigem)
    if (!origem || origem.tipo !== 'procedimento') {
      throw new ErroDeValidacao('Essa categoria de Procedimentos não existe mais.')
    }
    const doTipo = await categoriasDoTipoNoBanco('grupo')
    exigirNomeLivre(origem.nome, doTipo)
    const momento = agora()
    const categoria: Category = {
      id: crypto.randomUUID(),
      nome: origem.nome,
      cor: origem.cor,
      tipo: 'grupo',
      ordem: maiorOrdem(doTipo) + 1,
      ...(origem.icone ? { icone: origem.icone } : {}),
      criadoEm: momento,
      atualizadoEm: momento,
    }
    await db.categories.add(categoria)
    const subcategorias = await db.subcategories.where('categoryId').equals(idOrigem).toArray()
    await db.subcategories.bulkAdd(
      subcategorias.map(({ nome, cor, ordem }): Subcategory => ({
        id: crypto.randomUUID(),
        categoryId: categoria.id,
        nome,
        ...(cor ? { cor } : {}),
        ordem,
        criadoEm: momento,
        atualizadoEm: momento,
      })),
    )
    return categoria
  })
}

/** Cria a subcategoria no fim da categoria. Sem `cor`, usa o tom automático da categoria. */
export async function criarSubcategoria(dados: {
  categoryId: string
  nome: string
  cor?: string
}): Promise<Subcategory> {
  const nome = nomeValido(dados.nome)
  return db.transaction('rw', db.subcategories, async () => {
    const irmas = await db.subcategories.where('categoryId').equals(dados.categoryId).toArray()
    if (irmas.some((subcategoria) => isMesmoNome(subcategoria.nome, nome))) {
      throw new ErroDeValidacao('Já existe uma subcategoria com esse nome nesta categoria.')
    }
    const momento = agora()
    const subcategoria: Subcategory = {
      id: crypto.randomUUID(),
      categoryId: dados.categoryId,
      nome,
      ...(dados.cor ? { cor: dados.cor } : {}),
      ordem: maiorOrdem(irmas) + 1,
      criadoEm: momento,
      atualizadoEm: momento,
    }
    await db.subcategories.add(subcategoria)
    return subcategoria
  })
}

/** `cor: null` volta a usar a variação automática da cor da categoria. */
export async function atualizarSubcategoria(
  id: string,
  mudancas: { nome?: string; cor?: string | null },
) {
  const nome = mudancas.nome === undefined ? undefined : nomeValido(mudancas.nome)
  const { cor } = mudancas
  await db.transaction('rw', db.subcategories, async () => {
    const atual = await db.subcategories.get(id)
    if (!atual) return
    if (nome !== undefined) {
      const irmas = await db.subcategories.where('categoryId').equals(atual.categoryId).toArray()
      if (irmas.some((irma) => irma.id !== id && isMesmoNome(irma.nome, nome))) {
        throw new ErroDeValidacao('Já existe uma subcategoria com esse nome nesta categoria.')
      }
    }
    await db.subcategories.update(id, {
      ...(nome !== undefined && { nome }),
      ...(cor !== undefined && { cor: cor ?? undefined }),
      atualizadoEm: agora(),
    })
  })
}

/** Grava a nova posição de `idMovido` entre as subcategorias de uma categoria. */
export async function reordenarSubcategoria(idsEmOrdem: string[], idMovido: string) {
  await db.transaction('rw', db.subcategories, () =>
    gravarNovaPosicao(db.subcategories, idsEmOrdem, idMovido),
  )
}

/** Exclui a subcategoria; tarefas, grupos e procedimentos continuam na categoria-mãe. */
export async function excluirSubcategoria(id: string) {
  await db.transaction(
    'rw',
    [db.subcategories, db.tasks, db.groupSeries, db.procedures],
    async () => {
      const subcategoria = await db.subcategories.get(id)
      if (!subcategoria) return
      const semSubcategoria = { subcategoryId: undefined, atualizadoEm: agora() }
      const daSubcategoria = (item: { subcategoryId?: string }) => item.subcategoryId === id
      for (const tabela of [db.tasks, db.groupSeries, db.procedures] as const) {
        await tabela
          .where('categoryId')
          .equals(subcategoria.categoryId)
          .filter(daSubcategoria)
          .modify(semSubcategoria)
      }
      await db.subcategories.delete(id)
    },
  )
}
