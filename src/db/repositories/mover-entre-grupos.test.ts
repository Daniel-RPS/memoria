import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { criarGrupo, criarItem, definirConclusaoItem } from '@/db/repositories/group-repository'
import { passarItemParaGrupoComDesfazer } from '@/db/repositories/lote-repository'
import { criarCategoria } from '@/db/repositories/category-repository'
import { criarSubtarefa } from '@/db/repositories/subtask-repository'
import { textoDaTrocaDeGrupo } from '@/domain/categoria-no-grupo'

const DIA = '2026-11-05'

async function cenario() {
  const casa = await criarCategoria({ nome: 'Casa', tipo: 'grupo' })
  const a = await criarGrupo({ titulo: 'A', data: DIA, categoryId: casa.id })
  const b = await criarGrupo({ titulo: 'B', data: DIA })
  const primeiro = await criarItem(a.id, 'Um')
  const item = await criarItem(a.id, 'Dois')
  await criarItem(b.id, 'Tres')
  return { a, b, primeiro, item }
}

describe('mover item direto entre grupos', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('preserva os campos, entra no fim do destino e cita a categoria', async () => {
    const { a, b, item } = await cenario()
    await definirConclusaoItem(item.id, true)
    await db.groupItems.update(item.id, { prioridade: true, horario: '09:00' })
    const sub = await criarSubtarefa({ taskId: item.id, titulo: 'passo' })
    const antes = (await db.groupItems.get(item.id))!

    const resultado = await passarItemParaGrupoComDesfazer(item.id, b.id)

    expect(resultado?.texto).toBe('"Dois" foi do grupo A para o grupo B e ficou sem categoria.')
    const depois = (await db.groupItems.get(item.id))!
    expect(depois.cardId).toBe(b.id)
    expect(depois.ordem).toBeGreaterThan(
      (await db.groupItems.get(
        (await db.groupItems.where('cardId').equals(b.id).toArray()).find(
          (i) => i.titulo === 'Tres',
        )!.id,
      ))!.ordem,
    )
    expect({
      ...depois,
      cardId: antes.cardId,
      ordem: antes.ordem,
      atualizadoEm: antes.atualizadoEm,
    }).toEqual(antes)
    expect(await db.tasks.count()).toBe(0)
    expect((await db.subtasks.get(sub.id))?.taskId).toBe(item.id)
    expect(a.id).not.toBe(b.id)
  })

  it('desfazer devolve o grupo e a posição de origem', async () => {
    const { a, b, primeiro, item } = await cenario()
    const antes = await db.groupItems.toArray()
    const resultado = await passarItemParaGrupoComDesfazer(item.id, b.id)
    await resultado!.desfazer()
    expect(await db.groupItems.toArray()).toEqual(expect.arrayContaining(antes))
    expect((await db.groupItems.get(item.id))?.cardId).toBe(a.id)
    expect((await db.groupItems.get(primeiro.id))?.cardId).toBe(a.id)
  })

  it('mover para o mesmo grupo não faz nada', async () => {
    const { a, item } = await cenario()
    const antes = await db.groupItems.toArray()
    expect(await passarItemParaGrupoComDesfazer(item.id, a.id)).toBeNull()
    expect(await db.groupItems.toArray()).toEqual(antes)
  })

  it('texto: mesma categoria não cita categoria; categoria nova é citada', () => {
    expect(textoDaTrocaDeGrupo('X', 'A', 'B', { de: 'Casa', para: 'Casa' })).toBe(
      '"X" foi do grupo A para o grupo B.',
    )
    expect(textoDaTrocaDeGrupo('X', 'A', 'B', { de: 'Casa', para: 'Trabalho' })).toBe(
      '"X" foi do grupo A para o grupo B e agora está na categoria Trabalho.',
    )
  })
})
