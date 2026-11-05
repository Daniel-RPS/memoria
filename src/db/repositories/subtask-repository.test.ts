import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import {
  criarSubtarefa,
  criarSubtarefas,
  definirConclusaoSubtarefa,
  excluirSubtarefa,
  listarSubtarefas,
  renomearSubtarefa,
  reordenarSubtarefa,
} from '@/db/repositories/subtask-repository'
import { criarGrupo, criarItem } from '@/db/repositories/group-repository'
import { criarTarefa, definirConclusao } from '@/db/repositories/task-repository'

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

describe('subetapas: conclusão automática', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  async function tarefaComSubetapas(titulos: string[]) {
    const tarefa = await criarTarefa({ titulo: 'Viagem', data: '2026-11-05' })
    const subetapas = []
    for (const titulo of titulos)
      subetapas.push(await criarSubtarefa({ taskId: tarefa.id, titulo }))
    return { tarefa, subetapas }
  }

  it('marcar a última pendente conclui a tarefa sozinha e tira o em andamento', async () => {
    const { tarefa, subetapas } = await tarefaComSubetapas(['A', 'B'])
    await db.tasks.update(tarefa.id, { emAndamento: true, emAndamentoDesde: 'agora' })

    expect((await definirConclusaoSubtarefa(subetapas[0].id, true)).efeito).toBeNull()
    expect((await db.tasks.get(tarefa.id))?.status).toBe('pendente')

    const resultado = await definirConclusaoSubtarefa(subetapas[1].id, true)
    expect(resultado.efeito).toBe('concluiu')
    expect(await db.tasks.get(tarefa.id)).toMatchObject({
      status: 'concluida',
      concluidaPelasSubetapas: true,
    })
    expect((await db.tasks.get(tarefa.id))?.emAndamento).toBeUndefined()
    expect((await db.tasks.get(tarefa.id))?.concluidaEm).toBeTruthy()
  })

  it('desmarcar uma subetapa de uma tarefa concluída assim a reabre', async () => {
    const { tarefa, subetapas } = await tarefaComSubetapas(['A', 'B'])
    for (const subetapa of subetapas) await definirConclusaoSubtarefa(subetapa.id, true)

    const resultado = await definirConclusaoSubtarefa(subetapas[0].id, false)
    expect(resultado.efeito).toBe('reabriu')
    const reaberta = await db.tasks.get(tarefa.id)
    expect(reaberta).toMatchObject({ status: 'pendente' })
    expect(reaberta?.concluidaPelasSubetapas).toBeUndefined()
    expect(reaberta?.concluidaEm).toBeUndefined()
  })

  it('tarefa concluída pela própria caixa não é reaberta ao desmarcar subetapa', async () => {
    const { tarefa, subetapas } = await tarefaComSubetapas(['A'])
    await definirConclusaoSubtarefa(subetapas[0].id, true) // conclui pelas subetapas
    await definirConclusao(tarefa.id, false) // reabre direto: apaga a marca
    await definirConclusao(tarefa.id, true) // conclui direto, sem mexer nas subetapas

    expect((await db.tasks.get(tarefa.id))?.concluidaPelasSubetapas).toBeUndefined()
    expect((await db.subtasks.get(subetapas[0].id))?.concluida).toBe(true)
    expect((await definirConclusaoSubtarefa(subetapas[0].id, false)).efeito).toBeNull()
    expect((await db.tasks.get(tarefa.id))?.status).toBe('concluida')
  })

  it('Desfazer devolve a subetapa e a tarefa ao que eram', async () => {
    const { tarefa, subetapas } = await tarefaComSubetapas(['A'])
    const resultado = await definirConclusaoSubtarefa(subetapas[0].id, true)
    expect((await db.tasks.get(tarefa.id))?.status).toBe('concluida')

    await resultado.desfazer()
    expect((await db.tasks.get(tarefa.id))?.status).toBe('pendente')
    expect((await db.tasks.get(tarefa.id))?.concluidaPelasSubetapas).toBeUndefined()
    expect((await db.subtasks.get(subetapas[0].id))?.concluida).toBe(false)
  })

  it('item de grupo: mesma regra, e o grupo continua contando 1 item', async () => {
    const card = await criarGrupo({ titulo: 'Simulador POOSE', data: '2026-11-05' })
    const item = await criarItem(card.id, 'Estudar')
    const a = await criarSubtarefa({ taskId: item.id, titulo: 'A' })
    const b = await criarSubtarefa({ taskId: item.id, titulo: 'B' })

    await definirConclusaoSubtarefa(a.id, true)
    expect((await definirConclusaoSubtarefa(b.id, true)).efeito).toBe('concluiu')
    expect(await db.groupItems.get(item.id)).toMatchObject({
      status: 'concluido',
      concluidaPelasSubetapas: true,
    })
    expect(await db.groupItems.where('cardId').equals(card.id).count()).toBe(1)

    expect((await definirConclusaoSubtarefa(a.id, false)).efeito).toBe('reabriu')
    expect((await db.groupItems.get(item.id))?.status).toBe('pendente')
  })

  it('criarSubtarefas cria várias de uma vez, no fim e na ordem recebida', async () => {
    const { tarefa } = await tarefaComSubetapas(['Primeira'])
    await criarSubtarefas(tarefa.id, ['Segunda', ' Terceira '])
    expect(await titulosDe(tarefa.id)).toEqual(['Primeira', 'Segunda', 'Terceira'])
  })
})
