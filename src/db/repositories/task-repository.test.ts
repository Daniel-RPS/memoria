import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import {
  arquivarTarefa,
  criarTarefa,
  definirConclusao,
  excluirTarefa,
  listarTarefasDoDia,
  renomearTarefa,
  reordenarTarefa,
} from '@/db/repositories/task-repository'

const DIA = '2026-10-30'

async function ordemDoDia() {
  const tarefas = await db.tasks.where('data').equals(DIA).sortBy('ordem')
  return tarefas.map((tarefa) => tarefa.titulo)
}

describe('task-repository', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('cria tarefa pendente no fim do dia, com dataOriginal igual à data', async () => {
    await criarTarefa({ titulo: 'Primeira', data: DIA })
    const segunda = await criarTarefa({ titulo: '  Segunda  ', data: DIA })

    expect(segunda).toMatchObject({
      titulo: 'Segunda',
      status: 'pendente',
      data: DIA,
      dataOriginal: DIA,
      ordem: 2,
    })
    expect(await ordemDoDia()).toEqual(['Primeira', 'Segunda'])
  })

  it('conclui e desmarca, mantendo a posição original', async () => {
    const tarefa = await criarTarefa({ titulo: 'Pagar conta', data: DIA })

    await definirConclusao(tarefa.id, true)
    const concluida = await db.tasks.get(tarefa.id)
    expect(concluida?.status).toBe('concluida')
    expect(concluida?.concluidaEm).toBeTruthy()

    await definirConclusao(tarefa.id, false)
    const pendente = await db.tasks.get(tarefa.id)
    expect(pendente?.status).toBe('pendente')
    expect(pendente?.concluidaEm).toBeUndefined()
    expect(pendente?.ordem).toBe(tarefa.ordem)
  })

  it('reordena gravando só a tarefa movida', async () => {
    const a = await criarTarefa({ titulo: 'A', data: DIA })
    const b = await criarTarefa({ titulo: 'B', data: DIA })
    const c = await criarTarefa({ titulo: 'C', data: DIA })

    await reordenarTarefa([a.id, c.id, b.id], c.id)

    expect(await ordemDoDia()).toEqual(['A', 'C', 'B'])
    expect((await db.tasks.get(c.id))?.ordem).toBe(1.5)
    expect((await db.tasks.get(b.id))?.ordem).toBe(2)
  })

  it('renumera o dia quando não há espaço entre os vizinhos', async () => {
    const a = await criarTarefa({ titulo: 'A', data: DIA })
    const b = await criarTarefa({ titulo: 'B', data: DIA })
    const c = await criarTarefa({ titulo: 'C', data: DIA })
    await db.tasks.update(b.id, { ordem: 1 + Number.EPSILON })

    await reordenarTarefa([a.id, c.id, b.id], c.id)

    expect(await ordemDoDia()).toEqual(['A', 'C', 'B'])
    const ordens = (await db.tasks.where('data').equals(DIA).sortBy('ordem')).map((t) => t.ordem)
    expect(ordens).toEqual([1, 2, 3])
  })

  it('arquivar tira do dia sem concluir', async () => {
    const tarefa = await criarTarefa({ titulo: 'Talvez', data: DIA })
    await arquivarTarefa(tarefa.id)

    expect(await listarTarefasDoDia(DIA)).toEqual([])
    expect((await db.tasks.get(tarefa.id))?.status).toBe('arquivada')
  })

  it('renomeia e exclui junto com as subtarefas', async () => {
    const tarefa = await criarTarefa({ titulo: 'Antigo', data: DIA })
    await renomearTarefa(tarefa.id, ' Novo ')
    expect((await db.tasks.get(tarefa.id))?.titulo).toBe('Novo')

    await db.subtasks.add({
      id: 's1',
      taskId: tarefa.id,
      titulo: 'Passo',
      concluida: false,
      ordem: 1,
      criadoEm: '',
      atualizadoEm: '',
    })
    await excluirTarefa(tarefa.id)

    expect(await db.tasks.get(tarefa.id)).toBeUndefined()
    expect(await db.subtasks.count()).toBe(0)
  })
})
