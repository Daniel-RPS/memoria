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
})
