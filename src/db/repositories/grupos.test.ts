import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { exportarDados, importarDados, versaoDoBanco } from '@/db/repositories/backup-repository'
import { criarCategoria, excluirCategoria } from '@/db/repositories/category-repository'
import {
  adiarGrupos,
  arquivarGrupo,
  colocarNoGrupo,
  criarGrupo,
  criarItem,
  definirCategoriaDoGrupo,
  excluirGrupo,
  moverGrupos,
  moverTarefasEGrupos,
  renomearGrupo,
  tirarDoGrupo,
} from '@/db/repositories/group-repository'
import {
  arquivarTarefa,
  criarTarefa,
  definirConclusao,
  listarPendenciasDeOntem,
  moverTarefas,
  restaurarPosicoes,
  trazerPendenciasDeOntem,
} from '@/db/repositories/task-repository'
import { lerBackup } from '@/lib/backup'
import { ErroDeValidacao } from '@/lib/erros'
import { diasPendente } from '@/lib/tarefas'

const DIA_30 = '2026-10-30'
const DIA_31 = '2026-10-31'
const ONTEM = '2026-10-29'

/** Cards visíveis do dia com os itens: `{ titulo, itens: ['x', '✓ y'] }`. */
async function cardsDoDia(data: string) {
  const instancias = (await db.groupInstances.where('data').equals(data).sortBy('ordem')).filter(
    (instancia) => !instancia.arquivado,
  )
  return Promise.all(
    instancias.map(async (instancia) => {
      const serie = await db.groupSeries.get(instancia.seriesId)
      const itens = await db.tasks.where('groupInstanceId').equals(instancia.id).sortBy('ordem')
      return {
        titulo: serie?.titulo,
        itens: itens
          .filter((item) => item.status !== 'arquivada')
          .map((item) => (item.status === 'concluida' ? `✓ ${item.titulo}` : item.titulo)),
      }
    }),
  )
}

async function criarCasa(data = DIA_30) {
  const card = await criarGrupo({ titulo: 'Casa', data })
  const itens = []
  for (const titulo of [
    'Limpar o quarto',
    'Limpar o banheiro',
    'Regar as plantas',
    'Fazer almoço',
  ]) {
    itens.push(await criarItem(card.id, titulo))
  }
  return { card, itens }
}

describe('grupos de tarefas', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('cenário completo: mover leva só os pendentes, concluídos ficam, itens novos e mescla', async () => {
    // 1 e 2: dia 30 com 4 itens, 3 marcados.
    const { card, itens } = await criarCasa()
    for (const item of itens.slice(0, 3)) await definirConclusao(item.id, true)

    // 3: arrasta o card para o dia 31.
    const resultado = await moverGrupos([card.id], DIA_31)
    expect(resultado.quantidade).toBe(1)

    // 4: dia 30 fica com os 3 concluídos; dia 31 tem "Fazer almoço" pendente desde o dia 30.
    expect(await cardsDoDia(DIA_30)).toEqual([
      {
        titulo: 'Casa',
        itens: ['✓ Limpar o quarto', '✓ Limpar o banheiro', '✓ Regar as plantas'],
      },
    ])
    expect(await cardsDoDia(DIA_31)).toEqual([{ titulo: 'Casa', itens: ['Fazer almoço'] }])
    const almoco = await db.tasks.get(itens[3].id)
    expect(almoco).toMatchObject({ data: DIA_31, dataOriginal: DIA_30, status: 'pendente' })
    expect(diasPendente(almoco!, DIA_31)).toBe(1)
    // O card do dia 30 continua o mesmo (mesmo id); o do 31 é outra instância da mesma série.
    const card31 = await db.groupInstances.get(almoco!.groupInstanceId!)
    expect(card31).toMatchObject({ seriesId: card.seriesId, data: DIA_31 })
    expect(card31!.id).not.toBe(card.id)
    expect(await db.groupInstances.get(card.id)).toMatchObject({ data: DIA_30 })

    // 5: itens novos no card do dia 31.
    await criarItem(card31!.id, 'Limpar a garagem')
    await criarItem(card31!.id, 'Lavar a roupa')
    expect(await cardsDoDia(DIA_31)).toEqual([
      { titulo: 'Casa', itens: ['Fazer almoço', 'Limpar a garagem', 'Lavar a roupa'] },
    ])

    // 6: um card "Casa" com pendentes em outro dia mescla no do dia 31, sem duplicar.
    const card29 = await criarGrupo({ titulo: 'casa', data: ONTEM })
    expect(card29.seriesId).toBe(card.seriesId)
    await criarItem(card29.id, 'Trocar a lâmpada')
    await moverGrupos([card29.id], DIA_31)
    expect(await cardsDoDia(DIA_31)).toEqual([
      {
        titulo: 'Casa',
        itens: ['Fazer almoço', 'Limpar a garagem', 'Lavar a roupa', 'Trocar a lâmpada'],
      },
    ])
    expect(await cardsDoDia(ONTEM)).toEqual([])
    expect(await db.groupSeries.count()).toBe(1)
  })

  it('sem itens concluídos, o card vai inteiro e não sobra card vazio', async () => {
    const { card } = await criarCasa()

    await moverGrupos([card.id], DIA_31)

    expect(await cardsDoDia(DIA_30)).toEqual([])
    expect(await db.groupInstances.count()).toBe(1)
    expect(await db.groupInstances.get(card.id)).toMatchObject({ data: DIA_31 })
    expect((await cardsDoDia(DIA_31))[0].itens).toHaveLength(4)
  })

  it('card vazio também muda de dia', async () => {
    const card = await criarGrupo({ titulo: 'Mercado', data: DIA_30 })

    const resultado = await moverGrupos([card.id], DIA_31)

    expect(resultado.gruposVaziosMovidos).toBe(1)
    expect(await db.groupInstances.get(card.id)).toMatchObject({ data: DIA_31 })
  })

  it('com tudo concluído, o card não pode ser movido', async () => {
    const { card, itens } = await criarCasa()
    for (const item of itens) await definirConclusao(item.id, true)

    const resultado = await moverGrupos([card.id], DIA_31)

    expect(resultado.quantidade).toBe(0)
    expect(await cardsDoDia(DIA_31)).toEqual([])
    expect((await cardsDoDia(DIA_30))[0].itens).toHaveLength(4)
  })

  it('mescla em card já existente sem duplicar itens nem cards', async () => {
    const { card } = await criarCasa()
    const destino = await criarGrupo({ titulo: 'Casa', data: DIA_31 })
    await criarItem(destino.id, 'Lavar a roupa')

    await moverGrupos([card.id], DIA_31)

    expect(await db.groupInstances.where('data').equals(DIA_31).count()).toBe(1)
    expect(await cardsDoDia(DIA_31)).toEqual([
      {
        titulo: 'Casa',
        itens: [
          'Lavar a roupa',
          'Limpar o quarto',
          'Limpar o banheiro',
          'Regar as plantas',
          'Fazer almoço',
        ],
      },
    ])
    expect(await db.tasks.count()).toBe(5)
    expect(await db.groupInstances.count()).toBe(1)
  })

  it('item sozinho vai para o card da mesma série no outro dia (criando se precisar)', async () => {
    const { itens } = await criarCasa()

    await moverTarefas([itens[0].id], DIA_31)
    expect(await cardsDoDia(DIA_31)).toEqual([{ titulo: 'Casa', itens: ['Limpar o quarto'] }])

    await moverTarefas([itens[1].id], DIA_31)
    expect(await cardsDoDia(DIA_31)).toEqual([
      { titulo: 'Casa', itens: ['Limpar o quarto', 'Limpar o banheiro'] },
    ])
    expect((await cardsDoDia(DIA_30))[0].itens).toEqual(['Regar as plantas', 'Fazer almoço'])
  })

  it('trazer pendências de ontem leva soltas e itens, mesclando nos cards de hoje', async () => {
    const solta = await criarTarefa({ titulo: 'Pagar conta', data: ONTEM })
    const feita = await criarTarefa({ titulo: 'Já feita', data: ONTEM })
    await definirConclusao(feita.id, true)
    const casaOntem = await criarGrupo({ titulo: 'Casa', data: ONTEM })
    const quarto = await criarItem(casaOntem.id, 'Limpar o quarto')
    const almoco = await criarItem(casaOntem.id, 'Fazer almoço')
    await definirConclusao(quarto.id, true)
    const mercado = await criarGrupo({ titulo: 'Mercado', data: ONTEM })
    await criarItem(mercado.id, 'Pão')
    const casaHoje = await criarGrupo({ titulo: 'Casa', data: DIA_30 })
    await criarItem(casaHoje.id, 'Lavar a roupa')

    expect(await listarPendenciasDeOntem(DIA_30)).toHaveLength(3)
    const resultado = await trazerPendenciasDeOntem(DIA_30)

    expect(resultado.quantidade).toBe(3)
    const trazida = await db.tasks.get(solta.id)
    expect(trazida?.data).toBe(DIA_30)
    expect(trazida?.groupInstanceId).toBeUndefined()
    expect(await cardsDoDia(DIA_30)).toEqual([
      { titulo: 'Casa', itens: ['Lavar a roupa', 'Fazer almoço'] },
      { titulo: 'Mercado', itens: ['Pão'] },
    ])
    expect(await cardsDoDia(ONTEM)).toEqual([{ titulo: 'Casa', itens: ['✓ Limpar o quarto'] }])
    expect(await db.tasks.get(almoco.id)).toMatchObject({ dataOriginal: ONTEM })
    expect(await db.tasks.get(feita.id)).toMatchObject({ data: ONTEM })
  })

  it('Desfazer volta itens e cards como estavam', async () => {
    const { card, itens } = await criarCasa()
    await definirConclusao(itens[0].id, true)
    const antes = await cardsDoDia(DIA_30)

    const resultado = await moverGrupos([card.id], DIA_31)
    await restaurarPosicoes(resultado.anteriores, resultado.grupos)

    expect(await cardsDoDia(DIA_30)).toEqual(antes)
    expect(await cardsDoDia(DIA_31)).toEqual([])
    expect(await db.groupInstances.count()).toBe(1)
  })

  it('Desfazer depois de mover o card inteiro devolve o mesmo card ao dia', async () => {
    const { card } = await criarCasa()

    const resultado = await moverGrupos([card.id], DIA_31)
    await restaurarPosicoes(resultado.anteriores, resultado.grupos)

    expect(await db.groupInstances.get(card.id)).toMatchObject({ data: DIA_30 })
    expect((await cardsDoDia(DIA_30))[0].itens).toHaveLength(4)
  })

  it('adiar o card leva os pendentes para o dia seguinte', async () => {
    const { card, itens } = await criarCasa()
    await definirConclusao(itens[0].id, true)

    await adiarGrupos([card.id], DIA_30)

    expect((await cardsDoDia(DIA_31))[0].itens).toHaveLength(3)
  })

  it('seleção múltipla com card e tarefa solta', async () => {
    const { card } = await criarCasa()
    const solta = await criarTarefa({ titulo: 'Pagar conta', data: DIA_30 })

    const resultado = await moverTarefasEGrupos([solta.id], [card.id], DIA_31)

    expect(resultado.quantidade).toBe(5)
    expect(await db.tasks.where('data').equals(DIA_31).count()).toBe(5)
  })

  it('tarefa solta entra no grupo (com a categoria dele) e item sai virando solta', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const card = await criarGrupo({ titulo: 'Casa', data: DIA_30, categoryId: casa.id })
    const solta = await criarTarefa({ titulo: 'Varrer', data: DIA_30 })

    await colocarNoGrupo(solta.id, card.id)
    expect(await db.tasks.get(solta.id)).toMatchObject({
      groupInstanceId: card.id,
      categoryId: casa.id,
    })

    await tirarDoGrupo(solta.id)
    const fora = await db.tasks.get(solta.id)
    expect(fora?.groupInstanceId).toBeUndefined()
    expect(fora?.ordem).toBeGreaterThan(card.ordem)
  })

  it('categoria do grupo vale para todos os cards e itens da série', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const { card, itens } = await criarCasa()
    await moverTarefas([itens[0].id], DIA_31)

    await definirCategoriaDoGrupo(card.seriesId, { categoryId: casa.id })
    expect(await db.tasks.where('categoryId').equals(casa.id).count()).toBe(4)

    await excluirCategoria(casa.id)
    expect((await db.groupSeries.get(card.seriesId))?.categoryId).toBeUndefined()
    expect(await db.tasks.count()).toBe(4)
  })

  it('nome repetido: mesmo dia é recusado; renomear para nome de outra série também', async () => {
    await criarGrupo({ titulo: 'Casa', data: DIA_30 })
    const mercado = await criarGrupo({ titulo: 'Mercado', data: DIA_30 })

    await expect(criarGrupo({ titulo: 'CASA', data: DIA_30 })).rejects.toThrow(ErroDeValidacao)
    await expect(renomearGrupo(mercado.seriesId, 'Casa')).rejects.toThrow(ErroDeValidacao)
  })

  it('arquivar: item sozinho e card inteiro', async () => {
    const { card, itens } = await criarCasa()
    await arquivarTarefa(itens[3].id)
    expect((await cardsDoDia(DIA_30))[0].itens).toHaveLength(3)

    await definirConclusao(itens[0].id, true)
    await arquivarGrupo(card.id)
    // Com um concluído, o card fica como registro.
    expect(await cardsDoDia(DIA_30)).toEqual([{ titulo: 'Casa', itens: ['✓ Limpar o quarto'] }])

    const outro = await criarGrupo({ titulo: 'Mercado', data: DIA_30 })
    await criarItem(outro.id, 'Pão')
    await arquivarGrupo(outro.id)
    expect(await cardsDoDia(DIA_30)).toHaveLength(1)
  })

  it('excluir o card apaga itens, anotações e a série sem cards', async () => {
    const { card, itens } = await criarCasa()
    await db.notes.add({
      id: 'n',
      titulo: '',
      conteudo: 'obs',
      dono: { tipo: 'task', id: itens[0].id },
      criadoEm: '',
      atualizadoEm: '',
    })

    await excluirGrupo(card.id)

    expect(await db.tasks.count()).toBe(0)
    expect(await db.notes.count()).toBe(0)
    expect(await db.groupInstances.count()).toBe(0)
    expect(await db.groupSeries.count()).toBe(0)
  })

  it('exportar e importar backup com grupos', async () => {
    const { card, itens } = await criarCasa()
    await definirConclusao(itens[0].id, true)
    await moverGrupos([card.id], DIA_31)
    const antes = {
      dia30: await cardsDoDia(DIA_30),
      dia31: await cardsDoDia(DIA_31),
    }

    const arquivo = JSON.stringify(await exportarDados())
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    const leitura = lerBackup(arquivo, versaoDoBanco())
    expect(leitura.isValido).toBe(true)
    if (!leitura.isValido) return
    await importarDados(leitura.backup)

    expect(await db.groupSeries.count()).toBe(1)
    expect(await db.groupInstances.count()).toBe(2)
    expect({ dia30: await cardsDoDia(DIA_30), dia31: await cardsDoDia(DIA_31) }).toEqual(antes)
  })
})
