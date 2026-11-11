import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { arquivar, restaurarEstado } from '@/db/repositories/arquivo-repository'
import { capturar } from '@/db/repositories/captura-repository'
import {
  copiarItens,
  criarGrupo,
  criarItem,
  definirConclusaoItem,
  desfazerAcao,
  excluirGrupo,
  excluirItem,
} from '@/db/repositories/group-repository'
import { definirHorario } from '@/db/repositories/horario-repository'
import {
  carregarLembretesComAlvos,
  conferirLembretes,
  definirAvisos,
  marcarTodosVistos,
  marcarVistos,
} from '@/db/repositories/lembrete-repository'
import {
  criarTarefa,
  definirConclusao,
  excluirTarefa,
  moverTarefas,
} from '@/db/repositories/task-repository'
import { contarNaoVistos } from '@/domain/lembretes'

const DIA = '2026-11-11'
const AMANHA = '2026-11-12'
const as = (hora: string, dia = DIA) => new Date(`${dia}T${hora}:00-03:00`)

async function tarefaComAviso(antecedencias = [10], data = DIA, horario = '18:00') {
  const tarefa = await criarTarefa({ titulo: 'Reunião', data })
  await definirHorario({ tipo: 'tarefa', id: tarefa.id }, horario)
  await definirAvisos({ tipo: 'tarefa', id: tarefa.id }, antecedencias)
  return tarefa
}

async function situacaoEm(momento: Date) {
  const { classificacoes } = await conferirLembretes(momento)
  return classificacoes.map((classificacao) => classificacao.situacao)
}

async function naoVistos() {
  return contarNaoVistos(await carregarLembretesComAlvos())
}

describe('lembretes no banco', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('definir avisos mantém os que ficam, apaga os que saem e grava canais e referência', async () => {
    const tarefa = await tarefaComAviso([10, 60])
    const antes = await db.lembretes.toArray()
    expect(antes).toHaveLength(2)
    expect(antes[0]).toMatchObject({ canais: ['app'], referencia: `${DIA}T18:00` })

    await definirAvisos({ tipo: 'tarefa', id: tarefa.id }, [60, 0])

    const depois = await db.lembretes.toArray()
    expect(depois.map((l) => l.antecedenciaMin).sort((a, b) => a - b)).toEqual([0, 60])
    const umaHora = antes.find((l) => l.antecedenciaMin === 60)!
    expect(depois.some((l) => l.id === umaHora.id)).toBe(true)
  })

  it('dispara uma vez só, mesmo com duas conferências ao mesmo tempo (duas abas)', async () => {
    await tarefaComAviso()
    const [a, b] = await Promise.all([
      conferirLembretes(as('17:50')),
      conferirLembretes(as('17:50')),
    ])
    expect(a.disparados.length + b.disparados.length).toBe(1)
    expect((await db.lembretes.toArray())[0].disparadoEm).toBeDefined()
  })

  it('vistos: X e clique marcam um; abrir a aba marca todos; card expirado continua não visto', async () => {
    await tarefaComAviso([10, 0])
    await conferirLembretes(as('17:50'))
    await conferirLembretes(as('18:00'))
    // Os dois cards saíram sozinhos: nada foi marcado.
    expect(await naoVistos()).toBe(2)

    const [primeiro] = await db.lembretes.toArray()
    await marcarVistos([primeiro.id])
    expect(await naoVistos()).toBe(1)

    await marcarTodosVistos()
    expect(await naoVistos()).toBe(0)
  })

  it('perdido (app fechado) conta como não visto', async () => {
    await tarefaComAviso()
    expect(await situacaoEm(as('19:00'))).toEqual(['perdido'])
    expect((await db.lembretes.toArray())[0].perdido).toBe(true)
    expect(await naoVistos()).toBe(1)
  })

  it('concluir → ignorado; desmarcar (Desfazer) → volta a valer', async () => {
    const tarefa = await tarefaComAviso()
    await definirConclusao(tarefa.id, true)
    expect(await situacaoEm(as('12:00'))).toEqual(['ignorado'])
    expect(await db.lembretes.count()).toBe(1)

    await definirConclusao(tarefa.id, false)
    expect(await situacaoEm(as('12:00'))).toEqual(['agendado'])
  })

  it('item de grupo concluído é ignorado e volta ao desmarcar', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: DIA })
    const item = await criarItem(card.id, 'Lavar louça')
    await definirHorario({ tipo: 'item', id: item.id }, '18:00')
    await definirAvisos({ tipo: 'item', id: item.id }, [10])

    await definirConclusaoItem(item.id, true)
    expect(await situacaoEm(as('12:00'))).toEqual(['ignorado'])
    await definirConclusaoItem(item.id, false)
    expect(await situacaoEm(as('12:00'))).toEqual(['agendado'])
  })

  it('arquivar → ignorado; desarquivar (restaurar) → volta a valer', async () => {
    const tarefa = await tarefaComAviso()
    const anteriores = await arquivar({ tarefas: [tarefa.id] })
    expect(await situacaoEm(as('12:00'))).toEqual(['ignorado'])

    await restaurarEstado(anteriores)
    expect(await situacaoEm(as('12:00'))).toEqual(['agendado'])
  })

  it('excluir definitivamente apaga os lembretes da tarefa, do item e do card', async () => {
    const tarefa = await tarefaComAviso()
    const card = await criarGrupo({ titulo: 'Casa', data: DIA })
    const item = await criarItem(card.id, 'Lavar louça')
    const outro = await criarItem(card.id, 'Varrer')
    await definirAvisos({ tipo: 'item', id: item.id }, [10])
    await definirAvisos({ tipo: 'item', id: outro.id }, [10])
    expect(await db.lembretes.count()).toBe(3)

    await excluirTarefa(tarefa.id)
    await excluirItem(item.id)
    expect(await db.lembretes.count()).toBe(1)
    await excluirGrupo(card.id)
    expect(await db.lembretes.count()).toBe(0)
  })

  it('mudou o dia ou o horário: recalcula, e o já disparado volta a pendente', async () => {
    const tarefa = await tarefaComAviso()
    expect((await conferirLembretes(as('17:50'))).disparados).toHaveLength(1)

    await moverTarefas([tarefa.id], AMANHA)
    expect(await situacaoEm(as('18:30'))).toEqual(['agendado'])
    expect((await db.lembretes.toArray())[0].disparadoEm).toBeUndefined()

    await definirHorario({ tipo: 'tarefa', id: tarefa.id }, '09:00')
    expect(await situacaoEm(as('18:30'))).toEqual(['agendado'])
    const { disparados } = await conferirLembretes(as('08:50', AMANHA))
    expect(disparados).toHaveLength(1)
  })

  it('trazer para hoje com o horário já passado silencia, sem virar "Perdido"', async () => {
    const tarefa = await tarefaComAviso([10], AMANHA, '12:00')
    await moverTarefas([tarefa.id], DIA)

    expect(await situacaoEm(as('17:51'))).toEqual(['silenciado'])
    const [gravado] = await db.lembretes.toArray()
    expect(gravado).toMatchObject({ silenciado: true })
    expect(gravado.perdido).toBeUndefined()
    expect(await naoVistos()).toBe(0)

    // Levada de novo para o futuro, volta a valer.
    await moverTarefas([tarefa.id], AMANHA)
    expect(await situacaoEm(as('17:52'))).toEqual(['agendado'])
  })

  it('transferir item: original ignorado, cópia com lembretes clonados; desfazer restaura', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: DIA })
    const item = await criarItem(card.id, 'Lavar louça')
    const feito = await criarItem(card.id, 'Varrer')
    await definirHorario({ tipo: 'item', id: item.id }, '18:00')
    await definirAvisos({ tipo: 'item', id: item.id }, [10, 60])
    await definirAvisos({ tipo: 'item', id: feito.id }, [10])
    await definirConclusaoItem(feito.id, true)

    const resultado = await copiarItens([item.id], AMANHA)

    const copia = await db.groupItems.where('origemItemId').equals(item.id).first()
    expect(copia).toBeDefined()
    const daCopia = await db.lembretes.where('alvoId').equals(copia!.id).toArray()
    expect(daCopia.map((l) => l.antecedenciaMin).sort((a, b) => a - b)).toEqual([10, 60])
    expect(daCopia.every((l) => l.disparadoEm === undefined && l.alvoTipo === 'item')).toBe(true)
    expect(await db.lembretes.where('alvoId').equals(item.id).count()).toBe(2)

    const linhas = await carregarLembretesComAlvos()
    const { classificacoes } = await conferirLembretes(as('12:00'))
    const situacaoDe = (alvoId: string) =>
      linhas.flatMap(({ lembrete }, indice) =>
        lembrete.alvoId === alvoId ? [classificacoes[indice].situacao] : [],
      )
    expect(situacaoDe(item.id)).toEqual(['ignorado', 'ignorado'])
    expect(situacaoDe(copia!.id)).toEqual(['agendado', 'agendado'])

    await desfazerAcao(resultado)

    expect(await db.groupItems.get(copia!.id)).toBeUndefined()
    expect(await db.lembretes.where('alvoId').equals(copia!.id).count()).toBe(0)
    expect((await db.groupItems.get(item.id))?.status).toBe('pendente')
    expect(await situacaoEm(as('12:00'))).toEqual(
      expect.arrayContaining(['agendado', 'agendado', 'ignorado']),
    )
  })

  it('a captura rápida grava os avisos da tarefa e dos itens no grupo', async () => {
    await capturar({ tipo: 'tarefa', titulo: 'Ligar', data: DIA, horario: '18:00', avisos: [10] })
    const card = await criarGrupo({ titulo: 'Casa', data: DIA })
    await capturar({
      tipo: 'em-grupo',
      seriesId: card.seriesId,
      data: DIA,
      itens: ['Um', 'Dois'],
      horario: '09:00',
      avisos: [0, 60],
    })
    expect(await db.lembretes.count()).toBe(5)
    expect((await db.lembretes.toArray()).filter((l) => l.alvoTipo === 'item')).toHaveLength(4)
  })
})
