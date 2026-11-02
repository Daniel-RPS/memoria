import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import {
  capturar,
  desfazerCaptura,
  type ResultadoCaptura,
} from '@/db/repositories/captura-repository'
import { criarCategoria, criarSubcategoria } from '@/db/repositories/category-repository'
import { arquivarGrupo, criarGrupo, criarItem } from '@/db/repositories/group-repository'
import { criarTarefa } from '@/db/repositories/task-repository'
import { ErroDeValidacao } from '@/lib/erros'

const HOJE = '2026-11-02'
const AMANHA = '2026-11-03'

/** Id da tarefa ou do card criado/usado. */
function idDe(resultado: ResultadoCaptura) {
  return resultado.tipo === 'tarefa' ? resultado.id : resultado.cardId
}

async function itensDoCard(cardId: string) {
  const itens = await db.groupItems.where('cardId').equals(cardId).sortBy('ordem')
  return itens.map((item) => item.titulo)
}

describe('captura rápida (repositório)', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('cria tarefa com categoria, subcategoria e dia, no fim do dia', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const jardim = await criarSubcategoria({ categoryId: casa.id, nome: 'Jardim' })
    await criarTarefa({ titulo: 'Já estava', data: AMANHA })

    const resultado = await capturar({
      tipo: 'tarefa',
      titulo: 'Podar a roseira',
      data: AMANHA,
      categoryId: casa.id,
      subcategoryId: jardim.id,
    })

    expect(await db.tasks.get(idDe(resultado))).toMatchObject({
      titulo: 'Podar a roseira',
      data: AMANHA,
      dataOriginal: AMANHA,
      status: 'pendente',
      categoryId: casa.id,
      subcategoryId: jardim.id,
      ordem: 2,
    })
  })

  it('grava os anexos junto com a tarefa; desfazer apaga a tarefa e os anexos', async () => {
    const foto = new Blob([new Uint8Array([1, 2])], { type: 'image/png' })
    const resultado = await capturar({
      tipo: 'tarefa',
      titulo: 'Manual',
      data: AMANHA,
      anexos: [
        { tipo: 'link', nome: 'Site', url: 'https://exemplo.com' },
        { tipo: 'foto', nome: 'Foto', blob: foto },
      ],
    })
    const anexos = await db.attachments.toArray()
    expect(anexos.map((anexo) => anexo.tipo).sort()).toEqual(['foto', 'link'])
    expect(anexos.every((anexo) => anexo.dono.id === idDe(resultado))).toBe(true)

    await desfazerCaptura(resultado)
    expect(await db.tasks.count()).toBe(0)
    expect(await db.attachments.count()).toBe(0)
  })

  it('grava as linhas extras como nota ligada à tarefa; desfazer apaga as duas', async () => {
    const resultado = await capturar({
      tipo: 'tarefa',
      titulo: 'Comprar tinta',
      data: HOJE,
      anotacao: 'Cor: areia\nDois galões',
    })
    expect(await db.notes.toArray()).toEqual([
      expect.objectContaining({
        conteudo: 'Cor: areia\nDois galões',
        vinculo: { tipo: 'tarefa', id: idDe(resultado) },
      }),
    ])

    await desfazerCaptura(resultado)
    expect(await db.tasks.count()).toBe(0)
    expect(await db.notes.count()).toBe(0)
  })

  it('cria grupo com categoria, dia e os itens preenchidos, em ordem; desfazer apaga tudo', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })

    const resultado = await capturar({
      tipo: 'grupo',
      titulo: 'Mercado',
      data: AMANHA,
      categoryId: casa.id,
      itens: ['Café', '  ', 'Pão', 'Leite'],
    })

    const card = await db.groupCards.get(idDe(resultado))
    expect(card).toMatchObject({ data: AMANHA, arquivado: false })
    expect(await db.groupSeries.get(card!.seriesId)).toMatchObject({
      titulo: 'Mercado',
      categoryId: casa.id,
    })
    const itens = await db.groupItems.where('cardId').equals(idDe(resultado)).sortBy('ordem')
    expect(itens.map((item) => [item.titulo, item.status, item.dataOriginal])).toEqual([
      ['Café', 'pendente', AMANHA],
      ['Pão', 'pendente', AMANHA],
      ['Leite', 'pendente', AMANHA],
    ])

    await desfazerCaptura(resultado)
    expect(await db.groupCards.count()).toBe(0)
    expect(await db.groupItems.count()).toBe(0)
    expect(await db.groupSeries.count()).toBe(0)
  })

  it('grupo com nome + 3 itens: série, card e itens juntos, na ordem, sem as linhas vazias', async () => {
    const resultado = await capturar({
      tipo: 'grupo',
      titulo: 'Casa',
      data: HOJE,
      itens: ['', 'Lavar roupa', ' ', 'Fazer comida', 'Regar plantas', ''],
    })

    expect(resultado).toMatchObject({ tipo: 'grupo', card: 'criado', data: HOJE })
    expect(resultado.tipo !== 'tarefa' && resultado.idsItens).toHaveLength(3)
    expect(await db.groupSeries.count()).toBe(1)
    expect(await db.groupCards.count()).toBe(1)
    const itens = await db.groupItems.where('cardId').equals(idDe(resultado)).sortBy('ordem')
    expect(itens.map((item) => [item.titulo, item.status, item.dataOriginal])).toEqual([
      ['Lavar roupa', 'pendente', HOJE],
      ['Fazer comida', 'pendente', HOJE],
      ['Regar plantas', 'pendente', HOJE],
    ])

    await desfazerCaptura(resultado)
    expect(await db.groupSeries.count()).toBe(0)
    expect(await db.groupCards.count()).toBe(0)
    expect(await db.groupItems.count()).toBe(0)
  })

  it('"Em grupo…" só com linhas vazias é recusado sem criar nada', async () => {
    const casa = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await expect(
      capturar({ tipo: 'em-grupo', seriesId: casa.seriesId, data: AMANHA, itens: ['', ' '] }),
    ).rejects.toBeInstanceOf(ErroDeValidacao)
    expect(await db.groupCards.count()).toBe(1)
    expect(await db.groupItems.count()).toBe(0)
  })

  it('grupo que já existe no dia é recusado sem criar nada', async () => {
    await criarGrupo({ titulo: 'Mercado', data: AMANHA })
    await expect(
      capturar({ tipo: 'grupo', titulo: 'mercado', data: AMANHA, itens: ['Café'] }),
    ).rejects.toBeInstanceOf(ErroDeValidacao)
    expect(await db.groupItems.count()).toBe(0)
  })

  it('desfazer num card arquivado que foi reaberto só tira os itens novos e arquiva de novo', async () => {
    const antigo = await criarGrupo({ titulo: 'Mercado', data: AMANHA })
    const velho = await criarItem(antigo.id, 'Arroz')
    await arquivarGrupo(antigo.id)

    const resultado = await capturar({
      tipo: 'grupo',
      titulo: 'Mercado',
      data: AMANHA,
      itens: ['Café'],
    })
    expect(resultado).toMatchObject({ cardId: antigo.id, card: 'reaberto' })

    await desfazerCaptura(resultado)
    expect(await db.groupCards.get(antigo.id)).toMatchObject({ arquivado: true })
    expect((await db.groupItems.toArray()).map((item) => item.id)).toEqual([velho.id])
  })

  it('"Em grupo…": as linhas preenchidas viram itens no card que já existe no dia', async () => {
    const casa = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await criarItem(casa.id, 'Varrer')

    const resultado = await capturar({
      tipo: 'em-grupo',
      data: HOJE,
      seriesId: casa.seriesId,
      itens: ['Fazer lasanha', '', 'Lavar a louça'],
    })

    expect(resultado).toMatchObject({ tipo: 'em-grupo', cardId: casa.id, card: 'existente' })
    expect(await db.groupCards.count()).toBe(1)
    expect(await itensDoCard(casa.id)).toEqual(['Varrer', 'Fazer lasanha', 'Lavar a louça'])

    await desfazerCaptura(resultado)
    expect(await itensDoCard(casa.id)).toEqual(['Varrer'])
    expect(await db.groupCards.get(casa.id)).toBeDefined()
  })

  it('"Em grupo…" num dia sem card cria o card da série; desfazer tira o card e mantém a série', async () => {
    const casa = await criarGrupo({ titulo: 'Casa', data: HOJE })

    const resultado = await capturar({
      tipo: 'em-grupo',
      data: AMANHA,
      seriesId: casa.seriesId,
      itens: ['Fazer lasanha'],
    })

    expect(resultado).toMatchObject({ card: 'criado', data: AMANHA })
    expect(await itensDoCard(idDe(resultado))).toEqual(['Fazer lasanha'])

    await desfazerCaptura(resultado)
    expect((await db.groupCards.toArray()).map((card) => card.id)).toEqual([casa.id])
    expect(await db.groupSeries.count()).toBe(1)
  })
})
