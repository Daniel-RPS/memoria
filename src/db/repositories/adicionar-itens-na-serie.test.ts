import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import {
  adicionarItensNaSerie,
  arquivarGrupo,
  criarGrupo,
  criarItem,
  desfazerItensAdicionados,
} from '@/db/repositories/group-repository'
import { criarTarefa } from '@/db/repositories/task-repository'
import { ErroDeValidacao } from '@/lib/erros'

const HOJE = '2026-11-02'
const AMANHA = '2026-11-03'

async function itensDoCard(cardId: string) {
  const itens = await db.groupItems.where('cardId').equals(cardId).sortBy('ordem')
  return itens.map(({ titulo, status, dataOriginal }) => ({ titulo, status, dataOriginal }))
}

describe('adicionarItensNaSerie', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('com card da série no dia: o item entra no fim, sem criar card novo', async () => {
    const casa = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await criarItem(casa.id, 'Varrer')

    const resultado = await adicionarItensNaSerie(casa.seriesId, HOJE, ['Fazer lasanha'])

    expect(resultado).toMatchObject({ cardId: casa.id, card: 'existente' })
    expect(await db.groupCards.count()).toBe(1)
    expect(await itensDoCard(casa.id)).toEqual([
      { titulo: 'Varrer', status: 'pendente', dataOriginal: HOJE },
      { titulo: 'Fazer lasanha', status: 'pendente', dataOriginal: HOJE },
    ])
  })

  it('sem card no dia: cria o card da série no fim do dia e os itens na ordem', async () => {
    const casa = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await criarTarefa({ titulo: 'Já estava amanhã', data: AMANHA })

    const resultado = await adicionarItensNaSerie(casa.seriesId, AMANHA, [
      'Fazer lasanha',
      '  Comprar queijo  ',
      '',
      'Lavar a forma',
    ])

    expect(resultado.card).toBe('criado')
    const card = await db.groupCards.get(resultado.cardId)
    expect(card).toMatchObject({ seriesId: casa.seriesId, data: AMANHA, ordem: 2 })
    expect(card?.criadoPorTransferencia).toBeFalsy()
    expect(resultado.idsItens).toHaveLength(3)
    expect(await itensDoCard(resultado.cardId)).toEqual([
      { titulo: 'Fazer lasanha', status: 'pendente', dataOriginal: AMANHA },
      { titulo: 'Comprar queijo', status: 'pendente', dataOriginal: AMANHA },
      { titulo: 'Lavar a forma', status: 'pendente', dataOriginal: AMANHA },
    ])
  })

  it('card arquivado no dia é reaberto e recebe os itens', async () => {
    const casa = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await arquivarGrupo(casa.id)

    const resultado = await adicionarItensNaSerie(casa.seriesId, HOJE, ['Fazer lasanha'])

    expect(resultado).toMatchObject({ cardId: casa.id, card: 'reaberto' })
    expect(await db.groupCards.get(casa.id)).toMatchObject({ arquivado: false })
  })

  it('sem nenhum item preenchido é recusado', async () => {
    const casa = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await expect(adicionarItensNaSerie(casa.seriesId, HOJE, [' ', ''])).rejects.toBeInstanceOf(
      ErroDeValidacao,
    )
  })

  it('desfazer: tira só os itens novos; card criado some, reaberto volta a arquivado', async () => {
    const casa = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await criarItem(casa.id, 'Varrer')
    const noExistente = await adicionarItensNaSerie(casa.seriesId, HOJE, ['A', 'B'])
    await desfazerItensAdicionados(noExistente)
    expect((await itensDoCard(casa.id)).map((item) => item.titulo)).toEqual(['Varrer'])

    const criado = await adicionarItensNaSerie(casa.seriesId, AMANHA, ['C'])
    await desfazerItensAdicionados(criado)
    expect(await db.groupCards.get(criado.cardId)).toBeUndefined()
    expect(await db.groupSeries.count()).toBe(1)

    const outro = await criarGrupo({ titulo: 'Mercado', data: AMANHA })
    await arquivarGrupo(outro.id)
    const reaberto = await adicionarItensNaSerie(outro.seriesId, AMANHA, ['Café'])
    await desfazerItensAdicionados(reaberto)
    expect(await db.groupCards.get(outro.id)).toMatchObject({ arquivado: true })
    expect(await db.groupItems.where('cardId').equals(outro.id).count()).toBe(0)
  })
})
