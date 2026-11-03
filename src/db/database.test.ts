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
      { ...base, id: 'c', nome: 'casa', cor: '#3366c2', criadoEm: '2', ordem: 1, tipo: 'grupo' },
      {
        ...base,
        id: 't',
        nome: 'Trabalho',
        cor: '#c8402f',
        criadoEm: '1',
        ordem: 2,
        tipo: 'grupo',
      },
    ])
    expect(await banco.subcategories.get('s1')).toMatchObject({
      nome: 'Zebra',
      cor: '#2f8a57',
      ordem: 1,
    })
    expect(await banco.subcategories.get('s2')).toMatchObject({ nome: 'Antiga', ordem: 2 })
    expect(await banco.tasks.get('tarefa')).toMatchObject({ categoryId: 'c', subcategoryId: 's1' })
  })

  it('v9: classifica as categorias pelo uso e divide a usada pelos dois tipos', async () => {
    // Banco como estava na v8 (sem `tipo`).
    const antigo = new Dexie('memoria-teste')
    antigo.version(8).stores({
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
    const base = { criadoEm: '1', atualizadoEm: '1' }
    await antigo.table('categories').bulkAdd([
      { ...base, id: 'github', nome: 'Github', cor: '#5b4fbf', ordem: 1 },
      { ...base, id: 'casa', nome: 'Casa', cor: '#2f8a57', ordem: 2 },
      { ...base, id: 'receitas', nome: 'Receitas', cor: '#d0702a', ordem: 3 },
      { ...base, id: 'vazia', nome: 'Vazia', cor: '#3366c2', ordem: 4 },
    ])
    await antigo
      .table('subcategories')
      .add({ ...base, id: 'acoes', categoryId: 'github', nome: 'Ações', ordem: 1 })
    await antigo
      .table('groupSeries')
      .add({ ...base, id: 'serie', titulo: 'pr', categoryId: 'github' })
    await antigo.table('tasks').add({
      ...base,
      id: 'tarefa',
      titulo: 'Varrer',
      data: '2026-11-01',
      dataOriginal: '2026-11-01',
      ordem: 1,
      status: 'pendente',
      categoryId: 'casa',
    })
    await antigo.table('procedures').bulkAdd([
      {
        ...base,
        id: 'p1',
        titulo: 'Publicar',
        categoryId: 'github',
        subcategoryId: 'acoes',
        etapas: [],
      },
      { ...base, id: 'p2', titulo: 'Bolo', categoryId: 'receitas', etapas: [] },
    ])
    antigo.close()

    await banco.open()
    const categorias = await banco.categories.toArray()
    const resumo = categorias.map(({ nome, tipo, ordem }) => `${tipo}:${ordem}:${nome}`).sort()
    expect(resumo).toEqual([
      'grupo:1:Github',
      'grupo:2:Casa',
      'grupo:3:Vazia',
      'procedimento:1:Github',
      'procedimento:2:Receitas',
    ])
    const copia = categorias.find((item) => item.nome === 'Github' && item.tipo === 'procedimento')
    const subcopia = await banco.subcategories
      .where('categoryId')
      .equals(copia?.id ?? '')
      .first()
    expect(subcopia).toMatchObject({ nome: 'Ações', ordem: 1 })
    expect(await banco.subcategories.get('acoes')).toMatchObject({ categoryId: 'github' })
    expect(await banco.procedures.get('p1')).toMatchObject({
      titulo: 'Publicar',
      categoryId: copia?.id,
      subcategoryId: subcopia?.id,
    })
    expect(await banco.procedures.get('p2')).toMatchObject({ categoryId: 'receitas' })
    expect(await banco.groupSeries.get('serie')).toMatchObject({ categoryId: 'github' })
    expect(await banco.tasks.get('tarefa')).toMatchObject({ categoryId: 'casa' })
  })

  it('v10: anotação de tarefa vira nota ligada, o resto fica avulsa; itens ganham cadeia', async () => {
    // Banco como estava na v9 (notas com `dono`, itens sem `cadeiaId`).
    const antigo = new Dexie('memoria-teste')
    antigo.version(9).stores({
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
    const base = { criadoEm: '1', atualizadoEm: '2' }
    await antigo.table('tasks').add({
      ...base,
      id: 'tarefa',
      titulo: 'Ligar',
      data: '2026-11-01',
      dataOriginal: '2026-11-01',
      ordem: 1,
      status: 'pendente',
    })
    await antigo.table('notes').bulkAdd([
      {
        ...base,
        id: 'anotacao',
        titulo: '',
        conteudo: 'Protocolo',
        dono: { tipo: 'task', id: 'tarefa' },
      },
      { ...base, id: 'orfa', titulo: '', conteudo: 'x', dono: { tipo: 'task', id: 'sumiu' } },
      { ...base, id: 'avulsa', titulo: 'Ideias', conteudo: 'texto' },
    ])
    await antigo.table('attachments').add({
      ...base,
      id: 'foto',
      dono: { tipo: 'note', id: 'avulsa' },
      tipo: 'foto',
      nome: 'F',
    })
    const item = { ...base, titulo: 'Deploy', ordem: 1, dataOriginal: '2026-11-01' }
    await antigo.table('groupItems').bulkAdd([
      { ...item, id: 'a', cardId: 'c1', status: 'transferido' },
      { ...item, id: 'b', cardId: 'c2', status: 'pendente', origemItemId: 'a' },
    ])
    antigo.close()

    await banco.open()
    expect(await banco.notes.get('anotacao')).toEqual({
      ...base,
      id: 'anotacao',
      titulo: '',
      conteudo: 'Protocolo',
      vinculo: { tipo: 'tarefa', id: 'tarefa' },
    })
    expect(await banco.notes.get('orfa')).toEqual({
      ...base,
      id: 'orfa',
      titulo: '',
      conteudo: 'x',
    })
    expect(await banco.notes.get('avulsa')).toEqual({
      ...base,
      id: 'avulsa',
      titulo: 'Ideias',
      conteudo: 'texto',
    })
    expect(await banco.attachments.get('foto')).toMatchObject({
      dono: { tipo: 'note', id: 'avulsa' },
    })
    expect(
      await banco.notes.where('[vinculo.tipo+vinculo.id]').equals(['tarefa', 'tarefa']).count(),
    ).toBe(1)
    expect(await banco.groupItems.where('cadeiaId').equals('a').primaryKeys()).toEqual(['a', 'b'])
  })

  it('v11: quem já estava arquivado ganha arquivadoEm; o resto fica como estava', async () => {
    // Banco como estava na v10 (sem `arquivadoEm`).
    const antigo = new Dexie('memoria-teste')
    antigo.version(10).stores({
      categories: 'id, nome',
      subcategories: 'id, categoryId',
      tasks: 'id, data, [data+ordem], status, categoryId, dataOriginal',
      subtasks: 'id, taskId, [taskId+ordem]',
      procedures: 'id, titulo, categoryId',
      notes: 'id, [vinculo.tipo+vinculo.id]',
      attachments: 'id, [dono.tipo+dono.id]',
      groupSeries: 'id, titulo, categoryId',
      groupCards: 'id, seriesId, data, [seriesId+data]',
      groupItems: 'id, cardId, status, origemItemId, cadeiaId',
    })
    const base = { criadoEm: '1', atualizadoEm: '2' }
    const tarefa = {
      ...base,
      titulo: 'T',
      data: '2026-10-28',
      dataOriginal: '2026-10-28',
      ordem: 1,
    }
    await antigo.table('tasks').bulkAdd([
      { ...tarefa, id: 'arquivada', status: 'arquivada' },
      { ...tarefa, id: 'pendente', status: 'pendente' },
    ])
    const card = { ...base, seriesId: 's', data: '2026-10-28', ordem: 1 }
    await antigo.table('groupCards').bulkAdd([
      { ...card, id: 'c1', arquivado: true },
      { ...card, id: 'c2', data: '2026-10-29', arquivado: false },
    ])
    const item = { ...base, titulo: 'i', ordem: 1, dataOriginal: '2026-10-28', cardId: 'c2' }
    await antigo.table('groupItems').bulkAdd([
      { ...item, id: 'i1', cadeiaId: 'i1', status: 'arquivado' },
      { ...item, id: 'i2', cadeiaId: 'i2', status: 'pendente' },
    ])
    await antigo.table('notes').add({ ...base, id: 'n', titulo: 'N', conteudo: 'x' })
    antigo.close()

    const antes = Date.now()
    await banco.open()
    for (const registro of [
      await banco.tasks.get('arquivada'),
      await banco.groupCards.get('c1'),
      await banco.groupItems.get('i1'),
    ]) {
      expect(Date.parse(registro?.arquivadoEm ?? '')).toBeGreaterThanOrEqual(antes - 1000)
    }
    expect((await banco.tasks.get('pendente'))?.arquivadoEm).toBeUndefined()
    expect((await banco.groupCards.get('c2'))?.arquivadoEm).toBeUndefined()
    expect((await banco.groupItems.get('i2'))?.arquivadoEm).toBeUndefined()
    expect(await banco.notes.get('n')).toEqual({ ...base, id: 'n', titulo: 'N', conteudo: 'x' })
    expect(banco.verno).toBe(11)
  })
})
