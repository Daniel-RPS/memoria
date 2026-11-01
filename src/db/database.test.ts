import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoriaDatabase } from '@/db/database'

describe('MemoriaDatabase', () => {
  const banco = new MemoriaDatabase('memoria-teste')

  afterEach(async () => {
    await banco.delete()
  })

  it('grava e busca tarefas do dia em ordem', async () => {
    const base = { criadoEm: '', atualizadoEm: '', status: 'pendente' as const }
    await banco.tasks.bulkAdd([
      { ...base, id: 'b', titulo: 'B', data: '2026-10-30', dataOriginal: '2026-10-30', ordem: 2 },
      { ...base, id: 'a', titulo: 'A', data: '2026-10-30', dataOriginal: '2026-10-30', ordem: 1 },
      { ...base, id: 'c', titulo: 'C', data: '2026-10-31', dataOriginal: '2026-10-31', ordem: 1.5 },
    ])

    const doDia = await banco.tasks
      .where('[data+ordem]')
      .between(['2026-10-30', -Infinity], ['2026-10-30', Infinity])
      .toArray()

    expect(doDia.map((tarefa) => tarefa.id)).toEqual(['a', 'b'])
  })

  it('v8: preenche a ordem das categorias e subcategorias sem perder dados', async () => {
    // Banco como estava na v7 (sem `ordem`).
    const antigo = new Dexie('memoria-teste')
    antigo.version(7).stores({
      categories: 'id, nome',
      subcategories: 'id, categoryId',
      tasks: 'id, data, [data+ordem], status, categoryId, dataOriginal',
      subtasks: 'id, taskId, [taskId+ordem]',
      procedures: 'id, titulo, categoryId',
      notes: 'id, [dono.tipo+dono.id]',
      attachments: 'id, [dono.tipo+dono.id]',
      groupSeries: 'id, titulo, categoryId',
      groupCards: 'id, seriesId, data, [seriesId+data]',
      groupItems: 'id, cardId, status, origemItemId',
    })
    const base = { atualizadoEm: 'x' }
    await antigo.table('categories').bulkAdd([
      { ...base, id: 't', nome: 'Trabalho', cor: '#c8402f', criadoEm: '1' },
      { ...base, id: 'c', nome: 'casa', cor: '#3366c2', criadoEm: '2' },
    ])
    await antigo.table('subcategories').bulkAdd([
      { ...base, id: 's2', categoryId: 'c', nome: 'Antiga', criadoEm: '3' },
      { ...base, id: 's1', categoryId: 'c', nome: 'Zebra', cor: '#2f8a57', criadoEm: '1' },
    ])
    await antigo.table('tasks').add({
      ...base,
      id: 'tarefa',
      titulo: 'Varrer',
      data: '2026-11-01',
      dataOriginal: '2026-11-01',
      ordem: 1,
      status: 'pendente',
      categoryId: 'c',
      subcategoryId: 's1',
      criadoEm: '',
    })
    antigo.close()

    await banco.open()
    const categorias = await banco.categories.toCollection().sortBy('ordem')
    expect(categorias).toEqual([
      { ...base, id: 'c', nome: 'casa', cor: '#3366c2', criadoEm: '2', ordem: 1 },
      { ...base, id: 't', nome: 'Trabalho', cor: '#c8402f', criadoEm: '1', ordem: 2 },
    ])
    expect(await banco.subcategories.get('s1')).toMatchObject({
      nome: 'Zebra',
      cor: '#2f8a57',
      ordem: 1,
    })
    expect(await banco.subcategories.get('s2')).toMatchObject({ nome: 'Antiga', ordem: 2 })
    expect(await banco.tasks.get('tarefa')).toMatchObject({ categoryId: 'c', subcategoryId: 's1' })
  })
})
