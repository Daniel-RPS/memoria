import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { criarSubtarefa } from '@/db/repositories/subtask-repository'
import {
  adiarTarefas,
  arquivarTarefa,
  criarTarefa,
  definirConclusao,
  listarPendenciasDeOntem,
  moverTarefas,
  restaurarPosicoes,
  soltarTarefaNoDia,
  trazerPendenciasDeOntem,
} from '@/db/repositories/task-repository'
import { diasPendente } from '@/lib/tarefas'

const ANTEONTEM = '2026-10-28'
const ONTEM = '2026-10-29'
const HOJE = '2026-10-30'
const AMANHA = '2026-10-31'

async function titulosDoDia(data: string) {
  const tarefas = await db.tasks.where('data').equals(data).sortBy('ordem')
  return tarefas.map((tarefa) => tarefa.titulo)
}

describe('mover tarefas entre dias', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('move sem copiar nem apagar: mesmo id, mesma dataOriginal, subtarefas junto', async () => {
    const tarefa = await criarTarefa({ titulo: 'Relatório', data: ONTEM })
    await criarSubtarefa({ taskId: tarefa.id, titulo: 'Revisar' })

    expect((await moverTarefas([tarefa.id], HOJE)).quantidade).toBe(1)

    expect(await db.tasks.count()).toBe(1)
    const movida = await db.tasks.get(tarefa.id)
    expect(movida).toMatchObject({ data: HOJE, dataOriginal: ONTEM, status: 'pendente' })
    expect(await db.subtasks.where('taskId').equals(tarefa.id).count()).toBe(1)
  })

  it('a contagem de dias pendentes continua a partir da data original', async () => {
    const tarefa = await criarTarefa({ titulo: 'Ligar', data: ANTEONTEM })
    await moverTarefas([tarefa.id], ONTEM)
    await moverTarefas([tarefa.id], HOJE)

    const movida = await db.tasks.get(tarefa.id)
    expect(diasPendente(movida!, HOJE)).toBe(2)
  })

  it('várias selecionadas entram no fim do destino, na ordem em que estavam', async () => {
    await criarTarefa({ titulo: 'Já em hoje', data: HOJE })
    const a = await criarTarefa({ titulo: 'A', data: ONTEM })
    const b = await criarTarefa({ titulo: 'B', data: ONTEM })
    const c = await criarTarefa({ titulo: 'C', data: ANTEONTEM })

    expect((await moverTarefas([b.id, a.id, c.id], HOJE)).quantidade).toBe(3)

    expect(await titulosDoDia(HOJE)).toEqual(['Já em hoje', 'C', 'A', 'B'])
    expect(await titulosDoDia(ONTEM)).toEqual([])
  })

  it('mover para o mesmo dia não faz nada', async () => {
    const tarefa = await criarTarefa({ titulo: 'Fica', data: HOJE })
    expect((await moverTarefas([tarefa.id], HOJE)).quantidade).toBe(0)
    expect((await db.tasks.get(tarefa.id))?.ordem).toBe(tarefa.ordem)
  })

  it('não move arquivadas', async () => {
    const tarefa = await criarTarefa({ titulo: 'Arquivada', data: ONTEM })
    await arquivarTarefa(tarefa.id)
    expect((await moverTarefas([tarefa.id], HOJE)).quantidade).toBe(0)
    expect((await db.tasks.get(tarefa.id))?.data).toBe(ONTEM)
  })
})

describe('desfazer', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('devolve cada tarefa ao dia e à posição em que estava', async () => {
    const a = await criarTarefa({ titulo: 'A', data: ONTEM })
    const b = await criarTarefa({ titulo: 'B', data: ONTEM })
    const c = await criarTarefa({ titulo: 'C', data: ONTEM })

    const { anteriores } = await adiarTarefas([a.id, c.id], ONTEM)
    expect(await titulosDoDia(ONTEM)).toEqual(['B'])

    await restaurarPosicoes(anteriores)
    expect(await titulosDoDia(ONTEM)).toEqual(['A', 'B', 'C'])
    expect((await db.tasks.get(b.id))?.ordem).toBe(2)
  })
})

describe('adiar para amanhã', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('adia pendentes de hoje e atrasadas para amanhã, mantendo a data original', async () => {
    const hoje = await criarTarefa({ titulo: 'De hoje', data: HOJE })
    const atrasada = await criarTarefa({ titulo: 'Atrasada', data: ANTEONTEM })

    expect((await adiarTarefas([hoje.id, atrasada.id], HOJE)).quantidade).toBe(2)

    expect(await titulosDoDia(AMANHA)).toEqual(['Atrasada', 'De hoje'])
    expect((await db.tasks.get(atrasada.id))?.dataOriginal).toBe(ANTEONTEM)
  })

  it('não adia concluídas', async () => {
    const tarefa = await criarTarefa({ titulo: 'Feita', data: HOJE })
    await definirConclusao(tarefa.id, true)
    expect((await adiarTarefas([tarefa.id], HOJE)).quantidade).toBe(0)
    expect((await db.tasks.get(tarefa.id))?.data).toBe(HOJE)
  })
})

describe('trazer pendências de ontem', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('traz só as pendentes de ontem para o fim de hoje', async () => {
    await criarTarefa({ titulo: 'Hoje 1', data: HOJE })
    await criarTarefa({ titulo: 'Ontem pendente', data: ONTEM })
    const feita = await criarTarefa({ titulo: 'Ontem feita', data: ONTEM })
    await definirConclusao(feita.id, true)
    await criarTarefa({ titulo: 'Anteontem', data: ANTEONTEM })

    expect(await listarPendenciasDeOntem(HOJE)).toHaveLength(1)
    expect((await trazerPendenciasDeOntem(HOJE)).quantidade).toBe(1)

    expect(await titulosDoDia(HOJE)).toEqual(['Hoje 1', 'Ontem pendente'])
    expect(await titulosDoDia(ONTEM)).toEqual(['Ontem feita'])
    expect(await titulosDoDia(ANTEONTEM)).toEqual(['Anteontem'])
    expect(await listarPendenciasDeOntem(HOJE)).toHaveLength(0)
  })
})

describe('soltar tarefa arrastada em outro dia', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('troca o dia e fica exatamente onde foi solta', async () => {
    const x = await criarTarefa({ titulo: 'X', data: HOJE })
    const y = await criarTarefa({ titulo: 'Y', data: HOJE })
    const arrastada = await criarTarefa({ titulo: 'Arrastada', data: ONTEM })

    await soltarTarefaNoDia(arrastada.id, HOJE, [x.id, arrastada.id, y.id])

    expect(await titulosDoDia(HOJE)).toEqual(['X', 'Arrastada', 'Y'])
    expect((await db.tasks.get(arrastada.id))?.dataOriginal).toBe(ONTEM)
  })
})
