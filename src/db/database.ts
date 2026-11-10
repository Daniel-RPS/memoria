import Dexie, { type EntityTable } from 'dexie'
import type {
  Attachment,
  Category,
  GroupCard,
  GroupItem,
  GroupSeries,
  Note,
  Procedure,
  Subtask,
  Task,
  TimeSession,
} from '@/db/types'
import {
  maesDasSubcategorias,
  preencherOrdem,
  religarACategoriaMae,
  separarPorTipo,
} from '@/lib/categorias'
import { preencherCadeias } from '@/lib/grupos'
import { converterGruposAntigos, type CardAntigo, type TarefaAntiga } from '@/lib/migracao-grupos'
import { converterProcedimentoAntigo, type ProcedimentoAntigo } from '@/lib/migracao-procedimentos'
import { converterNotaAntiga, type NotaAntiga } from '@/lib/notas'

/**
 * Banco local (IndexedDB). Componentes NUNCA usam esta instância direto:
 * leitura e escrita passam por `db/repositories`.
 */
export class MemoriaDatabase extends Dexie {
  categories!: EntityTable<Category, 'id'>
  tasks!: EntityTable<Task, 'id'>
  subtasks!: EntityTable<Subtask, 'id'>
  procedures!: EntityTable<Procedure, 'id'>
  notes!: EntityTable<Note, 'id'>
  attachments!: EntityTable<Attachment, 'id'>
  groupSeries!: EntityTable<GroupSeries, 'id'>
  groupCards!: EntityTable<GroupCard, 'id'>
  groupItems!: EntityTable<GroupItem, 'id'>
  sessions!: EntityTable<TimeSession, 'id'>

  constructor(nome = 'memoria') {
    super(nome)
    this.version(1).stores({
      categories: 'id, nome',
      subcategories: 'id, categoryId',
      tasks: 'id, data, [data+ordem], status, categoryId, dataOriginal',
      subtasks: 'id, taskId, [taskId+ordem]',
      procedures: 'id, titulo, categoryId',
      procedureVersions: 'id, procedureId, [procedureId+versao]',
      executions: 'id, procedureId, data, taskId',
      notes: 'id, [dono.tipo+dono.id]',
      attachments: 'id, [dono.tipo+dono.id]',
    })
    // v2: tarefas ligadas a procedimentos. Só acrescenta índice; dados existentes ficam como estão.
    this.version(2).stores({
      tasks: 'id, data, [data+ordem], status, categoryId, dataOriginal, procedureId',
    })
    // v3: primeira versão dos grupos (itens eram tarefas com `groupInstanceId`).
    this.version(3).stores({
      tasks:
        'id, data, [data+ordem], status, categoryId, dataOriginal, procedureId, groupInstanceId',
      groupSeries: 'id, titulo, categoryId',
      groupInstances: 'id, seriesId, data, [seriesId+data]',
    })
    // v4: grupos como entidade própria (cards e itens). Converte os da v3; os extras das
    // tarefas convertidas (subtarefas, anotação, anexos) não existem em itens e são apagados.
    this.version(4)
      .stores({
        groupCards: 'id, seriesId, data, [seriesId+data]',
        groupItems: 'id, cardId, status, origemItemId',
      })
      .upgrade(async (transacao) => {
        const instancias = (await transacao.table('groupInstances').toArray()) as CardAntigo[]
        const tarefas = (await transacao
          .table('tasks')
          .filter((tarefa: TarefaAntiga) => tarefa.groupInstanceId !== undefined)
          .toArray()) as TarefaAntiga[]
        if (instancias.length === 0 && tarefas.length === 0) return
        const { cards, itens, soltas } = converterGruposAntigos(instancias, tarefas)
        const idsItens = itens.map((item) => item.id)
        const donos = idsItens.map((id) => ['task', id])
        await transacao.table('groupCards').bulkAdd(cards)
        await transacao.table('groupItems').bulkAdd(itens)
        await transacao.table('tasks').bulkDelete(idsItens)
        await transacao.table('tasks').bulkPut(soltas)
        await transacao.table('subtasks').where('taskId').anyOf(idsItens).delete()
        await transacao.table('notes').where('[dono.tipo+dono.id]').anyOf(donos).delete()
        await transacao.table('attachments').where('[dono.tipo+dono.id]').anyOf(donos).delete()
      })
    // v5: some a tabela e o índice do modelo anterior.
    this.version(5).stores({
      tasks: 'id, data, [data+ordem], status, categoryId, dataOriginal, procedureId',
      groupInstances: null,
    })
    // v6: `GroupCard.criadoPorTransferencia` (sem índice). Card que só tem cópias de outro dia
    // nasceu de uma transferência.
    this.version(6)
      .stores({})
      .upgrade(async (transacao) => {
        const itens = (await transacao.table('groupItems').toArray()) as GroupItem[]
        const itensPorCard = new Map<string, GroupItem[]>()
        for (const item of itens) {
          itensPorCard.set(item.cardId, [...(itensPorCard.get(item.cardId) ?? []), item])
        }
        await transacao
          .table('groupCards')
          .toCollection()
          .modify((card: GroupCard) => {
            const doCard = itensPorCard.get(card.id) ?? []
            card.criadoPorTransferencia =
              doCard.length > 0 && doCard.every((item) => item.origemItemId !== undefined)
          })
      })
    // v7: procedimento vira título, categoria e etapas. Converte os existentes e apaga o que
    // saiu do modelo: versões, execuções, vínculo das tarefas e anexos/anotações de
    // procedimento e de passo.
    this.version(7)
      .stores({
        tasks: 'id, data, [data+ordem], status, categoryId, dataOriginal',
        procedureVersions: null,
        executions: null,
      })
      .upgrade(async (transacao) => {
        const antigos = (await transacao.table('procedures').toArray()) as ProcedimentoAntigo[]
        await transacao.table('procedures').bulkPut(antigos.map(converterProcedimentoAntigo))
        await transacao
          .table('tasks')
          .filter((tarefa: object) => 'procedureId' in tarefa)
          .modify((tarefa: { procedureId?: string }) => {
            delete tarefa.procedureId
          })
        const isDonoRemovido = (registro: { dono?: { tipo: string } }) =>
          registro.dono?.tipo === 'procedure' || registro.dono?.tipo === 'step'
        await transacao.table('notes').filter(isDonoRemovido).delete()
        await transacao.table('attachments').filter(isDonoRemovido).delete()
      })
    // v8: categorias ganham `ordem` (sem índice; ordenadas em memória), na ordem mostrada antes.
    this.version(8)
      .stores({})
      .upgrade(async (transacao) => {
        await transacao
          .table('categories')
          .bulkPut(preencherOrdem(await transacao.table('categories').toArray()))
      })
    // v9: categorias ganham `tipo` (grupo ou procedimento; sem índice), classificadas pelo uso.
    // Usada pelos dois vira duas: a cópia leva os procedimentos.
    this.version(9)
      .stores({})
      .upgrade(async (transacao) => {
        const [categorias, tarefas, grupos, procedimentos] = await Promise.all(
          ['categories', 'tasks', 'groupSeries', 'procedures'].map((nome) =>
            transacao.table(nome).toArray(),
          ),
        )
        const separado = separarPorTipo({
          categorias,
          tarefas,
          grupos,
          procedimentos: procedimentos as Procedure[],
        })
        await transacao.table('categories').bulkPut(separado.categorias)
        await transacao
          .table('procedures')
          .bulkPut(separado.procedimentos.filter((item, indice) => item !== procedimentos[indice]))
      })
    // v10: notas ligadas a tarefa, grupo ou item (`vinculo`, no lugar de `dono`) e itens com
    // `cadeiaId`. A anotação da tarefa vira nota ligada a ela; as outras ficam avulsas.
    this.version(10)
      .stores({
        notes: 'id, [vinculo.tipo+vinculo.id]',
        groupItems: 'id, cardId, status, origemItemId, cadeiaId',
      })
      .upgrade(async (transacao) => {
        const itens = (await transacao.table('groupItems').toArray()) as GroupItem[]
        await transacao.table('groupItems').bulkPut(preencherCadeias(itens))
        const idsTarefas = new Set(
          (await transacao.table('tasks').toCollection().primaryKeys()) as string[],
        )
        const notas = (await transacao.table('notes').toArray()) as NotaAntiga[]
        await transacao
          .table('notes')
          .bulkPut(notas.map((nota) => converterNotaAntiga(nota, idsTarefas)))
      })
    // v11: `arquivadoEm` (data da migração) em tarefas, cards e itens que já estavam arquivados.
    // Nota e procedimento ganham `arquivado` só ao arquivar (ausente = não arquivado).
    // Nenhum índice novo.
    this.version(11)
      .stores({})
      .upgrade(async (transacao) => {
        const momento = new Date().toISOString()
        await transacao
          .table('tasks')
          .filter((tarefa: Task) => tarefa.status === 'arquivada' && !tarefa.arquivadoEm)
          .modify({ arquivadoEm: momento })
        await transacao
          .table('groupCards')
          .filter((card: GroupCard) => card.arquivado && !card.arquivadoEm)
          .modify({ arquivadoEm: momento })
        await transacao
          .table('groupItems')
          .filter((item: GroupItem) => item.status === 'arquivado' && !item.arquivadoEm)
          .modify({ arquivadoEm: momento })
      })
    // v12: tabela `sessions` para medir tempo em andamento. Tarefa ou item que já está em
    // andamento no momento da migração ganha uma sessão aberta começando em `emAndamentoDesde`.
    this.version(12)
      .stores({
        sessions: 'id, tarefaId, itemId, cadeiaId, grupoId, categoryId, inicio',
      })
      .upgrade(async (transacao) => {
        const momento = new Date().toISOString()
        const [tarefas, itens, cards, series] = await Promise.all([
          transacao
            .table('tasks')
            .filter((tarefa: Task) => tarefa.emAndamento === true)
            .toArray() as Promise<Task[]>,
          transacao
            .table('groupItems')
            .filter((item: GroupItem) => item.emAndamento === true)
            .toArray() as Promise<GroupItem[]>,
          transacao.table('groupCards').toArray() as Promise<GroupCard[]>,
          transacao.table('groupSeries').toArray() as Promise<GroupSeries[]>,
        ])
        const cardPorId = new Map(cards.map((card) => [card.id, card]))
        const seriePorId = new Map(series.map((serie) => [serie.id, serie]))
        const sessoes: TimeSession[] = [
          ...tarefas.map((tarefa): TimeSession => ({
            id: crypto.randomUUID(),
            tarefaId: tarefa.id,
            ...(tarefa.categoryId ? { categoryId: tarefa.categoryId } : {}),
            inicio: tarefa.emAndamentoDesde ?? momento,
            criadoEm: momento,
            atualizadoEm: momento,
          })),
          ...itens.map((item): TimeSession => {
            const card = cardPorId.get(item.cardId)
            const serie = card ? seriePorId.get(card.seriesId) : undefined
            return {
              id: crypto.randomUUID(),
              itemId: item.id,
              cadeiaId: item.cadeiaId,
              ...(card ? { grupoId: card.seriesId } : {}),
              ...(serie?.categoryId ? { categoryId: serie.categoryId } : {}),
              inicio: item.emAndamentoDesde ?? momento,
              criadoEm: momento,
              atualizadoEm: momento,
            }
          }),
        ]
        if (sessoes.length > 0) {
          await transacao.table('sessions').bulkAdd(sessoes)
        }
      })
    // v13: sem subcategorias. Tarefas, grupos e procedimentos que usavam uma ficam na
    // categoria-mãe (`religarACategoriaMae`) e a tabela é apagada.
    this.version(13)
      .stores({ subcategories: null })
      .upgrade(async (transacao) => {
        const maeDe = maesDasSubcategorias(await transacao.table('subcategories').toArray())
        for (const tabela of ['tasks', 'groupSeries', 'procedures']) {
          await transacao
            .table(tabela)
            .filter((item: { subcategoryId?: string }) => 'subcategoryId' in item)
            .modify((item: { categoryId?: string; subcategoryId?: string }) => {
              const religado = religarACategoriaMae(item, maeDe)
              delete item.subcategoryId
              if (religado.categoryId) item.categoryId = religado.categoryId
            })
        }
      })
  }
}

export const db = new MemoriaDatabase()
