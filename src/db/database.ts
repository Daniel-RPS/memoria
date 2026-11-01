import Dexie, { type EntityTable } from 'dexie'
import type {
  Attachment,
  Category,
  GroupCard,
  GroupItem,
  GroupSeries,
  Note,
  Procedure,
  Subcategory,
  Subtask,
  Task,
} from '@/db/types'
import { preencherOrdem } from '@/lib/categorias'
import { converterGruposAntigos, type CardAntigo, type TarefaAntiga } from '@/lib/migracao-grupos'
import { converterProcedimentoAntigo, type ProcedimentoAntigo } from '@/lib/migracao-procedimentos'

/**
 * Banco local (IndexedDB). Componentes NUNCA usam esta instância direto:
 * leitura e escrita passam por `db/repositories`.
 */
export class MemoriaDatabase extends Dexie {
  categories!: EntityTable<Category, 'id'>
  subcategories!: EntityTable<Subcategory, 'id'>
  tasks!: EntityTable<Task, 'id'>
  subtasks!: EntityTable<Subtask, 'id'>
  procedures!: EntityTable<Procedure, 'id'>
  notes!: EntityTable<Note, 'id'>
  attachments!: EntityTable<Attachment, 'id'>
  groupSeries!: EntityTable<GroupSeries, 'id'>
  groupCards!: EntityTable<GroupCard, 'id'>
  groupItems!: EntityTable<GroupItem, 'id'>

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
    // v8: categorias e subcategorias ganham `ordem` (sem índice; ordenadas em memória).
    // As existentes ficam na ordem mostrada antes: categorias por nome, subcategorias por criação.
    this.version(8)
      .stores({})
      .upgrade(async (transacao) => {
        const { categorias, subcategorias } = preencherOrdem(
          await transacao.table('categories').toArray(),
          await transacao.table('subcategories').toArray(),
        )
        await transacao.table('categories').bulkPut(categorias)
        await transacao.table('subcategories').bulkPut(subcategorias)
      })
  }
}

export const db = new MemoriaDatabase()
