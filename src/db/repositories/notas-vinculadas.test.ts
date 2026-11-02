import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { capturar, desfazerCaptura } from '@/db/repositories/captura-repository'
import {
  colocarNoGrupo,
  copiarItens,
  criarGrupo,
  criarItem,
  desfazerAcao,
  excluirGrupo,
  excluirItem,
  tirarDoGrupo,
} from '@/db/repositories/group-repository'
import {
  contarNotasQueFicamAvulsas,
  criarNota,
  listarNotasDe,
  vincularNota,
} from '@/db/repositories/note-repository'
import { criarTarefa, excluirTarefa, moverTarefas } from '@/db/repositories/task-repository'
import type { Vinculo } from '@/db/types'
import { vinculoDoItem } from '@/lib/notas'

const DIA_01 = '2026-11-01'
const DIA_02 = '2026-11-02'

async function textosDe(vinculo: Vinculo) {
  return (await listarNotasDe(vinculo)).map((nota) => nota.conteudo).sort()
}

/** "Hostinger" em 01/11 com o item "Fazer Deploy". */
async function criarHostinger() {
  const card = await criarGrupo({ titulo: 'Hostinger', data: DIA_01 })
  const deploy = await criarItem(card.id, 'Fazer Deploy')
  return { card, deploy }
}

async function itemNoDia(titulo: string, data: string) {
  const cards = await db.groupCards.where('data').equals(data).toArray()
  return db.groupItems
    .where('cardId')
    .anyOf(cards.map((card) => card.id))
    .filter((item) => item.titulo === titulo)
    .first()
}

describe('notas ligadas', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('liga a tarefa, grupo e item e lista as notas de cada um', async () => {
    const tarefa = await criarTarefa({ titulo: 'Ligar para Fulano', data: DIA_01 })
    const { card, deploy } = await criarHostinger()
    await criarNota({ conteudo: 'tarefa', vinculo: { tipo: 'tarefa', id: tarefa.id } })
    await criarNota({ conteudo: 'grupo', vinculo: { tipo: 'grupo', id: card.seriesId } })
    await criarNota({ conteudo: 'item 1', vinculo: vinculoDoItem(deploy) })
    await criarNota({ conteudo: 'item 2', vinculo: vinculoDoItem(deploy) })
    const avulsa = await criarNota({ conteudo: 'solta' })

    expect(await textosDe({ tipo: 'tarefa', id: tarefa.id })).toEqual(['tarefa'])
    expect(await textosDe({ tipo: 'grupo', id: card.seriesId })).toEqual(['grupo'])
    expect(await textosDe(vinculoDoItem(deploy))).toEqual(['item 1', 'item 2'])

    await vincularNota(avulsa.id, { tipo: 'tarefa', id: tarefa.id })
    expect(await textosDe({ tipo: 'tarefa', id: tarefa.id })).toEqual(['solta', 'tarefa'])
    await vincularNota(avulsa.id, undefined)
    expect((await db.notes.get(avulsa.id))?.vinculo).toBeUndefined()
  })

  it('item levado de 01/11 para 02/11: a mesma nota nos dois dias, ida, volta e desfazer', async () => {
    const { deploy } = await criarHostinger()
    await criarNota({ conteudo: 'escrita no dia 01', vinculo: vinculoDoItem(deploy) })

    const ida = await copiarItens([deploy.id], DIA_02)
    const copia = (await itemNoDia('Fazer Deploy', DIA_02))!
    expect(copia.id).not.toBe(deploy.id)
    expect(copia.cadeiaId).toBe(deploy.cadeiaId)
    await criarNota({ conteudo: 'escrita no dia 02', vinculo: vinculoDoItem(copia) })
    const ambas = ['escrita no dia 01', 'escrita no dia 02']
    expect(await textosDe(vinculoDoItem(deploy))).toEqual(ambas)
    expect(await textosDe(vinculoDoItem(copia))).toEqual(ambas)

    // Volta: reativa o original e apaga a cópia; as notas continuam, sem duplicar.
    const volta = await copiarItens([copia.id], DIA_01)
    expect(await db.groupItems.get(copia.id)).toBeUndefined()
    expect(await textosDe(vinculoDoItem(deploy))).toEqual(ambas)

    await desfazerAcao(volta)
    await desfazerAcao(ida)
    expect(await textosDe(vinculoDoItem(deploy))).toEqual(ambas)
    expect(await db.notes.count()).toBe(2)
  })

  it('tarefa solta movida de dia continua com a nota', async () => {
    const tarefa = await criarTarefa({ titulo: 'Ligar', data: DIA_01 })
    await criarNota({ conteudo: 'número', vinculo: { tipo: 'tarefa', id: tarefa.id } })
    await moverTarefas([tarefa.id], DIA_02)
    expect(await textosDe({ tipo: 'tarefa', id: tarefa.id })).toEqual(['número'])
  })

  it('excluir tarefa com notas: avisa e as notas viram avulsas, sem apagar', async () => {
    const tarefa = await criarTarefa({ titulo: 'Ligar', data: DIA_01 })
    await criarNota({ conteudo: 'a', vinculo: { tipo: 'tarefa', id: tarefa.id } })
    await criarNota({ conteudo: 'b', vinculo: { tipo: 'tarefa', id: tarefa.id } })
    expect(await contarNotasQueFicamAvulsas({ tipo: 'tarefa', id: tarefa.id })).toBe(2)

    await excluirTarefa(tarefa.id)
    const notas = await db.notes.toArray()
    expect(notas.map((nota) => [nota.conteudo, nota.vinculo]).sort()).toEqual([
      ['a', undefined],
      ['b', undefined],
    ])
  })

  it('excluir um dia do item mantém a nota nos outros; o último deixa a nota avulsa', async () => {
    const { deploy } = await criarHostinger()
    await criarNota({ conteudo: 'nota', vinculo: vinculoDoItem(deploy) })
    await copiarItens([deploy.id], DIA_02)
    const copia = (await itemNoDia('Fazer Deploy', DIA_02))!

    expect(await contarNotasQueFicamAvulsas({ tipo: 'item', id: deploy.id })).toBe(0)
    await excluirItem(deploy.id)
    expect(await textosDe(vinculoDoItem(copia))).toEqual(['nota'])

    expect(await contarNotasQueFicamAvulsas({ tipo: 'item', id: copia.id })).toBe(1)
    await excluirItem(copia.id)
    const [nota] = await db.notes.toArray()
    expect(nota).toMatchObject({ conteudo: 'nota' })
    expect(nota.vinculo).toBeUndefined()
  })

  it('excluir o último card do grupo deixa avulsas as notas do grupo e dos itens', async () => {
    const { card, deploy } = await criarHostinger()
    const outro = await criarGrupo({ titulo: 'Hostinger', data: DIA_02 })
    await criarNota({ conteudo: 'grupo', vinculo: { tipo: 'grupo', id: card.seriesId } })
    await criarNota({ conteudo: 'item', vinculo: vinculoDoItem(deploy) })

    // Ainda há o card de 02/11: a nota do grupo fica; a do item (só em 01/11) vira avulsa.
    expect(await contarNotasQueFicamAvulsas({ tipo: 'card', id: card.id })).toBe(1)
    await excluirGrupo(card.id)
    expect(await textosDe({ tipo: 'grupo', id: card.seriesId })).toEqual(['grupo'])

    expect(await contarNotasQueFicamAvulsas({ tipo: 'card', id: outro.id })).toBe(1)
    await excluirGrupo(outro.id)
    const notas = await db.notes.toArray()
    expect(notas).toHaveLength(2)
    expect(notas.every((nota) => nota.vinculo === undefined)).toBe(true)
  })

  it('colocar no grupo e tirar do grupo: a nota acompanha', async () => {
    const { card } = await criarHostinger()
    const tarefa = await criarTarefa({ titulo: 'Renovar domínio', data: DIA_01 })
    await criarNota({ conteudo: 'vence dia 10', vinculo: { tipo: 'tarefa', id: tarefa.id } })

    await colocarNoGrupo(tarefa.id, card.id)
    const item = (await db.groupItems.get(tarefa.id))!
    expect(item.cadeiaId).toBe(tarefa.id)
    expect(await textosDe(vinculoDoItem(item))).toEqual(['vence dia 10'])

    // Levado a 02/11 e tirado do grupo lá: a nota vai junto com a tarefa nova.
    await copiarItens([item.id], DIA_02)
    const copia = (await itemNoDia('Renovar domínio', DIA_02))!
    await tirarDoGrupo(copia.id)
    expect(await textosDe({ tipo: 'tarefa', id: copia.id })).toEqual(['vence dia 10'])
    expect(await textosDe(vinculoDoItem(item))).toEqual([])
  })

  it('a captura grava as linhas extras como nota da tarefa; desfazer apaga só ela', async () => {
    const resultado = await capturar({
      tipo: 'tarefa',
      titulo: 'Pagar luz',
      data: DIA_01,
      anotacao: 'código de barras',
    })
    if (resultado.tipo !== 'tarefa') throw new Error('esperava tarefa')
    expect(await textosDe({ tipo: 'tarefa', id: resultado.id })).toEqual(['código de barras'])
    await criarNota({ conteudo: 'escrita depois', vinculo: { tipo: 'tarefa', id: resultado.id } })

    await desfazerCaptura(resultado)
    const notas = await db.notes.toArray()
    expect(notas.map((nota) => [nota.conteudo, nota.vinculo])).toEqual([
      ['escrita depois', undefined],
    ])
  })
})
