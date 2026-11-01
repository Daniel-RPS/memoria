import { beforeEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { db, MemoriaDatabase } from '@/db/database'
import { exportarDados, importarDados, versaoDoBanco } from '@/db/repositories/backup-repository'
import {
  adiarSelecao,
  colocarNoGrupo,
  contarPendenciasDeOntem,
  copiarGrupos,
  copiarItens,
  criarGrupo,
  criarItem,
  definirConclusaoItem,
  desfazerAcao,
  moverSelecao,
  renomearGrupo,
  tirarDoGrupo,
  trazerPendenciasDeOntem,
} from '@/db/repositories/group-repository'
import { criarTarefa, moverTarefas } from '@/db/repositories/task-repository'
import { lerBackup } from '@/lib/backup'
import { ErroDeValidacao } from '@/lib/erros'

const DIA_30 = '2026-10-30'
const DIA_31 = '2026-10-31'
const ONTEM = '2026-10-29'

const MARCA = { pendente: '[ ]', concluido: '[x]', transferido: '[→]', arquivado: '[a]' }

/** Cards do dia com os itens na ordem do card: `{ titulo, itens: ['[x] Arrumar o quarto'] }`. */
async function cardsDoDia(data: string) {
  const cards = (await db.groupCards.where('data').equals(data).sortBy('ordem')).filter(
    (card) => !card.arquivado,
  )
  return Promise.all(
    cards.map(async (card) => {
      const serie = await db.groupSeries.get(card.seriesId)
      const itens = await db.groupItems.where('cardId').equals(card.id).sortBy('ordem')
      return {
        titulo: serie?.titulo,
        itens: itens.map((item) => `${MARCA[item.status]} ${item.titulo}`),
      }
    }),
  )
}

/** O card "Casa" do exemplo: quarto, banheiro e garagem marcados; comida pendente. */
async function criarCasaDoExemplo() {
  const card = await criarGrupo({ titulo: 'Casa', data: DIA_30 })
  const quarto = await criarItem(card.id, 'Arrumar o quarto')
  const banheiro = await criarItem(card.id, 'Arrumar o banheiro')
  const comida = await criarItem(card.id, 'Fazer comida')
  const garagem = await criarItem(card.id, 'Lavar garagem')
  for (const item of [quarto, banheiro, garagem]) await definirConclusaoItem(item.id, true)
  return { card, quarto, banheiro, comida, garagem }
}

describe('grupos: arrastar o card duplica', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('exemplo: o original fica com o transferido e a cópia leva só o pendente', async () => {
    const { card, comida } = await criarCasaDoExemplo()

    const resultado = await copiarGrupos([card.id], DIA_31)
    expect(resultado.itensLevados).toBe(1)

    // Dia 30: o card permanece, com "Fazer comida" transferido (não riscado, não pendente).
    expect(await cardsDoDia(DIA_30)).toEqual([
      {
        titulo: 'Casa',
        itens: [
          '[x] Arrumar o quarto',
          '[x] Arrumar o banheiro',
          '[→] Fazer comida',
          '[x] Lavar garagem',
        ],
      },
    ])
    // Dia 31: cópia nova só com o pendente, pendente desde o dia 30.
    expect(await cardsDoDia(DIA_31)).toEqual([{ titulo: 'Casa', itens: ['[ ] Fazer comida'] }])
    const card31 = (await db.groupCards.where('data').equals(DIA_31).first())!
    expect(card31.id).not.toBe(card.id)
    expect(card31.seriesId).toBe(card.seriesId)
    const original = await db.groupItems.get(comida.id)
    expect(original).toMatchObject({ status: 'transferido', transferidoParaCardId: card31.id })
    const copia = (await db.groupItems.where('cardId').equals(card31.id).first())!
    expect(copia).toMatchObject({
      status: 'pendente',
      origemItemId: comida.id,
      dataOriginal: DIA_30,
    })

    // Itens novos no card do dia 31.
    await criarItem(card31.id, 'Lavar roupa')
    await criarItem(card31.id, 'Regar plantas')
    expect(await cardsDoDia(DIA_31)).toEqual([
      { titulo: 'Casa', itens: ['[ ] Fazer comida', '[ ] Lavar roupa', '[ ] Regar plantas'] },
    ])
    const regar = (await db.groupItems.toArray()).find((item) => item.titulo === 'Regar plantas')
    expect(regar?.dataOriginal).toBe(DIA_31)
  })

  it('destino com card da mesma série: mescla sem criar outro card', async () => {
    const { card } = await criarCasaDoExemplo()
    const destino = await criarGrupo({ titulo: 'Casa', data: DIA_31 })
    await criarItem(destino.id, 'Lavar roupa')

    await copiarGrupos([card.id], DIA_31)

    expect(await db.groupCards.where('data').equals(DIA_31).count()).toBe(1)
    expect(await cardsDoDia(DIA_31)).toEqual([
      { titulo: 'Casa', itens: ['[ ] Lavar roupa', '[ ] Fazer comida'] },
    ])
    expect(await db.groupSeries.count()).toBe(1)
  })

  it('card com tudo marcado: nada é copiado', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: DIA_30 })
    await definirConclusaoItem((await criarItem(card.id, 'Varrer')).id, true)

    const resultado = await copiarGrupos([card.id], DIA_31)

    expect(resultado.itensLevados).toBe(0)
    expect(await db.groupCards.count()).toBe(1)
    expect(await cardsDoDia(DIA_30)).toEqual([{ titulo: 'Casa', itens: ['[x] Varrer'] }])
  })

  it('card sem nada marcado: o original fica e todos os itens viram transferidos', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: DIA_30 })
    await criarItem(card.id, 'Varrer')
    await criarItem(card.id, 'Passar pano')

    await copiarGrupos([card.id], DIA_31)

    expect(await cardsDoDia(DIA_30)).toEqual([
      { titulo: 'Casa', itens: ['[→] Varrer', '[→] Passar pano'] },
    ])
    expect(await cardsDoDia(DIA_31)).toEqual([
      { titulo: 'Casa', itens: ['[ ] Varrer', '[ ] Passar pano'] },
    ])
  })

  it('item individual vai para o card da série no outro dia e fica transferido', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: DIA_30 })
    const varrer = await criarItem(card.id, 'Varrer')
    await criarItem(card.id, 'Passar pano')

    await copiarItens([varrer.id], DIA_31)

    expect(await cardsDoDia(DIA_30)).toEqual([
      { titulo: 'Casa', itens: ['[→] Varrer', '[ ] Passar pano'] },
    ])
    expect(await cardsDoDia(DIA_31)).toEqual([{ titulo: 'Casa', itens: ['[ ] Varrer'] }])
  })

  it('tarefa solta continua sendo movida, não duplicada', async () => {
    const tarefa = await criarTarefa({ titulo: 'Pagar conta', data: DIA_30 })

    await moverTarefas([tarefa.id], DIA_31)

    expect(await db.tasks.count()).toBe(1)
    expect(await db.tasks.get(tarefa.id)).toMatchObject({ data: DIA_31, dataOriginal: DIA_30 })
    expect(await db.groupCards.count()).toBe(0)
  })

  it('desmarcar no original depois de transferir não mexe na cópia', async () => {
    const { card, quarto } = await criarCasaDoExemplo()
    await copiarGrupos([card.id], DIA_31)

    await definirConclusaoItem(quarto.id, false)

    expect(await cardsDoDia(DIA_31)).toEqual([{ titulo: 'Casa', itens: ['[ ] Fazer comida'] }])
    expect((await db.groupItems.get(quarto.id))?.status).toBe('pendente')
  })

  it('item transferido não pode ser marcado', async () => {
    const { card, comida } = await criarCasaDoExemplo()
    await copiarGrupos([card.id], DIA_31)

    await definirConclusaoItem(comida.id, true)

    expect((await db.groupItems.get(comida.id))?.status).toBe('transferido')
  })

  it('Desfazer apaga a cópia e devolve o original a pendente', async () => {
    const { card, comida } = await criarCasaDoExemplo()

    const resultado = await copiarGrupos([card.id], DIA_31)
    await desfazerAcao(resultado)

    expect(await db.groupCards.where('data').equals(DIA_31).count()).toBe(0)
    expect((await db.groupItems.get(comida.id))?.status).toBe('pendente')
  })

  it('trazer pendências de ontem: move tarefas soltas e copia os pendentes dos cards', async () => {
    const solta = await criarTarefa({ titulo: 'Pagar conta', data: ONTEM })
    const casaOntem = await criarGrupo({ titulo: 'Casa', data: ONTEM })
    await criarItem(casaOntem.id, 'Fazer comida')
    await definirConclusaoItem((await criarItem(casaOntem.id, 'Varrer')).id, true)
    const casaHoje = await criarGrupo({ titulo: 'Casa', data: DIA_30 })
    await criarItem(casaHoje.id, 'Lavar roupa')

    expect(await contarPendenciasDeOntem(DIA_30)).toBe(2)
    const resultado = await trazerPendenciasDeOntem(DIA_30)

    expect(resultado).toMatchObject({ tarefasMovidas: 1, itensLevados: 1 })
    expect((await db.tasks.get(solta.id))?.data).toBe(DIA_30)
    expect(await cardsDoDia(DIA_30)).toEqual([
      { titulo: 'Casa', itens: ['[ ] Lavar roupa', '[ ] Fazer comida'] },
    ])
    expect(await cardsDoDia(ONTEM)).toEqual([
      { titulo: 'Casa', itens: ['[→] Fazer comida', '[x] Varrer'] },
    ])
  })

  it('seleção com tarefa solta e card: a tarefa é movida e o card é copiado', async () => {
    const { card } = await criarCasaDoExemplo()
    const solta = await criarTarefa({ titulo: 'Pagar conta', data: DIA_30 })

    const resultado = await moverSelecao({ tarefas: [solta.id], grupos: [card.id] }, DIA_31)

    expect(resultado).toMatchObject({ tarefasMovidas: 1, itensLevados: 1 })
    expect(await db.groupCards.count()).toBe(2)
  })

  it('tarefa solta vira item do card e item vira tarefa solta (mesmo id)', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: DIA_30 })
    const tarefa = await criarTarefa({ titulo: 'Varrer', data: ONTEM })
    await moverTarefas([tarefa.id], DIA_30)

    await colocarNoGrupo(tarefa.id, card.id)
    expect(await db.tasks.count()).toBe(0)
    expect(await db.groupItems.get(tarefa.id)).toMatchObject({
      cardId: card.id,
      dataOriginal: ONTEM,
      status: 'pendente',
    })

    await tirarDoGrupo(tarefa.id)
    expect(await db.groupItems.count()).toBe(0)
    expect(await db.tasks.get(tarefa.id)).toMatchObject({ data: DIA_30, dataOriginal: ONTEM })
  })

  it('nome repetido: mesmo dia é recusado; renomear para nome de outra série também', async () => {
    await criarGrupo({ titulo: 'Casa', data: DIA_30 })
    const mercado = await criarGrupo({ titulo: 'Mercado', data: DIA_30 })

    await expect(criarGrupo({ titulo: 'CASA', data: DIA_30 })).rejects.toThrow(ErroDeValidacao)
    await expect(renomearGrupo(mercado.seriesId, 'Casa')).rejects.toThrow(ErroDeValidacao)
  })

  it('backup exporta e importa grupos, itens e transferências', async () => {
    const { card } = await criarCasaDoExemplo()
    await copiarGrupos([card.id], DIA_31)
    const antes = { dia30: await cardsDoDia(DIA_30), dia31: await cardsDoDia(DIA_31) }
    const itensAntes = await db.groupItems.toArray()

    const arquivo = JSON.stringify(await exportarDados())
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    const leitura = lerBackup(arquivo, versaoDoBanco())
    expect(leitura.isValido).toBe(true)
    if (!leitura.isValido) return
    await importarDados(leitura.backup)

    expect({ dia30: await cardsDoDia(DIA_30), dia31: await cardsDoDia(DIA_31) }).toEqual(antes)
    expect(await db.groupItems.toArray()).toEqual(itensAntes)
  })
})

describe('migração do modelo anterior (banco v3)', () => {
  it('cards e itens-tarefa da v3 viram GroupCard e GroupItem', async () => {
    const nome = 'migracao-v3'
    const antigo = new Dexie(nome)
    antigo.version(3).stores({
      categories: 'id, nome',
      subcategories: 'id, categoryId',
      tasks:
        'id, data, [data+ordem], status, categoryId, dataOriginal, procedureId, groupInstanceId',
      subtasks: 'id, taskId, [taskId+ordem]',
      procedures: 'id, titulo, categoryId',
      procedureVersions: 'id, procedureId, [procedureId+versao]',
      executions: 'id, procedureId, data, taskId',
      notes: 'id, [dono.tipo+dono.id]',
      attachments: 'id, [dono.tipo+dono.id]',
      groupSeries: 'id, titulo, categoryId',
      groupInstances: 'id, seriesId, data, [seriesId+data]',
    })
    const base = { criadoEm: '', atualizadoEm: '' }
    await antigo.table('groupSeries').add({ id: 's', titulo: 'Casa', ...base })
    await antigo
      .table('groupInstances')
      .add({ id: 'c', seriesId: 's', data: DIA_30, ordem: 1, arquivado: false, ...base })
    const tarefa = { data: DIA_30, dataOriginal: DIA_30, ordem: 1, ...base }
    await antigo.table('tasks').bulkAdd([
      { id: 'i', titulo: 'Varrer', status: 'concluida', groupInstanceId: 'c', ...tarefa },
      { id: 't', titulo: 'Solta', status: 'pendente', ...tarefa },
    ])
    antigo.close()

    const novo = new MemoriaDatabase(nome)
    await novo.open()

    expect(await novo.groupCards.get('c')).toMatchObject({ seriesId: 's', data: DIA_30 })
    expect(await novo.groupItems.get('i')).toMatchObject({
      cardId: 'c',
      titulo: 'Varrer',
      status: 'concluido',
    })
    expect((await novo.tasks.toArray()).map((item) => item.id)).toEqual(['t'])
    novo.close()
    await Dexie.delete(nome)
  })
})

const DIA_1 = '2026-11-01'
const DIA_2 = '2026-11-02'
const DIA_3 = '2026-11-03'

/** Dias com card, para conferir que nenhum card fantasma ficou. */
async function diasComCard() {
  return (await db.groupCards.orderBy('data').toArray()).map((card) => card.data)
}

/** O item pendente do card do dia (a cópia que foi para lá). */
async function pendenteDoDia(data: string, titulo: string) {
  const card = (await db.groupCards.where('data').equals(data).first())!
  return (await db.groupItems.where('cardId').equals(card.id).toArray()).find(
    (item) => item.titulo === titulo && item.status === 'pendente',
  )!
}

/** Tudo que há nas tabelas de grupos e tarefas, para comparar antes e depois do Desfazer. */
async function retrato() {
  const porId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)
  const semMomento = <T extends { id: string }>(lista: T[]) =>
    lista.map((registro) => ({ ...registro, atualizadoEm: '' })).sort(porId)
  return {
    series: semMomento(await db.groupSeries.toArray()),
    cards: semMomento(await db.groupCards.toArray()),
    itens: semMomento(await db.groupItems.toArray()),
    tarefas: semMomento(await db.tasks.toArray()),
  }
}

describe('grupos: levar e trazer de volta', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  async function casaNoDia2() {
    const card = await criarGrupo({ titulo: 'Casa', data: DIA_2 })
    const janta = await criarItem(card.id, 'Fazer janta das crianças')
    const banho = await criarItem(card.id, 'Dar banho')
    return { card, janta, banho }
  }

  it('mover o grupo com 2 pendentes: os 2 vão juntos, em ordem, numa operação', async () => {
    const { card } = await casaNoDia2()

    const resultado = await moverSelecao({ grupos: [card.id] }, DIA_3)

    expect(resultado.itensLevados).toBe(2)
    expect(resultado.desfazer).toHaveLength(1)
    expect(await cardsDoDia(DIA_3)).toEqual([
      { titulo: 'Casa', itens: ['[ ] Fazer janta das crianças', '[ ] Dar banho'] },
    ])
    expect(await cardsDoDia(DIA_2)).toEqual([
      { titulo: 'Casa', itens: ['[→] Fazer janta das crianças', '[→] Dar banho'] },
    ])
  })

  it('ida e volta de um item (2 → 3 → 2): nada duplicado e nenhum card fantasma', async () => {
    const { janta } = await casaNoDia2()
    await moverSelecao({ itens: [janta.id] }, DIA_3)

    const copia = await pendenteDoDia(DIA_3, janta.titulo)
    const resultado = await moverSelecao({ itens: [copia.id] }, DIA_2)

    expect(resultado.itensLevados).toBe(1)
    expect(await cardsDoDia(DIA_2)).toEqual([
      { titulo: 'Casa', itens: ['[ ] Fazer janta das crianças', '[ ] Dar banho'] },
    ])
    expect(await diasComCard()).toEqual([DIA_2])
    const original = await db.groupItems.get(janta.id)
    expect(original?.status).toBe('pendente')
    expect(original?.transferidoParaCardId).toBeUndefined()
  })

  it('ida e volta do grupo inteiro: mesmo resultado', async () => {
    const { card } = await casaNoDia2()
    await moverSelecao({ grupos: [card.id] }, DIA_3)
    const card3 = (await db.groupCards.where('data').equals(DIA_3).first())!

    await moverSelecao({ grupos: [card3.id] }, DIA_2)

    expect(await cardsDoDia(DIA_2)).toEqual([
      { titulo: 'Casa', itens: ['[ ] Fazer janta das crianças', '[ ] Dar banho'] },
    ])
    expect(await diasComCard()).toEqual([DIA_2])
  })

  it('cadeia 30 → 31 → 1 → 2 e volta para 1: reativa no dia 1', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: DIA_30 })
    let atual = await criarItem(card.id, 'Fazer janta')
    for (const dia of [DIA_31, DIA_1, DIA_2]) {
      await moverSelecao({ itens: [atual.id] }, dia)
      atual = await pendenteDoDia(dia, 'Fazer janta')
    }

    await moverSelecao({ itens: [atual.id] }, DIA_1)

    expect(await cardsDoDia(DIA_1)).toEqual([{ titulo: 'Casa', itens: ['[ ] Fazer janta'] }])
    expect(await cardsDoDia(DIA_31)).toEqual([{ titulo: 'Casa', itens: ['[→] Fazer janta'] }])
    expect(await cardsDoDia(DIA_30)).toEqual([{ titulo: 'Casa', itens: ['[→] Fazer janta'] }])
    expect(await diasComCard()).toEqual([DIA_30, DIA_31, DIA_1])
    expect(await db.groupItems.count()).toBe(3)
  })

  it('card criado à mão que fica vazio não é apagado', async () => {
    const { janta } = await casaNoDia2()
    await criarGrupo({ titulo: 'Casa', data: DIA_3 })
    await moverSelecao({ itens: [janta.id] }, DIA_3)

    await moverSelecao({ itens: [(await pendenteDoDia(DIA_3, janta.titulo)).id] }, DIA_2)

    expect(await cardsDoDia(DIA_3)).toEqual([{ titulo: 'Casa', itens: [] }])
    expect(await diasComCard()).toEqual([DIA_2, DIA_3])
  })

  it('Desfazer restaura exatamente o estado anterior (ida e volta)', async () => {
    const { card } = await casaNoDia2()
    const solta = await criarTarefa({ titulo: 'Pagar conta', data: DIA_2 })
    const inicial = await retrato()

    const ida = await moverSelecao({ tarefas: [solta.id], grupos: [card.id] }, DIA_3)
    const depoisDaIda = await retrato()
    const card3 = (await db.groupCards.where('data').equals(DIA_3).first())!
    const volta = await moverSelecao({ grupos: [card3.id] }, DIA_2)

    await desfazerAcao(volta)
    expect(await retrato()).toEqual(depoisDaIda)
    await desfazerAcao(ida)
    expect(await retrato()).toEqual(inicial)
  })

  it('Desfazer o adiar de cards em dias diferentes', async () => {
    const card30 = await criarGrupo({ titulo: 'Casa', data: DIA_30 })
    await criarItem(card30.id, 'Varrer')
    const card2 = await criarGrupo({ titulo: 'Casa', data: DIA_2 })
    await criarItem(card2.id, 'Lavar')
    const inicial = await retrato()

    const resultado = await adiarSelecao({ grupos: [card30.id, card2.id] }, DIA_31)
    expect(resultado.itensLevados).toBe(2)
    await desfazerAcao(resultado)

    expect(await retrato()).toEqual(inicial)
  })
})

describe('migração para o banco v6', () => {
  it('card que só tem cópias de outro dia fica marcado como criado por transferência', async () => {
    const nome = 'migracao-v6'
    const v5 = new Dexie(nome)
    v5.version(5).stores({
      groupSeries: 'id, titulo, categoryId',
      groupCards: 'id, seriesId, data, [seriesId+data]',
      groupItems: 'id, cardId, status, origemItemId',
    })
    const base = { criadoEm: '', atualizadoEm: '' }
    const card = { seriesId: 's', ordem: 1, arquivado: false, ...base }
    await v5.table('groupCards').bulkAdd([
      { id: 'manual', data: DIA_30, ...card },
      { id: 'copia', data: DIA_31, ...card },
      { id: 'vazio', data: DIA_1, ...card },
    ])
    const item = { ordem: 1, dataOriginal: DIA_30, ...base }
    await v5.table('groupItems').bulkAdd([
      { id: 'a', cardId: 'manual', titulo: 'A', status: 'transferido', ...item },
      { id: 'b', cardId: 'copia', titulo: 'A', status: 'pendente', origemItemId: 'a', ...item },
    ])
    v5.close()

    const novo = new MemoriaDatabase(nome)
    await novo.open()

    expect((await novo.groupCards.get('manual'))?.criadoPorTransferencia).toBe(false)
    expect((await novo.groupCards.get('copia'))?.criadoPorTransferencia).toBe(true)
    expect((await novo.groupCards.get('vazio'))?.criadoPorTransferencia).toBe(false)
    novo.close()
    await Dexie.delete(nome)
  })
})
