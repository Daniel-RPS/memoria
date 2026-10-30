import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import {
  criarSubtarefa,
  definirConclusaoSubtarefa,
  excluirSubtarefa,
  listarSubtarefas,
  renomearSubtarefa,
  reordenarSubtarefa,
} from '@/db/repositories/subtask-repository'
import { criarTarefa } from '@/db/repositories/task-repository'

async function titulosDe(taskId: string) {
  const subtarefas = await db.subtasks.where('taskId').equals(taskId).sortBy('ordem')
  return subtarefas.map((subtarefa) => subtarefa.titulo)
}

describe('subtask-repository', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('cria subtarefas no fim, separadas por tarefa', async () => {
    const tarefa = await criarTarefa({ titulo: 'Mudança', data: '2026-10-30' })
    const outra = await criarTarefa({ titulo: 'Outra', data: '2026-10-30' })
    await criarSubtarefa({ taskId: tarefa.id, titulo: 'Caixas' })
    const fita = await criarSubtarefa({ taskId: tarefa.id, titulo: ' Fita ' })
    await criarSubtarefa({ taskId: outra.id, titulo: 'Sozinha' })

    expect(fita).toMatchObject({ titulo: 'Fita', concluida: false, ordem: 2 })
    expect(await titulosDe(tarefa.id)).toEqual(['Caixas', 'Fita'])
    expect(await listarSubtarefas([tarefa.id, outra.id])).toHaveLength(3)
  })

  it('conclui, desmarca, renomeia e exclui', async () => {
    const tarefa = await criarTarefa({ titulo: 'Viagem', data: '2026-10-30' })
    const subtarefa = await criarSubtarefa({ taskId: tarefa.id, titulo: 'Passaporte' })

    await definirConclusaoSubtarefa(subtarefa.id, true)
    expect((await db.subtasks.get(subtarefa.id))?.concluida).toBe(true)
    await definirConclusaoSubtarefa(subtarefa.id, false)
    expect((await db.subtasks.get(subtarefa.id))?.concluida).toBe(false)

    await renomearSubtarefa(subtarefa.id, 'Renovar passaporte')
    expect((await db.subtasks.get(subtarefa.id))?.titulo).toBe('Renovar passaporte')

    await excluirSubtarefa(subtarefa.id)
    expect(await db.subtasks.count()).toBe(0)
  })

  it('reordena gravando só a subtarefa movida', async () => {
    const tarefa = await criarTarefa({ titulo: 'Servidor', data: '2026-10-30' })
    const a = await criarSubtarefa({ taskId: tarefa.id, titulo: 'A' })
    const b = await criarSubtarefa({ taskId: tarefa.id, titulo: 'B' })
    const c = await criarSubtarefa({ taskId: tarefa.id, titulo: 'C' })

    await reordenarSubtarefa([c.id, a.id, b.id], c.id)

    expect(await titulosDe(tarefa.id)).toEqual(['C', 'A', 'B'])
    expect((await db.subtasks.get(c.id))?.ordem).toBe(0)
    expect((await db.subtasks.get(b.id))?.ordem).toBe(2)
  })
})
