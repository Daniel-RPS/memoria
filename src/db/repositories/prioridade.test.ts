import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { exportarDados, importarDados, versaoDoBanco } from '@/db/repositories/backup-repository'
import {
  adiarSelecao,
  colocarNoGrupo,
  criarGrupo,
  criarItem,
  definirConclusaoItem,
  desfazerAcao,
  tirarDoGrupo,
} from '@/db/repositories/group-repository'
import {
  alternarPrioridade,
  definirPrioridade,
  restaurarPrioridade,
} from '@/db/repositories/prioridade-repository'
import { criarSubtarefa, definirConclusaoSubtarefa } from '@/db/repositories/subtask-repository'
import {
  adiarTarefas,
  criarTarefa,
  definirConclusao,
  moverTarefas,
  restaurarPosicoes,
  soltarTarefaNoDia,
} from '@/db/repositories/task-repository'
import { lerBackup } from '@/lib/backup'

const DIA_5 = '2026-11-05'
const DIA_6 = '2026-11-06'

async function tarefaPrioritaria(titulo = 'Revisar relatório') {
  const tarefa = await criarTarefa({ titulo, data: DIA_5 })
  await definirPrioridade({ tarefas: [tarefa.id] }, true)
  return tarefa
}

async function itemPrioritario() {
  const card = await criarGrupo({ titulo: 'Simulador POOSE', data: DIA_5 })
  const item = await criarItem(card.id, 'Estudar')
  await definirPrioridade({ itens: [item.id] }, true)
  return { card, item }
}

async function itemDoDia(data: string, titulo: string) {
  const card = await db.groupCards.where('data').equals(data).first()
  const itens = await db.groupItems.where('cardId').equals(card!.id).toArray()
  return itens.find((item) => item.titulo === titulo && item.status === 'pendente')
}

describe('prioridade: marcar e tirar', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('marca tarefa solta e item pendentes, com o momento; tirar apaga os campos', async () => {
    const tarefa = await tarefaPrioritaria()
    const { item } = await itemPrioritario()

    expect(await db.tasks.get(tarefa.id)).toMatchObject({ prioridade: true })
    expect((await db.tasks.get(tarefa.id))?.prioridadeDesde).toBeTruthy()
    expect(await db.groupItems.get(item.id)).toMatchObject({ prioridade: true })

    await definirPrioridade({ tarefas: [tarefa.id], itens: [item.id] }, false)
    expect((await db.tasks.get(tarefa.id))?.prioridade).toBeUndefined()
    expect((await db.tasks.get(tarefa.id))?.prioridadeDesde).toBeUndefined()
    expect((await db.groupItems.get(item.id))?.prioridade).toBeUndefined()
  })

  it('recusa quem não está pendente e não repete quem já tem', async () => {
    const tarefa = await criarTarefa({ titulo: 'Feita', data: DIA_5 })
    await definirConclusao(tarefa.id, true)
    const antes = await definirPrioridade({ tarefas: [tarefa.id] }, true)
    expect(antes.tarefas).toHaveLength(0)
    expect((await db.tasks.get(tarefa.id))?.prioridade).toBeUndefined()

    const outra = await tarefaPrioritaria('Outra')
    expect((await definirPrioridade({ tarefas: [outra.id] }, true)).tarefas).toHaveLength(0)
  })

  it('várias de uma vez (tecla P com seleção): alterna e o Desfazer devolve a marca de antes', async () => {
    const a = await tarefaPrioritaria('A')
    const b = await criarTarefa({ titulo: 'B', data: DIA_5 })

    const primeira = await alternarPrioridade({ tarefas: [a.id, b.id] })
    expect(primeira.isMarcar).toBe(true)
    expect((await db.tasks.get(b.id))?.prioridade).toBe(true)
    expect(primeira.anteriores.tarefas.map((t) => t.id)).toEqual([b.id])

    await restaurarPrioridade(primeira.anteriores)
    expect((await db.tasks.get(b.id))?.prioridade).toBeUndefined()
    expect((await db.tasks.get(a.id))?.prioridade).toBe(true)

    const todas = await alternarPrioridade({ tarefas: [a.id] })
    expect(todas.isMarcar).toBe(false)
    expect((await db.tasks.get(a.id))?.prioridade).toBeUndefined()
  })
})

describe('prioridade: transferências', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('tarefa solta mantém a prioridade ao mover, adiar e soltar em outro dia', async () => {
    const tarefa = await tarefaPrioritaria()

    await moverTarefas([tarefa.id], DIA_6)
    expect((await db.tasks.get(tarefa.id))?.prioridade).toBe(true)

    await adiarTarefas([tarefa.id], DIA_5)
    expect((await db.tasks.get(tarefa.id))?.prioridade).toBe(true)

    await soltarTarefaNoDia(tarefa.id, DIA_5, [tarefa.id])
    expect(await db.tasks.get(tarefa.id)).toMatchObject({ data: DIA_5, prioridade: true })
  })

  it('Desfazer de mover não tira a prioridade', async () => {
    const tarefa = await tarefaPrioritaria()
    const { anteriores } = await moverTarefas([tarefa.id], DIA_6)
    await restaurarPosicoes(anteriores)
    expect(await db.tasks.get(tarefa.id)).toMatchObject({ data: DIA_5, prioridade: true })
  })

  it('adiar o grupo: a cópia do item é prioridade; o original, que vira registro, deixa de ser', async () => {
    const { card, item } = await itemPrioritario()

    await adiarSelecao({ grupos: [card.id] }, DIA_5)

    const copia = await itemDoDia(DIA_6, 'Estudar')
    expect(copia).toMatchObject({ prioridade: true })
    expect(copia?.prioridadeDesde).toBe((await db.groupItems.get(copia!.id))?.prioridadeDesde)
    const original = await db.groupItems.get(item.id)
    expect(original?.status).toBe('transferido')
    expect(original?.prioridade).toBeUndefined()
  })

  it('Desfazer o adiar devolve a prioridade ao original', async () => {
    const { card, item } = await itemPrioritario()
    const resultado = await adiarSelecao({ grupos: [card.id] }, DIA_5)

    await desfazerAcao(resultado)

    expect(await db.groupItems.get(item.id)).toMatchObject({
      status: 'pendente',
      prioridade: true,
    })
  })

  it('colocar no grupo e tirar do grupo mantêm a prioridade (mesmo registro convertido)', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: DIA_5 })
    const tarefa = await tarefaPrioritaria('Varrer')

    await colocarNoGrupo(tarefa.id, card.id)
    expect(await db.groupItems.get(tarefa.id)).toMatchObject({ prioridade: true })

    await tirarDoGrupo(tarefa.id)
    expect(await db.tasks.get(tarefa.id)).toMatchObject({ prioridade: true })
  })
})

describe('prioridade: concluir', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('concluir a tarefa direto tira a prioridade; desmarcar volta pendente comum', async () => {
    const tarefa = await tarefaPrioritaria()

    await definirConclusao(tarefa.id, true)
    expect((await db.tasks.get(tarefa.id))?.prioridade).toBeUndefined()

    await definirConclusao(tarefa.id, false)
    expect(await db.tasks.get(tarefa.id)).toMatchObject({ status: 'pendente' })
    expect((await db.tasks.get(tarefa.id))?.prioridade).toBeUndefined()
  })

  it('concluir o item direto tira a prioridade', async () => {
    const { item } = await itemPrioritario()
    await definirConclusaoItem(item.id, true)
    expect((await db.groupItems.get(item.id))?.prioridade).toBeUndefined()
    await definirConclusaoItem(item.id, false)
    expect((await db.groupItems.get(item.id))?.prioridade).toBeUndefined()
  })

  it('concluir pela última subetapa também tira; desmarcar reabre sem prioridade', async () => {
    const tarefa = await tarefaPrioritaria()
    const subetapa = await criarSubtarefa({ taskId: tarefa.id, titulo: 'Única' })

    const resultado = await definirConclusaoSubtarefa(subetapa.id, true)
    expect(await db.tasks.get(tarefa.id)).toMatchObject({ status: 'concluida' })
    expect((await db.tasks.get(tarefa.id))?.prioridade).toBeUndefined()

    await definirConclusaoSubtarefa(subetapa.id, false)
    expect((await db.tasks.get(tarefa.id))?.status).toBe('pendente')
    expect((await db.tasks.get(tarefa.id))?.prioridade).toBeUndefined()

    // O Desfazer do aviso "Tarefa concluída" devolve o registro inteiro, prioridade incluída.
    await definirConclusaoSubtarefa(subetapa.id, true)
    const outro = await tarefaPrioritaria('Outra')
    const sub = await criarSubtarefa({ taskId: outro.id, titulo: 'X' })
    const concluindo = await definirConclusaoSubtarefa(sub.id, true)
    await concluindo.desfazer()
    expect(await db.tasks.get(outro.id)).toMatchObject({ status: 'pendente', prioridade: true })
    expect(resultado.efeito).toBe('concluiu')
  })

  it('item concluído pela última subetapa perde a prioridade', async () => {
    const { item } = await itemPrioritario()
    const subetapa = await criarSubtarefa({ taskId: item.id, titulo: 'Única' })
    await definirConclusaoSubtarefa(subetapa.id, true)
    expect(await db.groupItems.get(item.id)).toMatchObject({ status: 'concluido' })
    expect((await db.groupItems.get(item.id))?.prioridade).toBeUndefined()
  })
})

describe('prioridade: backup', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('exporta e importa a prioridade de tarefa e de item', async () => {
    const tarefa = await tarefaPrioritaria()
    const { item } = await itemPrioritario()
    const antes = {
      tarefa: await db.tasks.get(tarefa.id),
      item: await db.groupItems.get(item.id),
    }

    const arquivo = JSON.stringify(await exportarDados())
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    const leitura = lerBackup(arquivo, versaoDoBanco())
    expect(leitura.isValido).toBe(true)
    if (!leitura.isValido) return
    await importarDados(leitura.backup)

    expect(await db.tasks.get(tarefa.id)).toEqual(antes.tarefa)
    expect(await db.groupItems.get(item.id)).toEqual(antes.item)
  })
})
