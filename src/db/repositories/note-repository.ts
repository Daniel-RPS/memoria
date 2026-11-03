import { db } from '@/db/database'
import type { GroupItem, Note, TipoAnexo, Vinculo } from '@/db/types'
import { excluirAnexosDe } from '@/db/repositories/attachment-repository'
import { agora } from '@/db/repositories/ordenacao'
import { montarCategorias } from '@/lib/categorias'
import { chaveDoVinculo, type DadosDosVinculos } from '@/lib/notas'

const porRecencia = (a: Note, b: Note) => b.atualizadoEm.localeCompare(a.atualizadoEm)

const isVisivel = (nota: Note) => !nota.arquivado

/** Todas as notas não arquivadas (ligadas e avulsas), da mais recente para a mais antiga. */
export async function listarNotas() {
  return (await db.notes.filter(isVisivel).toArray()).sort(porRecencia)
}

export function obterNota(id: string) {
  return db.notes.get(id)
}

/** Notas de uma tarefa, grupo (série) ou item (cadeia), da mais recente para a mais antiga. */
export async function listarNotasDe(vinculo: Vinculo) {
  const notas = await db.notes
    .where('[vinculo.tipo+vinculo.id]')
    .equals([vinculo.tipo, vinculo.id])
    .filter(isVisivel)
    .toArray()
  return notas.sort(porRecencia)
}

/** Quantas notas (não arquivadas) o alvo tem, para o indicador, sem carregar o texto. */
export function contarNotasDe(vinculo: Vinculo) {
  return db.notes
    .where('[vinculo.tipo+vinculo.id]')
    .equals([vinculo.tipo, vinculo.id])
    .filter(isVisivel)
    .count()
}

export async function criarNota(
  dados: { titulo?: string; conteudo?: string; vinculo?: Vinculo } = {},
) {
  const momento = agora()
  const nota: Note = {
    id: crypto.randomUUID(),
    titulo: dados.titulo?.trim() ?? '',
    conteudo: dados.conteudo ?? '',
    ...(dados.vinculo && { vinculo: dados.vinculo }),
    criadoEm: momento,
    atualizadoEm: momento,
  }
  await db.notes.add(nota)
  return nota
}

export async function atualizarNota(id: string, mudancas: { titulo?: string; conteudo?: string }) {
  await db.notes.update(id, { ...mudancas, atualizadoEm: agora() })
}

/** Liga a nota a outro alvo; sem `vinculo`, ela vira avulsa. */
export async function vincularNota(id: string, vinculo: Vinculo | undefined) {
  await db.notes.update(id, { vinculo, atualizadoEm: agora() })
}

/** Exclui a nota e os anexos dela. */
export async function excluirNota(id: string) {
  await db.transaction('rw', db.notes, db.attachments, async () => {
    await excluirAnexosDe([{ tipo: 'note', id }])
    await db.notes.delete(id)
  })
}

/**
 * Passa as notas de um alvo para outro (tarefa ↔ item ao colocar no grupo / tirar do grupo).
 * Roda dentro da transação de quem chama.
 */
export async function trocarVinculoDasNotas(de: Vinculo, para: Vinculo) {
  await db.notes
    .where('[vinculo.tipo+vinculo.id]')
    .equals([de.tipo, de.id])
    .modify((nota) => {
      nota.vinculo = para
    })
}

/** O alvo ainda existe? Item = algum item da cadeia ainda existe. */
async function existeAlvo(vinculo: Vinculo) {
  if (vinculo.tipo === 'tarefa') return (await db.tasks.get(vinculo.id)) !== undefined
  if (vinculo.tipo === 'grupo') return (await db.groupSeries.get(vinculo.id)) !== undefined
  return (await db.groupItems.where('cadeiaId').equals(vinculo.id).count()) > 0
}

function semRepetir(vinculos: Vinculo[]) {
  return [...new Map(vinculos.map((vinculo) => [chaveDoVinculo(vinculo), vinculo])).values()]
}

/**
 * Depois de excluir: as notas de alvos que deixaram de existir viram avulsas (nunca são
 * apagadas). Roda dentro da transação de quem chama (com `notes`, `tasks`, `groupSeries` e
 * `groupItems`).
 */
export async function soltarNotasSemAlvo(candidatos: Vinculo[]) {
  for (const vinculo of semRepetir(candidatos)) {
    if (await existeAlvo(vinculo)) continue
    await db.notes
      .where('[vinculo.tipo+vinculo.id]')
      .equals([vinculo.tipo, vinculo.id])
      .modify((nota) => {
        delete nota.vinculo
      })
  }
}

/** O que vai ser excluído, para avisar antes quantas notas ficarão avulsas. */
export type AlvoDeExclusao =
  { tipo: 'tarefa'; id: string } | { tipo: 'item'; id: string } | { tipo: 'card'; id: string }

/**
 * Quantas notas ficam avulsas se o alvo for excluído. Item: só se for o último da cadeia
 * (senão as notas continuam nos outros dias). Card: as do grupo, se for o último card da
 * série, e as dos itens que só existem nele.
 */
export async function contarNotasQueFicamAvulsas(alvo: AlvoDeExclusao) {
  if (alvo.tipo === 'tarefa') return contarNotasDe({ tipo: 'tarefa', id: alvo.id })
  if (alvo.tipo === 'item') {
    const item = await db.groupItems.get(alvo.id)
    if (!item) return 0
    const daCadeia = await db.groupItems.where('cadeiaId').equals(item.cadeiaId).count()
    return daCadeia > 1 ? 0 : contarNotasDe({ tipo: 'item', id: item.cadeiaId })
  }
  const card = await db.groupCards.get(alvo.id)
  if (!card) return 0
  const itens = await db.groupItems.where('cardId').equals(card.id).toArray()
  const cadeias = [...new Set(itens.map((item) => item.cadeiaId))]
  let total = 0
  for (const cadeiaId of cadeias) {
    const foraDoCard = await db.groupItems
      .where('cadeiaId')
      .equals(cadeiaId)
      .filter((item) => item.cardId !== card.id)
      .count()
    if (foraDoCard === 0) total += await contarNotasDe({ tipo: 'item', id: cadeiaId })
  }
  const outrosCards = await db.groupCards.where('seriesId').equals(card.seriesId).count()
  if (outrosCards <= 1) total += await contarNotasDe({ tipo: 'grupo', id: card.seriesId })
  return total
}

/**
 * Carrega o necessário para dizer a quem as notas pertencem: as tarefas, séries e cadeias
 * ligadas, os cards delas e as categorias.
 */
export async function carregarDadosDosVinculos(
  notas: Pick<Note, 'vinculo'>[],
): Promise<DadosDosVinculos> {
  const idsDe = (tipo: Vinculo['tipo']) => [
    ...new Set(notas.flatMap((nota) => (nota.vinculo?.tipo === tipo ? [nota.vinculo.id] : []))),
  ]
  const [tarefas, itens, categorias, subcategorias] = await Promise.all([
    db.tasks.bulkGet(idsDe('tarefa')),
    db.groupItems.where('cadeiaId').anyOf(idsDe('item')).toArray(),
    db.categories.toArray(),
    db.subcategories.toArray(),
  ])
  const cardsDosItens = await db.groupCards.bulkGet([...new Set(itens.map((item) => item.cardId))])
  const idsSeries = [
    ...new Set([
      ...idsDe('grupo'),
      ...cardsDosItens.flatMap((card) => (card ? [card.seriesId] : [])),
    ]),
  ]
  const [series, cards] = await Promise.all([
    db.groupSeries.bulkGet(idsSeries),
    db.groupCards.where('seriesId').anyOf(idsSeries).toArray(),
  ])
  return {
    tarefas: tarefas.filter((tarefa) => tarefa !== undefined),
    series: series.filter((serie) => serie !== undefined),
    cards,
    itens,
    categorias: montarCategorias(categorias, subcategorias),
  }
}

/** Tudo o que pode receber uma nota ("Vincular a…"): tarefas, grupos e itens não arquivados. */
export async function carregarAlvosParaVincular(): Promise<DadosDosVinculos> {
  const [tarefas, series, cards, itens, categorias, subcategorias] = await Promise.all([
    db.tasks.filter((tarefa) => tarefa.status !== 'arquivada').toArray(),
    db.groupSeries.toArray(),
    db.groupCards.toArray(),
    db.groupItems.toArray(),
    db.categories.toArray(),
    db.subcategories.toArray(),
  ])
  return {
    tarefas,
    series,
    cards,
    itens: itens.filter((item: GroupItem) => item.status !== 'arquivado'),
    categorias: montarCategorias(categorias, subcategorias),
  }
}

/** Tipos de anexo de cada nota (para os ícones do cartão), sem carregar os arquivos. */
export async function tiposDeAnexoDasNotas(ids: string[]) {
  const tipos = new Map<string, Set<TipoAnexo>>()
  if (ids.length === 0) return tipos
  await db.attachments
    .where('[dono.tipo+dono.id]')
    .anyOf(ids.map((id) => ['note', id]))
    .each((anexo) => {
      tipos.set(anexo.dono.id, (tipos.get(anexo.dono.id) ?? new Set()).add(anexo.tipo))
    })
  return tipos
}

/**
 * Apaga a nota se ela ficou em branco (sem título, texto nem anexo): "Adicionar nota" e
 * fechado sem escrever não deixa nota vazia para trás.
 */
export async function descartarSeVazia(id: string) {
  await db.transaction('rw', db.notes, db.attachments, async () => {
    const nota = await db.notes.get(id)
    if (!nota || nota.titulo.trim() || nota.conteudo.trim()) return
    const anexos = await db.attachments.where('[dono.tipo+dono.id]').equals(['note', id]).count()
    if (anexos === 0) await db.notes.delete(id)
  })
}

/** Quantas notas cada alvo tem (chave de `chaveDoVinculo`), para os indicadores do app. */
export async function contarNotasPorVinculo() {
  const contagem = new Map<string, number>()
  await db.notes.each((nota) => {
    if (!nota.vinculo || nota.arquivado) return
    const chave = chaveDoVinculo(nota.vinculo)
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1)
  })
  return contagem
}
