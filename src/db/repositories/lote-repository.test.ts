import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { definirAndamento } from '@/db/repositories/andamento-repository'
import { criarGrupo, criarItem, listarGruposEntre } from '@/db/repositories/group-repository'
import {
  colocarNoGrupoComDesfazer,
  moverLote,
  reordenarSubetapasEmLote,
  tirarDoGrupoComDesfazer,
} from '@/db/repositories/lote-repository'
import { adicionarAnexo } from '@/db/repositories/attachment-repository'
import { criarCategoria, criarSubcategoria } from '@/db/repositories/category-repository'
import { textoDoAviso } from '@/domain/categoria-no-grupo'
import { criarNota } from '@/db/repositories/note-repository'
import { definirPrioridade } from '@/db/repositories/prioridade-repository'
import { criarSubtarefa } from '@/db/repositories/subtask-repository'
import { criarTarefa, listarTarefasDoDia } from '@/db/repositories/task-repository'
import { sortForDisplay } from '@/domain/ordem-de-exibicao'
import { inserirBloco } from '@/domain/selecao-em-lote'
import { montarGrupos, pendentesDo } from '@/lib/grupos'
import { separarDoDia } from '@/lib/tarefas'

const DIA = '2026-11-05'

async function titulosDasSoltas() {
  return sortForDisplay(separarDoDia(await listarTarefasDoDia(DIA)).pendentes).map(
    (tarefa) => tarefa.titulo,
  )
}

async function criarSoltas(titulos: string[]) {
  const tarefas = []
  for (const titulo of titulos) tarefas.push(await criarTarefa({ titulo, data: DIA }))
  return tarefas
}

async function titulosDoCard(titulo: string) {
  const { cards, series, itens } = await listarGruposEntre(DIA, DIA)
  const grupo = montarGrupos(cards, series, itens).find((g) => g.serie.titulo === titulo)
  return grupo ? pendentesDo(grupo).map((item) => item.titulo) : []
}

describe('lote: reordenar dentro da lista', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('subir as 3 para o topo das pendentes comuns; o Desfazer devolve a ordem', async () => {
    const tarefas = await criarSoltas(['A', 'B', 'C', 'D', 'E'])
    const [, , c, d, e] = tarefas
    const lista = tarefas.map((tarefa) => tarefa.id)
    const ordemAntes = await db.tasks.toArray()

    const resultado = await moverLote({
      movidos: [c.id, d.id, e.id],
      destino: { tipo: 'soltas' },
      idsEmOrdemNoDestino: inserirBloco(lista, [c.id, d.id, e.id], tarefas[0].id),
    })

    expect(await titulosDasSoltas()).toEqual(['C', 'D', 'E', 'A', 'B'])
    expect(resultado.quantidade).toBe(3)
    // Só os movidos ganharam ordem nova.
    expect((await db.tasks.get(tarefas[0].id))?.ordem).toBe(
      ordemAntes.find((t) => t.titulo === 'A')?.ordem,
    )

    await resultado.desfazer()
    expect(await titulosDasSoltas()).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(await db.tasks.toArray()).toEqual(expect.arrayContaining(ordemAntes))
  })

  it('descer 2 para o fim e mover o do meio', async () => {
    const tarefas = await criarSoltas(['A', 'B', 'C', 'D'])
    const lista = tarefas.map((tarefa) => tarefa.id)
    await moverLote({
      movidos: [tarefas[0].id, tarefas[1].id],
      destino: { tipo: 'soltas' },
      idsEmOrdemNoDestino: inserirBloco(lista, [tarefas[0].id, tarefas[1].id], tarefas[3].id),
    })
    expect(await titulosDasSoltas()).toEqual(['C', 'D', 'A', 'B'])
  })

  it('o bloco não atravessa os blocos do topo: fica abaixo de prioridade e andamento', async () => {
    const tarefas = await criarSoltas(['A', 'B', 'C', 'D', 'E'])
    await definirPrioridade({ tarefas: [tarefas[0].id] }, true)
    await definirAndamento({ tarefas: [tarefas[1].id] }, true)
    // Exibido: B (andamento), A (prioridade)? Não: andamento antes de prioridade.
    expect(await titulosDasSoltas()).toEqual(['B', 'A', 'C', 'D', 'E'])

    // Subir D e E para cima de tudo.
    const exibido = ['B', 'A', 'C', 'D', 'E'].map((t) => tarefas.find((x) => x.titulo === t)!.id)
    const movidos = [tarefas[3].id, tarefas[4].id]
    await moverLote({
      movidos,
      destino: { tipo: 'soltas' },
      idsEmOrdemNoDestino: inserirBloco(exibido, movidos, exibido[0]),
    })
    expect(await titulosDasSoltas()).toEqual(['B', 'A', 'D', 'E', 'C'])
  })

  it('mexer num bloco do topo grava só a posição dos membros dele', async () => {
    const tarefas = await criarSoltas(['A', 'B', 'C'])
    await definirPrioridade({ tarefas: tarefas.map((t) => t.id) }, true)
    expect(await titulosDasSoltas()).toEqual(['A', 'B', 'C'])

    const movidos = [tarefas[1].id, tarefas[2].id]
    await moverLote({
      movidos,
      destino: { tipo: 'soltas' },
      idsEmOrdemNoDestino: inserirBloco(
        tarefas.map((t) => t.id),
        movidos,
        tarefas[0].id,
      ),
    })
    expect(await titulosDasSoltas()).toEqual(['B', 'C', 'A'])
    // A ordem salva não mudou (parar/tirar a marca devolve ao lugar).
    expect((await db.tasks.get(tarefas[1].id))?.ordem).toBe(2)
  })
})

describe('lote: levar para outra lista do mesmo dia', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('tarefas soltas para um card, numa operação; o Desfazer devolve as tarefas com subetapas e notas', async () => {
    const [a, b, c] = await criarSoltas(['A', 'B', 'C'])
    const card = await criarGrupo({ titulo: 'Casa', data: DIA })
    const base = await criarItem(card.id, 'Item base')
    await criarSubtarefa({ taskId: a.id, titulo: 'Sub de A' })
    await criarNota({ titulo: 'Nota de B', vinculo: { tipo: 'tarefa', id: b.id } })

    const resultado = await moverLote({
      movidos: [a.id, b.id],
      destino: { tipo: 'card', cardId: card.id },
      idsEmOrdemNoDestino: [a.id, b.id, base.id],
    })

    expect(await titulosDoCard('Casa')).toEqual(['A', 'B', 'Item base'])
    expect(await titulosDasSoltas()).toEqual(['C'])
    expect(await db.subtasks.where('taskId').equals(a.id).count()).toBe(1)
    expect((await db.notes.toArray())[0].vinculo).toEqual({ tipo: 'item', id: b.id })

    await resultado.desfazer()

    expect(await titulosDasSoltas()).toEqual(['A', 'B', 'C'])
    expect(await titulosDoCard('Casa')).toEqual(['Item base'])
    expect(await db.groupItems.get(a.id)).toBeUndefined()
    expect(await db.subtasks.where('taskId').equals(a.id).count()).toBe(1)
    expect((await db.notes.toArray())[0].vinculo).toEqual({ tipo: 'tarefa', id: b.id })
    expect(c.id).toBeTruthy()
  })

  it('itens de um card para as tarefas soltas e para outro card', async () => {
    const casa = await criarGrupo({ titulo: 'Casa', data: DIA })
    const trabalho = await criarGrupo({ titulo: 'Trabalho', data: DIA })
    const [x, y, z] = [
      await criarItem(casa.id, 'X'),
      await criarItem(casa.id, 'Y'),
      await criarItem(casa.id, 'Z'),
    ]
    await criarItem(trabalho.id, 'W')
    const [solta] = await criarSoltas(['Solta'])

    const paraSoltas = await moverLote({
      movidos: [x.id, y.id],
      destino: { tipo: 'soltas' },
      idsEmOrdemNoDestino: [solta.id, x.id, y.id],
    })
    expect(await titulosDasSoltas()).toEqual(['Solta', 'X', 'Y'])
    expect(await titulosDoCard('Casa')).toEqual(['Z'])

    const paraCard = await moverLote({
      movidos: [z.id],
      destino: { tipo: 'card', cardId: trabalho.id },
      idsEmOrdemNoDestino: [
        z.id,
        (await db.groupItems.where('cardId').equals(trabalho.id).first())!.id,
      ],
    })
    expect(await titulosDoCard('Trabalho')).toEqual(['Z', 'W'])

    // Desfazer na ordem contrária volta tudo.
    await paraCard.desfazer()
    await paraSoltas.desfazer()
    expect(await titulosDoCard('Casa')).toEqual(['X', 'Y', 'Z'])
    expect(await titulosDoCard('Trabalho')).toEqual(['W'])
    expect(await titulosDasSoltas()).toEqual(['Solta'])
  })
})

describe('lote: subetapas', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('reordena várias subetapas juntas e o Desfazer devolve a ordem', async () => {
    const [tarefa] = await criarSoltas(['Mudança'])
    const subs = []
    for (const titulo of ['1', '2', '3', '4', '5']) {
      subs.push(await criarSubtarefa({ taskId: tarefa.id, titulo }))
    }
    const ids = subs.map((s) => s.id)
    const movidos = [ids[2], ids[3]]
    const titulos = async () =>
      (await db.subtasks.where('taskId').equals(tarefa.id).sortBy('ordem')).map((s) => s.titulo)

    const resultado = await reordenarSubetapasEmLote(inserirBloco(ids, movidos, ids[0]), movidos)
    expect(await titulos()).toEqual(['3', '4', '1', '2', '5'])

    await resultado.desfazer()
    expect(await titulos()).toEqual(['1', '2', '3', '4', '5'])
  })
})

describe('categoria ao entrar no grupo ou sair dele', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  async function cenario() {
    const trabalho = await criarCategoria({ nome: 'Trabalho' })
    const casa = await criarCategoria({ nome: 'Casa' })
    const reunioes = await criarSubcategoria({ categoryId: trabalho.id, nome: 'Reuniões' })
    const cardCasa = await criarGrupo({ titulo: 'Casa', data: DIA, categoryId: casa.id })
    return { trabalho, casa, reunioes, cardCasa }
  }

  it('desfazer restaura categoria, subcategoria, dia, posição e anexos', async () => {
    const { trabalho, reunioes, cardCasa } = await cenario()
    const [, ligar] = await criarSoltas(['Antes', 'x'])
    await db.tasks.update(ligar.id, {
      titulo: 'Ligar para Fulano',
      categoryId: trabalho.id,
      subcategoryId: reunioes.id,
    })
    await criarSoltas(['Depois'])
    await adicionarAnexo({
      dono: { tipo: 'task', id: ligar.id },
      tipo: 'link',
      nome: 'Site',
      url: 'https://exemplo.com',
    })
    const antes = await db.tasks.get(ligar.id)

    const resultado = await colocarNoGrupoComDesfazer(ligar.id, cardCasa.id)
    expect(await db.tasks.get(ligar.id)).toBeUndefined()
    expect(await titulosDoCard('Casa')).toEqual(['Ligar para Fulano'])
    expect(textoDoAviso(resultado.avisos)).toBe(
      '"Ligar para Fulano" foi para o grupo Casa e deixou a categoria Trabalho › Reuniões.',
    )

    await resultado.desfazer()
    expect(await db.tasks.get(ligar.id)).toEqual(antes)
    expect(await db.groupItems.get(ligar.id)).toBeUndefined()
    expect(await titulosDasSoltas()).toEqual(['Antes', 'Ligar para Fulano', 'Depois'])
    expect(await db.attachments.count()).toBe(1)
  })

  it('mesma categoria ou tarefa sem categoria: sem aviso', async () => {
    const { casa, cardCasa } = await cenario()
    const [daCasa, semCategoria] = await criarSoltas(['Lavar', 'Varrer'])
    await db.tasks.update(daCasa.id, { categoryId: casa.id })
    expect((await colocarNoGrupoComDesfazer(daCasa.id, cardCasa.id)).avisos).toEqual([])
    expect((await colocarNoGrupoComDesfazer(semCategoria.id, cardCasa.id)).avisos).toEqual([])
  })

  it('item sai de grupo com categoria: fica sem categoria e avisa', async () => {
    const { cardCasa } = await cenario()
    const item = await criarItem(cardCasa.id, 'Lavar')
    const resultado = await tirarDoGrupoComDesfazer(item.id)
    expect(textoDoAviso(resultado.avisos)).toBe('"Lavar" saiu do grupo Casa e ficou sem categoria.')
    expect((await db.tasks.get(item.id))?.categoryId).toBeUndefined()
    await resultado.desfazer()
    expect(await titulosDoCard('Casa')).toEqual(['Lavar'])
  })

  it('lote: conta só as que mudaram e o Desfazer restaura todas', async () => {
    const { trabalho, casa, cardCasa } = await cenario()
    const [a, b, c, d] = await criarSoltas(['A', 'B', 'C', 'D'])
    await db.tasks.update(a.id, { categoryId: trabalho.id })
    await db.tasks.update(b.id, { categoryId: casa.id })
    const outra = await criarCategoria({ nome: 'Estudos' })
    await db.tasks.update(c.id, { categoryId: outra.id })
    const antes = await db.tasks.toArray()

    const movidos = [a.id, b.id, c.id, d.id]
    const resultado = await moverLote({
      movidos,
      destino: { tipo: 'card', cardId: cardCasa.id },
      idsEmOrdemNoDestino: movidos,
    })
    expect(resultado.avisos.map((aviso) => aviso.titulo)).toEqual(['A', 'C'])
    expect(textoDoAviso(resultado.avisos)).toBe('2 tarefas deixaram suas categorias.')

    await resultado.desfazer()
    expect(await db.tasks.toArray()).toEqual(antes)
    expect(await db.groupItems.count()).toBe(0)
  })
})
