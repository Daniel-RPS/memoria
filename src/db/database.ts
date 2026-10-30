import Dexie, { type EntityTable } from 'dexie'
import type {
  Attachment,
  Category,
  Execution,
  GroupCard,
  GroupItem,
  GroupSeries,
  Note,
  Procedure,
  ProcedureVersion,
  Subcategory,
  Subtask,
  Task,
} from '@/db/types'
import { converterGruposAntigos, type CardAntigo, type TarefaAntiga } from '@/lib/migracao-grupos'

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
  procedureVersions!: EntityTable<ProcedureVersion, 'id'>
  executions!: EntityTable<Execution, 'id'>
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
  }
}

export const db = new MemoriaDatabase()
