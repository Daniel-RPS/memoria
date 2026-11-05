import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { exportarDados, importarDados, versaoDoBanco } from '@/db/repositories/backup-repository'
import {
  adiarSelecao,
  colocarNoGrupo,
  copiarItens,
  criarGrupo,
  criarItem,
  desfazerAcao,
  excluirGrupo,
  excluirItem,
  moverSelecao,
  tirarDoGrupo,
} from '@/db/repositories/group-repository'
import {
  criarSubtarefa,
  definirConclusaoSubtarefa,
  listarSubtarefas,
} from '@/db/repositories/subtask-repository'
import { criarTarefa, moverTarefas } from '@/db/repositories/task-repository'
import { lerBackup } from '@/lib/backup'

const DIA_5 = '2026-11-05'
const DIA_6 = '2026-11-06'

/** Resumo legível das subetapas de um dono: `['[x] A', '[ ] B']`, na ordem. */
async function subetapasDe(donoId: string) {
  const lista = await db.subtasks.where('taskId').equals(donoId).sortBy('ordem')
  return lista.map((s) => `${s.concluida ? '[x]' : '[ ]'} ${s.titulo}`)
}

/** Simulador POOSE com um item "Estudar" que tem 3 subetapas, a primeira marcada. */
async function simuladorComSubetapas() {
  const card = await criarGrupo({ titulo: 'Simulador POOSE', data: DIA_5 })
  const item = await criarItem(card.id, 'Estudar')
  const a = await criarSubtarefa({ taskId: item.id, titulo: 'Ler' })
  await criarSubtarefa({ taskId: item.id, titulo: 'Resumir' })
  await criarSubtarefa({ taskId: item.id, titulo: 'Revisar' })
  await definirConclusaoSubtarefa(a.id, true)
  return { card, item }
}

async function itemDoDia(data: string, titulo: string) {
  const card = await db.groupCards.where('data').equals(data).first()
  const itens = await db.groupItems.where('cardId').equals(card!.id).toArray()
  return itens.find((item) => item.titulo === titulo && item.status === 'pendente')
}

describe('subetapas de item: levar para outro dia', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('adiar o grupo: a cópia leva TODAS as subetapas, as concluídas ainda marcadas; o original fica', async () => {
    const { card, item } = await simuladorComSubetapas()

    await adiarSelecao({ grupos: [card.id] }, DIA_5)

    const copia = await itemDoDia(DIA_6, 'Estudar')
    expect(copia?.id).not.toBe(item.id)
    expect(await subetapasDe(copia!.id)).toEqual(['[x] Ler', '[ ] Resumir', '[ ] Revisar'])
    expect(await subetapasDe(item.id)).toEqual(['[x] Ler', '[ ] Resumir', '[ ] Revisar'])
    expect((await db.groupItems.get(item.id))?.status).toBe('transferido')
  })

  it('mover um item avulso copia as subetapas', async () => {
    const { item } = await simuladorComSubetapas()

    await moverSelecao({ itens: [item.id] }, DIA_6)

    const copia = await itemDoDia(DIA_6, 'Estudar')
    expect(await subetapasDe(copia!.id)).toEqual(['[x] Ler', '[ ] Resumir', '[ ] Revisar'])
  })

  it('mover o card inteiro e levar com copiarItens também copiam as subetapas', async () => {
    const { card, item } = await simuladorComSubetapas()

    await moverSelecao({ grupos: [card.id] }, DIA_6)
    expect(await subetapasDe((await itemDoDia(DIA_6, 'Estudar'))!.id)).toHaveLength(3)

    await copiarItens([(await itemDoDia(DIA_6, 'Estudar'))!.id], '2026-11-07')
    const seguinte = await itemDoDia('2026-11-07', 'Estudar')
    expect(await subetapasDe(seguinte!.id)).toEqual(['[x] Ler', '[ ] Resumir', '[ ] Revisar'])
    expect(await subetapasDe(item.id)).toHaveLength(3)
  })

  it('o item com subetapas continua sendo 1 item no grupo', async () => {
    const { card } = await simuladorComSubetapas()
    expect(await db.groupItems.where('cardId').equals(card.id).count()).toBe(1)
    await adiarSelecao({ grupos: [card.id] }, DIA_5)
    const cardDoDia6 = await db.groupCards.where('data').equals(DIA_6).first()
    expect(await db.groupItems.where('cardId').equals(cardDoDia6!.id).count()).toBe(1)
  })

  it('Desfazer apaga as subetapas da cópia e mantém as do original', async () => {
    const { card, item } = await simuladorComSubetapas()
    const resultado = await adiarSelecao({ grupos: [card.id] }, DIA_5)
    expect(await db.subtasks.count()).toBe(6)

    await desfazerAcao(resultado)

    expect(await db.subtasks.count()).toBe(3)
    expect(await subetapasDe(item.id)).toEqual(['[x] Ler', '[ ] Resumir', '[ ] Revisar'])
  })

  it('ida e volta (6 → 5): a cópia some com as subetapas e o original mantém as suas', async () => {
    const { card, item } = await simuladorComSubetapas()
    await adiarSelecao({ grupos: [card.id] }, DIA_5)
    const copia = (await itemDoDia(DIA_6, 'Estudar'))!

    await copiarItens([copia.id], DIA_5)

    expect((await db.groupItems.get(item.id))?.status).toBe('pendente')
    expect(await db.groupItems.get(copia.id)).toBeUndefined()
    expect(await db.subtasks.count()).toBe(3)
    expect(await subetapasDe(item.id)).toEqual(['[x] Ler', '[ ] Resumir', '[ ] Revisar'])
  })

  it('a cópia é independente: marcar na cópia não mexe no original', async () => {
    const { card, item } = await simuladorComSubetapas()
    await adiarSelecao({ grupos: [card.id] }, DIA_5)
    const copia = (await itemDoDia(DIA_6, 'Estudar'))!
    const [, segunda] = await db.subtasks.where('taskId').equals(copia.id).sortBy('ordem')

    await definirConclusaoSubtarefa(segunda.id, true)

    expect(await subetapasDe(copia.id)).toEqual(['[x] Ler', '[x] Resumir', '[ ] Revisar'])
    expect(await subetapasDe(item.id)).toEqual(['[x] Ler', '[ ] Resumir', '[ ] Revisar'])
    expect(await listarSubtarefas([copia.id, item.id])).toHaveLength(6)
  })
})

describe('subetapas: tarefa solta, item e exclusão', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('tarefa solta movida de dia leva as subetapas (é o mesmo registro)', async () => {
    const tarefa = await criarTarefa({ titulo: 'Viagem', data: DIA_5 })
    await criarSubtarefa({ taskId: tarefa.id, titulo: 'Passagem' })
    await moverTarefas([tarefa.id], DIA_6)
    expect(await subetapasDe(tarefa.id)).toEqual(['[ ] Passagem'])
  })

  it('colocar no grupo e tirar do grupo preservam as subetapas (mesmo id)', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: DIA_5 })
    const tarefa = await criarTarefa({ titulo: 'Varrer', data: DIA_5 })
    await criarSubtarefa({ taskId: tarefa.id, titulo: 'Sala' })

    await colocarNoGrupo(tarefa.id, card.id)
    expect(await subetapasDe(tarefa.id)).toEqual(['[ ] Sala'])

    await tirarDoGrupo(tarefa.id)
    expect(await subetapasDe(tarefa.id)).toEqual(['[ ] Sala'])
  })

  it('a marca "concluída pelas subetapas" acompanha a conversão', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: DIA_5 })
    const tarefa = await criarTarefa({ titulo: 'Varrer', data: DIA_5 })
    const sala = await criarSubtarefa({ taskId: tarefa.id, titulo: 'Sala' })
    await definirConclusaoSubtarefa(sala.id, true)

    await colocarNoGrupo(tarefa.id, card.id)
    expect(await db.groupItems.get(tarefa.id)).toMatchObject({
      status: 'concluido',
      concluidaPelasSubetapas: true,
    })
  })

  it('excluir o item ou o grupo apaga as subetapas', async () => {
    const { card, item } = await simuladorComSubetapas()
    await excluirItem(item.id)
    expect(await db.subtasks.count()).toBe(0)

    const outro = await criarItem(card.id, 'Outro')
    await criarSubtarefa({ taskId: outro.id, titulo: 'X' })
    await excluirGrupo(card.id)
    expect(await db.subtasks.count()).toBe(0)
  })
})

describe('subetapas: backup', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('exporta e importa subetapas de tarefa e de item, com a marca de conclusão automática', async () => {
    const { card } = await simuladorComSubetapas()
    await adiarSelecao({ grupos: [card.id] }, DIA_5)
    const tarefa = await criarTarefa({ titulo: 'Viagem', data: DIA_5 })
    const unica = await criarSubtarefa({ taskId: tarefa.id, titulo: 'Passagem' })
    await definirConclusaoSubtarefa(unica.id, true)
    const antes = {
      subtarefas: await db.subtasks.toArray(),
      tarefa: await db.tasks.get(tarefa.id),
    }
    expect(antes.tarefa?.concluidaPelasSubetapas).toBe(true)

    const arquivo = JSON.stringify(await exportarDados())
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    const leitura = lerBackup(arquivo, versaoDoBanco())
    expect(leitura.isValido).toBe(true)
    if (!leitura.isValido) return
    await importarDados(leitura.backup)

    expect(await db.subtasks.toArray()).toEqual(expect.arrayContaining(antes.subtarefas))
    expect(await db.subtasks.count()).toBe(antes.subtarefas.length)
    expect((await db.tasks.get(tarefa.id))?.concluidaPelasSubetapas).toBe(true)
  })
})
