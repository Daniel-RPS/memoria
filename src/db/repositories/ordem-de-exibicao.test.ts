import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { exportarDados, importarDados, versaoDoBanco } from '@/db/repositories/backup-repository'
import { definirAndamento } from '@/db/repositories/andamento-repository'
import { criarGrupo, criarItem, listarGruposEntre } from '@/db/repositories/group-repository'
import { definirPrioridade } from '@/db/repositories/prioridade-repository'
import { criarTarefa, listarTarefasDoDia } from '@/db/repositories/task-repository'
import { gravarReordenacao, reordenarNoTopo } from '@/db/repositories/topo-repository'
import { planejarGravacao, blocoDe } from '@/domain/ordem-de-exibicao'
import { intercalarNoDia, montarGrupos, pendentesDo } from '@/lib/grupos'
import { lerBackup } from '@/lib/backup'
import { separarDoDia } from '@/lib/tarefas'

const DIA = '2026-11-05'

async function titulosDoCard() {
  const { cards, series, itens } = await listarGruposEntre(DIA, DIA)
  const [grupo] = montarGrupos(cards, series, itens)
  return pendentesDo(grupo).map((item) => item.titulo)
}

async function criarCardCom(titulos: string[]) {
  const card = await criarGrupo({ titulo: 'Simulador POOSE', data: DIA })
  const itens = []
  for (const titulo of titulos) itens.push(await criarItem(card.id, titulo))
  return { card, itens }
}

describe('ordem de exibição: itens do grupo', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('grupo com 10 itens: o 7º em andamento vai ao topo; parar volta para a 7ª posição', async () => {
    const titulos = Array.from({ length: 10 }, (_, indice) => `Item ${indice + 1}`)
    const { itens } = await criarCardCom(titulos)

    await definirAndamento({ itens: [itens[6].id] }, true)
    expect((await titulosDoCard())[0]).toBe('Item 7')

    await definirAndamento({ itens: [itens[6].id] }, false)
    expect(await titulosDoCard()).toEqual(titulos)
    // A ordem salva nunca foi reescrita.
    expect((await db.groupItems.get(itens[6].id))?.ordem).toBe(7)
  })

  it('prioridade sobe logo abaixo dos em andamento; prioridade+andamento fica em primeiro', async () => {
    const { itens } = await criarCardCom(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
    await definirAndamento({ itens: [itens[1].id, itens[2].id] }, true)
    await definirPrioridade({ itens: [itens[7].id] }, true)
    expect(await titulosDoCard()).toEqual(['B', 'C', 'H', 'A', 'D', 'E', 'F', 'G'])

    // O 3º (A) fica prioridade e em andamento: vai para o 1º lugar, acima dos outros.
    await definirAndamento({ itens: [itens[0].id] }, true)
    await definirPrioridade({ itens: [itens[0].id] }, true)
    expect((await titulosDoCard()).slice(0, 4)).toEqual(['A', 'B', 'C', 'H'])

    // Tirar a prioridade: desce para o bloco em andamento.
    await definirPrioridade({ itens: [itens[0].id] }, false)
    expect((await titulosDoCard()).slice(0, 4)).toEqual(['B', 'C', 'A', 'H'])
  })

  it('concluir manda para o fundo (fora dos pendentes) e perde a marca de topo', async () => {
    const { itens } = await criarCardCom(['A', 'B', 'C'])
    await definirPrioridade({ itens: [itens[2].id] }, true)
    expect((await titulosDoCard())[0]).toBe('C')
    await db.groupItems.update(itens[2].id, { status: 'concluido' })
    expect(await titulosDoCard()).toEqual(['A', 'B'])
  })

  it('arrastar dentro do bloco do topo grava só a posição dele, sem mexer na ordem salva', async () => {
    const { itens } = await criarCardCom(['A', 'B', 'C', 'D'])
    await definirAndamento({ itens: [itens[0].id, itens[1].id, itens[2].id] }, true)
    expect(await titulosDoCard()).toEqual(['A', 'B', 'C', 'D'])

    // C arrastado para o topo do bloco em andamento.
    const idsEmOrdem = [itens[2].id, itens[0].id, itens[1].id, itens[3].id]
    const blocoDoId = (id: string) => {
      const item = itens.find((outro) => outro.id === id)
      return item ? blocoDe({ ...item, emAndamento: id !== itens[3].id }) : undefined
    }
    const gravacao = planejarGravacao(idsEmOrdem, itens[2].id, blocoDoId)
    expect(gravacao).toEqual({ tipo: 'topo', ids: [itens[2].id, itens[0].id, itens[1].id] })
    await gravarReordenacao(gravacao, itens[2].id, 'card')

    expect(await titulosDoCard()).toEqual(['C', 'A', 'B', 'D'])
    expect((await db.groupItems.get(itens[2].id))?.ordem).toBe(3)

    // Parar o andamento do C: a posição arrastada não vale mais fora do bloco.
    await definirAndamento({ itens: [itens[2].id] }, false)
    expect(await titulosDoCard()).toEqual(['A', 'B', 'C', 'D'])
  })

  it('arrastar nos demais grava a ordem entre vizinhos dos demais', async () => {
    const { itens } = await criarCardCom(['A', 'B', 'C', 'D'])
    await definirPrioridade({ itens: [itens[0].id] }, true)
    const blocoDoId = (id: string) => blocoDe({ ordem: 0, prioridade: id === itens[0].id })
    // Mostrado: A (prioridade), B, C, D. D arrastado para antes de B.
    const gravacao = planejarGravacao(
      [itens[0].id, itens[3].id, itens[1].id, itens[2].id],
      itens[3].id,
      blocoDoId,
    )
    expect(gravacao).toEqual({ tipo: 'ordem', ids: [itens[3].id, itens[1].id, itens[2].id] })
    await gravarReordenacao(gravacao, itens[3].id, 'card')
    expect(await titulosDoCard()).toEqual(['A', 'D', 'B', 'C'])
  })
})

describe('ordem de exibição: tarefas soltas, Semana e backup', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  async function titulosDoDia() {
    const { pendentes } = separarDoDia(await listarTarefasDoDia(DIA))
    const { cards, series, itens } = await listarGruposEntre(DIA, DIA)
    return intercalarNoDia(pendentes, montarGrupos(cards, series, itens)).map((entrada) =>
      entrada.tipo === 'tarefa' ? entrada.tarefa.titulo : `[${entrada.grupo.serie.titulo}]`,
    )
  }

  it('tarefas soltas com marca sobem acima dos cards e dos demais; sem marca voltam ao lugar', async () => {
    const a = await criarTarefa({ titulo: 'A', data: DIA })
    await criarGrupo({ titulo: 'Casa', data: DIA })
    const c = await criarTarefa({ titulo: 'C', data: DIA })
    const d = await criarTarefa({ titulo: 'D', data: DIA })
    expect(await titulosDoDia()).toEqual(['A', '[Casa]', 'C', 'D'])

    await definirPrioridade({ tarefas: [d.id] }, true)
    await definirAndamento({ tarefas: [c.id] }, true)
    expect(await titulosDoDia()).toEqual(['C', 'D', 'A', '[Casa]'])

    await definirAndamento({ tarefas: [c.id] }, false)
    await definirPrioridade({ tarefas: [d.id] }, false)
    expect(await titulosDoDia()).toEqual(['A', '[Casa]', 'C', 'D'])
    expect(a.id).toBeTruthy()
  })

  it('reordenarNoTopo e a posição arrastada vão e voltam no backup', async () => {
    const { itens } = await criarCardCom(['A', 'B'])
    await definirPrioridade({ itens: [itens[0].id, itens[1].id] }, true)
    await reordenarNoTopo([itens[1].id, itens[0].id])
    expect(await titulosDoCard()).toEqual(['B', 'A'])
    const antes = await db.groupItems.toArray()

    const arquivo = JSON.stringify(await exportarDados())
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    const leitura = lerBackup(arquivo, versaoDoBanco())
    expect(leitura.isValido).toBe(true)
    if (!leitura.isValido) return
    await importarDados(leitura.backup)

    expect(await db.groupItems.toArray()).toEqual(expect.arrayContaining(antes))
    expect(await titulosDoCard()).toEqual(['B', 'A'])
  })
})
