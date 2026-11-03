import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import {
  definirAndamento,
  quantidadeAlterada,
  restaurarAndamento,
} from '@/db/repositories/andamento-repository'
import { arquivar, restaurarEstado } from '@/db/repositories/arquivo-repository'
import { exportarDados, importarDados, versaoDoBanco } from '@/db/repositories/backup-repository'
import {
  adiarSelecao,
  arquivarGrupo,
  arquivarItem,
  colocarNoGrupo,
  copiarGrupos,
  criarGrupo,
  criarItem,
  definirConclusaoItem,
  desfazerAcao,
  moverSelecao,
  tirarDoGrupo,
} from '@/db/repositories/group-repository'
import {
  adiarTarefas,
  arquivarTarefa,
  criarTarefa,
  definirConclusao,
  moverTarefas,
  restaurarPosicoes,
  soltarTarefaNoDia,
  trazerPendenciasDeOntem,
} from '@/db/repositories/task-repository'
import { lerBackup } from '@/lib/backup'

const HOJE = '2026-11-03'
const AMANHA = '2026-11-04'
const ONTEM = '2026-11-02'

async function tarefaMarcada(titulo = 'Estudar', data = HOJE) {
  const tarefa = await criarTarefa({ titulo, data })
  await definirAndamento({ tarefas: [tarefa.id] }, true)
  return tarefa
}

async function itemMarcado(data = HOJE) {
  const card = await criarGrupo({ titulo: 'Simulador POOSE', data })
  const item = await criarItem(card.id, 'Junção de mesas em nº ímpar')
  await definirAndamento({ itens: [item.id] }, true)
  return { card, item }
}

const emAndamento = async (id: string) =>
  ((await db.tasks.get(id)) ?? (await db.groupItems.get(id)))?.emAndamento === true

describe('em andamento: marcar e parar', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('marca e para tarefa solta e item; pode haver várias ao mesmo tempo', async () => {
    const a = await criarTarefa({ titulo: 'A', data: HOJE })
    const b = await criarTarefa({ titulo: 'B', data: HOJE })
    const card = await criarGrupo({ titulo: 'Casa', data: HOJE })
    const item = await criarItem(card.id, 'Varrer')

    const resultado = await definirAndamento({ tarefas: [a.id, b.id], itens: [item.id] }, true)
    expect(quantidadeAlterada(resultado)).toBe(3)
    expect(await emAndamento(a.id)).toBe(true)
    expect(await emAndamento(b.id)).toBe(true)
    expect(await emAndamento(item.id)).toBe(true)
    expect((await db.tasks.get(a.id))?.emAndamentoDesde).toBeTruthy()

    await definirAndamento({ tarefas: [a.id] }, false)
    expect(await emAndamento(a.id)).toBe(false)
    expect(await emAndamento(b.id)).toBe(true)
    expect(await db.tasks.get(a.id)).not.toHaveProperty('emAndamento')
  })

  it('marcar de novo não altera nada; só o pendente pode ser marcado', async () => {
    const tarefa = await tarefaMarcada()
    expect(quantidadeAlterada(await definirAndamento({ tarefas: [tarefa.id] }, true))).toBe(0)

    const feita = await criarTarefa({ titulo: 'Feita', data: HOJE })
    await definirConclusao(feita.id, true)
    const arquivada = await criarTarefa({ titulo: 'Arquivada', data: HOJE })
    await arquivarTarefa(arquivada.id)
    const resultado = await definirAndamento({ tarefas: [feita.id, arquivada.id] }, true)
    expect(quantidadeAlterada(resultado)).toBe(0)
    expect(await emAndamento(feita.id)).toBe(false)
    expect(await emAndamento(arquivada.id)).toBe(false)
  })

  it('o resultado devolve a marca de antes (Desfazer)', async () => {
    const tarefa = await criarTarefa({ titulo: 'A', data: HOJE })
    const marcou = await definirAndamento({ tarefas: [tarefa.id] }, true)
    await restaurarAndamento(marcou)
    expect(await emAndamento(tarefa.id)).toBe(false)

    await definirAndamento({ tarefas: [tarefa.id] }, true)
    const desde = (await db.tasks.get(tarefa.id))?.emAndamentoDesde
    const parou = await definirAndamento({ tarefas: [tarefa.id] }, false)
    await restaurarAndamento(parou)
    expect(await db.tasks.get(tarefa.id)).toMatchObject({
      emAndamento: true,
      emAndamentoDesde: desde,
    })
  })
})

describe('em andamento: a marca sai sozinha', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('tarefa: adiar para amanhã', async () => {
    const tarefa = await tarefaMarcada()
    await adiarTarefas([tarefa.id], HOJE)
    expect(await db.tasks.get(tarefa.id)).toMatchObject({ data: AMANHA })
    expect(await emAndamento(tarefa.id)).toBe(false)
  })

  it('tarefa: mover para outro dia, e o Desfazer devolve a marca', async () => {
    const tarefa = await tarefaMarcada()
    const resultado = await moverTarefas([tarefa.id], '2026-11-10')
    expect(await emAndamento(tarefa.id)).toBe(false)
    expect((await db.tasks.get(tarefa.id))?.dataOriginal).toBe(HOJE)

    await restaurarPosicoes(resultado.anteriores)
    expect(await db.tasks.get(tarefa.id)).toMatchObject({ data: HOJE, emAndamento: true })
  })

  it('tarefa: arrastar para outro dia tira; soltar no mesmo dia mantém', async () => {
    const tarefa = await tarefaMarcada()
    await soltarTarefaNoDia(tarefa.id, HOJE, [tarefa.id])
    expect(await emAndamento(tarefa.id)).toBe(true)

    await soltarTarefaNoDia(tarefa.id, AMANHA, [tarefa.id])
    expect(await db.tasks.get(tarefa.id)).toMatchObject({ data: AMANHA })
    expect(await emAndamento(tarefa.id)).toBe(false)
  })

  it('tarefa: trazer pendências de ontem para hoje', async () => {
    const tarefa = await tarefaMarcada('Ontem', ONTEM)
    await trazerPendenciasDeOntem(HOJE)
    expect(await db.tasks.get(tarefa.id)).toMatchObject({ data: HOJE })
    expect(await emAndamento(tarefa.id)).toBe(false)
  })

  it('tarefa: concluir, arquivar (e desmarcar a conclusão não volta a marca)', async () => {
    const feita = await tarefaMarcada('Feita')
    await definirConclusao(feita.id, true)
    expect(await emAndamento(feita.id)).toBe(false)
    await definirConclusao(feita.id, false)
    expect(await emAndamento(feita.id)).toBe(false)

    const arquivada = await tarefaMarcada('Arquivada')
    await arquivarTarefa(arquivada.id)
    expect(await emAndamento(arquivada.id)).toBe(false)
  })

  it('tarefa: arquivar pela aba Arquivados e desfazer devolve a marca', async () => {
    const tarefa = await tarefaMarcada()
    const anteriores = await arquivar({ tarefas: [tarefa.id] })
    expect(await emAndamento(tarefa.id)).toBe(false)
    await restaurarEstado(anteriores)
    expect(await emAndamento(tarefa.id)).toBe(true)
  })

  it('item: adiar e mover levam uma cópia sem marca e o original vira registro sem marca', async () => {
    const { item } = await itemMarcado()
    const adiado = await adiarSelecao({ itens: [item.id] }, HOJE)
    const original = await db.groupItems.get(item.id)
    expect(original).toMatchObject({ status: 'transferido' })
    expect(original).not.toHaveProperty('emAndamento')
    const copia = await db.groupItems.where('origemItemId').equals(item.id).first()
    expect(copia).toBeDefined()
    expect(copia).not.toHaveProperty('emAndamento')

    // Desfazer devolve o item exatamente como estava, com a marca.
    await desfazerAcao(adiado)
    expect(await db.groupItems.get(item.id)).toMatchObject({
      status: 'pendente',
      emAndamento: true,
    })
    expect(await db.groupItems.count()).toBe(1)

    await moverSelecao({ itens: [item.id] }, '2026-11-20')
    expect(await emAndamento(item.id)).toBe(false)
    const outra = await db.groupItems.where('origemItemId').equals(item.id).first()
    expect(outra?.emAndamento).toBeUndefined()
  })

  it('grupo duplicado (arrastar o card): nem o original nem a cópia levam a marca', async () => {
    const { card, item } = await itemMarcado()
    const outro = await criarItem(card.id, 'Outro item')
    await definirAndamento({ itens: [outro.id] }, true)
    await copiarGrupos([card.id], AMANHA)

    const itens = await db.groupItems.toArray()
    expect(itens).toHaveLength(4)
    expect(itens.some((registro) => registro.emAndamento === true)).toBe(false)
    expect(await emAndamento(item.id)).toBe(false)
  })

  it('item: concluir, arquivar sozinho e arquivar o card inteiro', async () => {
    const { card, item } = await itemMarcado()
    await definirConclusaoItem(item.id, true)
    expect(await emAndamento(item.id)).toBe(false)

    const sozinho = await criarItem(card.id, 'Sozinho')
    await definirAndamento({ itens: [sozinho.id] }, true)
    await arquivarItem(sozinho.id)
    expect(await emAndamento(sozinho.id)).toBe(false)

    const dentro = await criarItem(card.id, 'Dentro do card')
    await definirAndamento({ itens: [dentro.id] }, true)
    await arquivarGrupo(card.id)
    expect(await emAndamento(dentro.id)).toBe(false)
  })

  it('item: arquivar o card pela aba Arquivados limpa a marca e o Desfazer devolve', async () => {
    const { card, item } = await itemMarcado()
    const anteriores = await arquivar({ cards: [card.id] })
    expect(await emAndamento(item.id)).toBe(false)
    await restaurarEstado(anteriores)
    expect(await emAndamento(item.id)).toBe(true)
  })

  it('tirar do grupo e colocar no grupo no mesmo dia mantêm a marca', async () => {
    const { card, item } = await itemMarcado()
    await tirarDoGrupo(item.id)
    expect(await db.groupItems.get(item.id)).toBeUndefined()
    expect(await db.tasks.get(item.id)).toMatchObject({ emAndamento: true })

    await colocarNoGrupo(item.id, card.id)
    expect(await db.tasks.get(item.id)).toBeUndefined()
    const volta = await db.groupItems.get(item.id)
    expect(volta).toMatchObject({ emAndamento: true })
    expect(volta?.emAndamentoDesde).toBeTruthy()
  })
})

describe('em andamento: backup', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('exportar e importar devolve a marca de tarefa e de item', async () => {
    const tarefa = await tarefaMarcada()
    const { item } = await itemMarcado()
    const antes = {
      tarefa: await db.tasks.get(tarefa.id),
      item: await db.groupItems.get(item.id),
    }

    const arquivo = JSON.stringify(await exportarDados())
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    const leitura = lerBackup(arquivo, versaoDoBanco())
    if (!leitura.isValido) throw new Error(leitura.mensagem)
    await importarDados(leitura.backup)

    expect(await db.tasks.get(tarefa.id)).toEqual(antes.tarefa)
    expect(await db.groupItems.get(item.id)).toEqual(antes.item)
    expect(await emAndamento(tarefa.id)).toBe(true)
    expect(await emAndamento(item.id)).toBe(true)
  })

  it('backup antigo, sem os campos, entra como "não está em andamento"', async () => {
    await itemMarcado()
    await tarefaMarcada()
    const antigo = JSON.parse(JSON.stringify(await exportarDados()))
    antigo.formato = 10
    for (const registro of [...antigo.tabelas.tasks, ...antigo.tabelas.groupItems]) {
      delete registro.emAndamento
      delete registro.emAndamentoDesde
    }
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    const leitura = lerBackup(JSON.stringify(antigo), versaoDoBanco())
    if (!leitura.isValido) throw new Error(leitura.mensagem)
    await importarDados(leitura.backup)

    expect(await db.tasks.count()).toBe(1)
    expect(await db.groupItems.count()).toBe(1)
    for (const registro of [...(await db.tasks.toArray()), ...(await db.groupItems.toArray())]) {
      expect(registro.emAndamento).toBeUndefined()
    }
  })
})
