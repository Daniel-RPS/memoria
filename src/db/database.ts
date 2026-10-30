import Dexie, { type EntityTable } from 'dexie'
import type {
  Attachment,
  Category,
  Execution,
  Note,
  Procedure,
  ProcedureVersion,
  Subcategory,
  Subtask,
  Task,
} from '@/db/types'

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
  }
}

export const db = new MemoriaDatabase()
