import { beforeEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { db, MemoriaDatabase } from '@/db/database'
import { exportarDados, importarDados, versaoDoBanco } from '@/db/repositories/backup-repository'
import {
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
    expect(resultado.itensCopiados).toBe(1)

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

    expect(resultado.itensCopiados).toBe(0)
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

    expect(resultado).toMatchObject({ tarefasMovidas: 1, itensCopiados: 1 })
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

    expect(resultado).toMatchObject({ tarefasMovidas: 1, itensCopiados: 1 })
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
