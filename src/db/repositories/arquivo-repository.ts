import { format } from 'date-fns'
import { db } from '@/db/database'
import type { DataLocal, GroupCard, GroupItem, Note, Procedure, Task } from '@/db/types'
import { listarCategorias } from '@/db/repositories/category-repository'
import { excluirGrupo, excluirItem } from '@/db/repositories/group-repository'
import { carregarDadosDosVinculos, excluirNota } from '@/db/repositories/note-repository'
import { agora } from '@/db/repositories/ordenacao'
import { excluirProcedimento } from '@/db/repositories/procedure-repository'
import { excluirTarefa, maiorOrdemDoDia } from '@/db/repositories/task-repository'
import { semAndamento } from '@/lib/andamento'
import type { Alvos, DadosDoArquivo } from '@/lib/arquivados'
import { deDataLocal } from '@/lib/datas'
import { ErroDeValidacao } from '@/lib/erros'

/*
 * Arquivar, desarquivar, excluir e listar os arquivados. As regras de montar a tela ficam em
 * `lib/arquivados`; aqui só se lê e se grava. Nada aqui apaga ao arquivar: o registro continua
 * no banco, só marcado.
 */

/** Um dia para todos, ou uma regra que dá o dia de cada um a partir do dia que tinha. */
export type DestinoDoDesarquivar = DataLocal | ((diaAtual: DataLocal) => DataLocal)

/** Como os registros estavam antes da ação: é o que o "Desfazer" devolve. */
export interface EstadoAnterior {
  tarefas: Task[]
  cards: GroupCard[]
  itens: GroupItem[]
  notas: Note[]
  procedimentos: Procedure[]
  /** Itens dos cards arquivados que estavam em andamento (a marca sai ao arquivar o card). */
  itensEmAndamento?: GroupItem[]
}

const TABELAS = [
  db.tasks,
  db.subtasks,
  db.groupSeries,
  db.groupCards,
  db.groupItems,
  db.notes,
  db.procedures,
]

function existentes<T>(lista: (T | undefined)[]) {
  return lista.filter((registro): registro is T => registro !== undefined)
}

async function lerAnteriores(alvos: Alvos): Promise<EstadoAnterior> {
  const [tarefas, cards, itens, notas, procedimentos] = await Promise.all([
    db.tasks.bulkGet(alvos.tarefas ?? []),
    db.groupCards.bulkGet(alvos.cards ?? []),
    db.groupItems.bulkGet(alvos.itens ?? []),
    db.notes.bulkGet(alvos.notas ?? []),
    db.procedures.bulkGet(alvos.procedimentos ?? []),
  ])
  return {
    tarefas: existentes(tarefas),
    cards: existentes(cards),
    itens: existentes(itens),
    notas: existentes(notas),
    procedimentos: existentes(procedimentos),
  }
}

/** Tira do caminho sem apagar: marca cada registro e guarda quando. Devolve o estado anterior. */
export async function arquivar(alvos: Alvos): Promise<EstadoAnterior> {
  return db.transaction('rw', TABELAS, async () => {
    const anteriores = await lerAnteriores(alvos)
    const momento = agora()
    const quando = { arquivadoEm: momento, atualizadoEm: momento }
    // Arquivado não é "o que estou fazendo agora": a marca de andamento sai.
    await db.tasks.bulkPut(
      anteriores.tarefas.map((tarefa) =>
        semAndamento({ ...tarefa, status: 'arquivada' as const, ...quando }),
      ),
    )
    await db.groupCards.bulkPut(
      anteriores.cards.map((card) => ({ ...card, arquivado: true, ...quando })),
    )
    await db.groupItems.bulkPut(
      anteriores.itens.map((item) =>
        semAndamento({ ...item, status: 'arquivado' as const, ...quando }),
      ),
    )
    const itensEmAndamento = await db.groupItems
      .where('cardId')
      .anyOf(anteriores.cards.map((card) => card.id))
      .filter((item) => item.emAndamento === true)
      .toArray()
    await db.groupItems.bulkPut(itensEmAndamento.map(semAndamento))
    anteriores.itensEmAndamento = itensEmAndamento
    await db.notes.bulkPut(
      anteriores.notas.map((nota) => ({ ...nota, arquivado: true, ...quando })),
    )
    await db.procedures.bulkPut(
      anteriores.procedimentos.map((procedimento) => ({
        ...procedimento,
        arquivado: true,
        ...quando,
      })),
    )
    return anteriores
  })
}

/**
 * Traz de volta. Nota e procedimento voltam para o mesmo lugar (a categoria nunca mudou).
 * Tarefa solta e card de grupo voltam para `destino` (sem ele, o dia que tinham) no fim do
 * dia; só `data` e `ordem` mudam, nunca `dataOriginal`. Um grupo não pode voltar para um dia em
 * que a série dele já tem card: lança `ErroDeValidacao`. Devolve o estado anterior.
 */
export async function desarquivar(
  alvos: Alvos,
  destino?: DestinoDoDesarquivar,
): Promise<EstadoAnterior> {
  return db.transaction('rw', TABELAS, async () => {
    const anteriores = await lerAnteriores(alvos)
    const diaDe = (atual: DataLocal) =>
      typeof destino === 'function' ? destino(atual) : (destino ?? atual)
    const momento = agora()
    const ordens = new Map<DataLocal, number>()
    const proximaOrdem = async (data: DataLocal) => {
      const atual = ordens.get(data) ?? (await maiorOrdemDoDia(data))
      ordens.set(data, atual + 1)
      return atual + 1
    }

    for (const tarefa of anteriores.tarefas) {
      const data = diaDe(tarefa.data)
      await db.tasks.put({
        ...tarefa,
        status: tarefa.concluidaEm ? 'concluida' : 'pendente',
        arquivadoEm: undefined,
        data,
        ordem: await proximaOrdem(data),
        atualizadoEm: momento,
      })
    }

    for (const card of anteriores.cards) {
      const data = diaDe(card.data)
      const doDia = await db.groupCards
        .where('[seriesId+data]')
        .equals([card.seriesId, data])
        .toArray()
      if (doDia.some((outro) => outro.id !== card.id)) {
        const serie = await db.groupSeries.get(card.seriesId)
        throw new ErroDeValidacao(
          `Já existe o grupo “${serie?.titulo ?? ''}” em ${format(deDataLocal(data), 'dd/MM')}. Escolha outro dia.`,
        )
      }
      await db.groupCards.put({
        ...card,
        arquivado: false,
        arquivadoEm: undefined,
        data,
        ordem: await proximaOrdem(data),
        atualizadoEm: momento,
      })
    }

    await db.groupItems.bulkPut(
      anteriores.itens.map((item) => ({
        ...item,
        status: item.concluidoEm ? ('concluido' as const) : ('pendente' as const),
        arquivadoEm: undefined,
        atualizadoEm: momento,
      })),
    )
    await db.notes.bulkPut(
      anteriores.notas.map((nota) => ({
        ...nota,
        arquivado: false,
        arquivadoEm: undefined,
        atualizadoEm: momento,
      })),
    )
    await db.procedures.bulkPut(
      anteriores.procedimentos.map((procedimento) => ({
        ...procedimento,
        arquivado: false,
        arquivadoEm: undefined,
        atualizadoEm: momento,
      })),
    )
    return anteriores
  })
}

/** Devolve os registros ao estado de antes (o "Desfazer" de arquivar e de desarquivar). */
export async function restaurarEstado(anteriores: EstadoAnterior) {
  await db.transaction('rw', TABELAS, async () => {
    await db.tasks.bulkPut(anteriores.tarefas)
    await db.groupCards.bulkPut(anteriores.cards)
    await db.groupItems.bulkPut(anteriores.itens)
    await db.groupItems.bulkPut(anteriores.itensEmAndamento ?? [])
    await db.notes.bulkPut(anteriores.notas)
    await db.procedures.bulkPut(anteriores.procedimentos)
  })
}

/**
 * Exclusão definitiva, com as mesmas regras de excluir pelo calendário: notas de tarefa ou grupo
 * excluídos ficam avulsas, e os anexos de tarefa e nota excluídas são apagados.
 */
export async function excluirDefinitivamente(alvos: Alvos) {
  for (const id of alvos.tarefas ?? []) await excluirTarefa(id)
  for (const id of alvos.cards ?? []) await excluirGrupo(id)
  for (const id of alvos.itens ?? []) await excluirItem(id)
  for (const id of alvos.notas ?? []) await excluirNota(id)
  for (const id of alvos.procedimentos ?? []) await excluirProcedimento(id)
}

/** Registros arquivados com o necessário para descrevê-los (ver `montarArquivados`). */
export async function carregarArquivados(): Promise<DadosDoArquivo> {
  const [tarefas, itensArquivados, cardsArquivados, notas, procedimentos] = await Promise.all([
    db.tasks.where('status').equals('arquivada').toArray(),
    db.groupItems.where('status').equals('arquivado').toArray(),
    db.groupCards.filter((card) => card.arquivado).toArray(),
    db.notes.filter((nota) => nota.arquivado === true).toArray(),
    db.procedures.filter((procedimento) => procedimento.arquivado === true).toArray(),
  ])
  const idsCards = [
    ...new Set([
      ...cardsArquivados.map((card) => card.id),
      ...itensArquivados.map((i) => i.cardId),
    ]),
  ]
  const cards = existentes(await db.groupCards.bulkGet(idsCards))
  const [itens, subtarefas, series, vinculos, categorias] = await Promise.all([
    db.groupItems.where('cardId').anyOf(idsCards).toArray(),
    db.subtasks
      .where('taskId')
      .anyOf(tarefas.map((tarefa) => tarefa.id))
      .toArray(),
    db.groupSeries.bulkGet([...new Set(cards.map((card) => card.seriesId))]),
    carregarDadosDosVinculos(notas),
    listarCategorias(),
  ])
  return {
    tarefas,
    subtarefas,
    series: existentes(series),
    cards,
    itens,
    notas,
    procedimentos,
    vinculos,
    categorias,
  }
}

/** Quantos itens há em Arquivados (o mesmo que a lista mostra), para o contador da barra. */
export async function contarArquivados() {
  const [tarefas, cardsArquivados, itensArquivados, notas, procedimentos] = await Promise.all([
    db.tasks.where('status').equals('arquivada').count(),
    db.groupCards.filter((card) => card.arquivado).count(),
    db.groupItems.where('status').equals('arquivado').toArray(),
    db.notes.filter((nota) => nota.arquivado === true).count(),
    db.procedures.filter((procedimento) => procedimento.arquivado === true).count(),
  ])
  // Itens arquivados sozinhos contam uma vez por card que continua no calendário.
  const cards = existentes(
    await db.groupCards.bulkGet([...new Set(itensArquivados.map((i) => i.cardId))]),
  )
  const cardsComItens = cards.filter((card) => !card.arquivado).length
  return tarefas + cardsArquivados + cardsComItens + notas + procedimentos
}
