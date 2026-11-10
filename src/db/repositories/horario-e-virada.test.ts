import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { definirAndamento, pararAndamentoForaDeHoje } from '@/db/repositories/andamento-repository'
import { adiarSelecao, criarGrupo, criarItem } from '@/db/repositories/group-repository'
import { definirHorario } from '@/db/repositories/horario-repository'
import { adiarTarefas, criarTarefa, moverTarefas } from '@/db/repositories/task-repository'

const DIA_9 = '2026-11-09'
const DIA_10 = '2026-11-10'
const DIA_11 = '2026-11-11'

describe('horário acompanha a tarefa', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('mantém o horário da tarefa solta ao adiar e mover; remover apaga o campo', async () => {
    const tarefa = await criarTarefa({ titulo: 'Fazer comida', data: DIA_10 })
    await definirHorario({ tipo: 'tarefa', id: tarefa.id }, '12:00')

    await adiarTarefas([tarefa.id], DIA_10)
    expect(await db.tasks.get(tarefa.id)).toMatchObject({ data: DIA_11, horario: '12:00' })

    await moverTarefas([tarefa.id], DIA_9)
    expect(await db.tasks.get(tarefa.id)).toMatchObject({ data: DIA_9, horario: '12:00' })

    expect(await definirHorario({ tipo: 'tarefa', id: tarefa.id }, undefined)).toBe('12:00')
    expect('horario' in (await db.tasks.get(tarefa.id))!).toBe(false)
  })

  it('a cópia do item levado a outro dia leva o horário', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: DIA_10 })
    const item = await criarItem(card.id, 'Lavar louça')
    await definirHorario({ tipo: 'item', id: item.id }, '09:30')

    await adiarSelecao({ grupos: [card.id] }, DIA_10)

    const cardDestino = await db.groupCards.where('data').equals(DIA_11).first()
    const copia = await db.groupItems.where('cardId').equals(cardDestino!.id).first()
    expect(copia).toMatchObject({ titulo: 'Lavar louça', status: 'pendente', horario: '09:30' })
  })
})

describe('virada do dia para o andamento', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('para o que ficou em andamento ontem e fecha a sessão às 23:59:59 do dia', async () => {
    const ontem = await criarTarefa({ titulo: 'Esquecida', data: DIA_9 })
    const deHoje = await criarTarefa({ titulo: 'Agora', data: DIA_10 })
    await definirAndamento({ tarefas: [ontem.id, deHoje.id] }, true)
    const inicio = new Date('2026-11-09T21:00:00-03:00').toISOString()
    await db.sessions.where('tarefaId').equals(ontem.id).modify({ inicio })

    await pararAndamentoForaDeHoje(DIA_10)

    expect((await db.tasks.get(ontem.id))?.emAndamento).toBeUndefined()
    expect((await db.tasks.get(deHoje.id))?.emAndamento).toBe(true)
    const [sessao] = await db.sessions.where('tarefaId').equals(ontem.id).toArray()
    expect(sessao.fim).toBe(new Date('2026-11-09T23:59:59-03:00').toISOString())
    const [aberta] = await db.sessions.where('tarefaId').equals(deHoje.id).toArray()
    expect(aberta.fim).toBeUndefined()
  })
})
