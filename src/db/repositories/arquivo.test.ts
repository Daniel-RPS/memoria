import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import {
  arquivar,
  carregarArquivados,
  contarArquivados,
  desarquivar,
  excluirDefinitivamente,
  restaurarEstado,
} from '@/db/repositories/arquivo-repository'
import { exportarDados, importarDados, versaoDoBanco } from '@/db/repositories/backup-repository'
import { carregarConclusoes } from '@/db/repositories/estatisticas-repository'
import {
  arquivarGrupo,
  arquivarItem,
  criarGrupo,
  criarItem,
  definirConclusaoItem,
  listarGruposAtrasados,
  listarGruposEntre,
} from '@/db/repositories/group-repository'
import {
  contarNotasDe,
  contarNotasPorVinculo,
  criarNota,
  listarNotas,
} from '@/db/repositories/note-repository'
import { criarProcedimento, listarProcedimentos } from '@/db/repositories/procedure-repository'
import {
  criarTarefa,
  definirConclusao,
  listarTarefasDoDia,
  listarTarefasEntre,
} from '@/db/repositories/task-repository'
import { lerBackup } from '@/lib/backup'
import { montarArquivados } from '@/lib/arquivados'
import { ErroDeValidacao } from '@/lib/erros'

const HOJE = '2026-11-03'

describe('arquivar e desarquivar', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('tarefa: arquivar guarda o momento e tira do calendário; desarquivar volta ao dia', async () => {
    const tarefa = await criarTarefa({ titulo: 'Ligar para Fulano', data: '2026-10-28' })
    await arquivar({ tarefas: [tarefa.id] })

    const arquivada = await db.tasks.get(tarefa.id)
    expect(arquivada).toMatchObject({ status: 'arquivada' })
    expect(arquivada?.arquivadoEm).toBeDefined()
    expect(await listarTarefasDoDia('2026-10-28')).toEqual([])
    expect(await listarTarefasEntre('2026-10-01', '2026-10-31')).toEqual([])
    expect(await contarArquivados()).toBe(1)

    await desarquivar({ tarefas: [tarefa.id] })
    expect(await db.tasks.get(tarefa.id)).toMatchObject({
      status: 'pendente',
      data: '2026-10-28',
      dataOriginal: '2026-10-28',
      arquivadoEm: undefined,
    })
    expect(await listarTarefasDoDia('2026-10-28')).toHaveLength(1)
    expect(await contarArquivados()).toBe(0)
  })

  it('tarefa concluída volta concluída', async () => {
    const tarefa = await criarTarefa({ titulo: 'Feita', data: '2026-10-28' })
    await definirConclusao(tarefa.id, true)
    await arquivar({ tarefas: [tarefa.id] })
    await desarquivar({ tarefas: [tarefa.id] })
    expect(await db.tasks.get(tarefa.id)).toMatchObject({ status: 'concluida' })
  })

  it('tarefa: volta para hoje ou para outro dia sem tocar em dataOriginal e no fim do dia', async () => {
    const existente = await criarTarefa({ titulo: 'Já está hoje', data: HOJE })
    const tarefa = await criarTarefa({ titulo: 'Antiga', data: '2026-10-28' })
    const outra = await criarTarefa({ titulo: 'Outra', data: '2026-10-28' })
    await arquivar({ tarefas: [tarefa.id, outra.id] })

    await desarquivar({ tarefas: [tarefa.id] }, HOJE)
    const hoje = await db.tasks.get(tarefa.id)
    expect(hoje).toMatchObject({ data: HOJE, dataOriginal: '2026-10-28', status: 'pendente' })
    expect(hoje!.ordem).toBeGreaterThan(existente.ordem)

    await desarquivar({ tarefas: [outra.id] }, '2026-11-10')
    expect(await db.tasks.get(outra.id)).toMatchObject({
      data: '2026-11-10',
      dataOriginal: '2026-10-28',
    })
  })

  it('várias de uma vez: cada uma volta pelo seu dia (regra por item)', async () => {
    const velha = await criarTarefa({ titulo: 'Velha', data: '2026-10-28' })
    const futura = await criarTarefa({ titulo: 'Futura', data: '2026-11-20' })
    await arquivar({ tarefas: [velha.id, futura.id] })
    await desarquivar({ tarefas: [velha.id, futura.id] }, (dia) => (dia >= HOJE ? dia : HOJE))
    expect((await db.tasks.get(velha.id))?.data).toBe(HOJE)
    expect((await db.tasks.get(futura.id))?.data).toBe('2026-11-20')
  })

  it('grupo: arquiva o card inteiro (feitos e pendentes) e desarquivar devolve igual', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: '2026-10-29' })
    const feito = await criarItem(card.id, 'Varrer')
    const pendente = await criarItem(card.id, 'Lavar')
    await definirConclusaoItem(feito.id, true)
    await arquivarGrupo(card.id)

    expect(await db.groupCards.get(card.id)).toMatchObject({ arquivado: true })
    expect((await db.groupCards.get(card.id))?.arquivadoEm).toBeDefined()
    expect(await db.groupItems.get(pendente.id)).toMatchObject({ status: 'pendente' })
    expect((await listarGruposEntre('2026-10-01', '2026-10-31')).cards).toEqual([])
    expect(await listarGruposAtrasados(HOJE)).toMatchObject({ cards: [] })
    expect(await carregarConclusoes('2026-01-01')).toEqual([])

    await desarquivar({ cards: [card.id] })
    expect(await db.groupCards.get(card.id)).toMatchObject({
      arquivado: false,
      data: '2026-10-29',
    })
    expect(await db.groupItems.get(feito.id)).toMatchObject({ status: 'concluido' })
    expect((await listarGruposEntre('2026-10-01', '2026-10-31')).cards).toHaveLength(1)
    expect(await carregarConclusoes('2026-01-01')).toHaveLength(1)
  })

  it('grupo: para outro dia, e recusa dia em que a série já tem card', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: '2026-10-29' })
    await criarItem(card.id, 'Varrer')
    await arquivar({ cards: [card.id] })

    await desarquivar({ cards: [card.id] }, HOJE)
    expect(await db.groupCards.get(card.id)).toMatchObject({ data: HOJE, arquivado: false })
    await arquivar({ cards: [card.id] })

    const outro = await criarGrupo({ titulo: 'Casa', data: '2026-11-05' })
    await expect(desarquivar({ cards: [card.id] }, '2026-11-05')).rejects.toBeInstanceOf(
      ErroDeValidacao,
    )
    // A recusa não deixa meia-troca: o card continua arquivado, no dia que tinha.
    expect(await db.groupCards.get(card.id)).toMatchObject({ arquivado: true, data: HOJE })
    expect(outro.arquivado).toBe(false)
  })

  it('item arquivado sozinho é listado e volta ao desarquivar', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: '2026-10-29' })
    const item = await criarItem(card.id, 'Varrer')
    await arquivarItem(item.id)
    expect((await db.groupItems.get(item.id))?.arquivadoEm).toBeDefined()
    expect(await contarArquivados()).toBe(1)

    const linhas = montarArquivados(await carregarArquivados(), HOJE)
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({ variante: 'itens', idsItens: [item.id] })

    await desarquivar({ itens: [item.id] })
    expect(await db.groupItems.get(item.id)).toMatchObject({ status: 'pendente' })
    expect(await contarArquivados()).toBe(0)
  })

  it('nota: some das listas e do contador do alvo; desarquivar devolve ao mesmo vínculo', async () => {
    const tarefa = await criarTarefa({ titulo: 'Ligar', data: '2026-10-28' })
    const vinculo = { tipo: 'tarefa' as const, id: tarefa.id }
    const nota = await criarNota({ titulo: 'N', conteudo: 'texto', vinculo })
    await criarNota({ titulo: 'Outra', conteudo: 'fica', vinculo })
    expect(await contarNotasDe(vinculo)).toBe(2)

    await arquivar({ notas: [nota.id] })
    expect((await listarNotas()).map((item) => item.titulo)).toEqual(['Outra'])
    expect(await contarNotasDe(vinculo)).toBe(1)
    expect((await contarNotasPorVinculo()).get(`tarefa:${tarefa.id}`)).toBe(1)
    expect(await db.notes.get(nota.id)).toMatchObject({ arquivado: true, vinculo })

    await desarquivar({ notas: [nota.id] })
    expect(await contarNotasDe(vinculo)).toBe(2)
    expect(await db.notes.get(nota.id)).toMatchObject({ arquivado: false, vinculo })
  })

  it('procedimento: some da lista, mantém categoria e etapas, e volta', async () => {
    const procedimento = await criarProcedimento({
      titulo: 'Backup',
      categoryId: 'cat',
      etapas: [{ id: 'e1', texto: 'Conectar' }],
    })
    await arquivar({ procedimentos: [procedimento.id] })
    expect(await listarProcedimentos()).toEqual([])
    expect(await db.procedures.get(procedimento.id)).toMatchObject({
      arquivado: true,
      categoryId: 'cat',
      etapas: [{ id: 'e1', texto: 'Conectar', ordem: 0 }],
    })

    await desarquivar({ procedimentos: [procedimento.id] })
    expect((await listarProcedimentos()).map((item) => item.id)).toEqual([procedimento.id])
  })

  it('desfazer devolve cada registro ao estado de antes', async () => {
    const tarefa = await criarTarefa({ titulo: 'Ligar', data: '2026-10-28' })
    const nota = await criarNota({ conteudo: 'x' })
    const anteriores = await arquivar({ tarefas: [tarefa.id], notas: [nota.id] })
    await restaurarEstado(anteriores)
    expect(await db.tasks.get(tarefa.id)).toMatchObject({ status: 'pendente' })
    expect((await db.tasks.get(tarefa.id))?.arquivadoEm).toBeUndefined()
    expect((await listarNotas()).map((item) => item.id)).toEqual([nota.id])

    const arquivados = await arquivar({ tarefas: [tarefa.id] })
    const voltou = await desarquivar({ tarefas: [tarefa.id] }, HOJE)
    expect(voltou.tarefas[0]?.data).toBe('2026-10-28')
    await restaurarEstado(voltou)
    expect(await db.tasks.get(tarefa.id)).toMatchObject({
      status: 'arquivada',
      data: '2026-10-28',
    })
    expect(arquivados.tarefas[0]?.status).toBe('pendente')
  })

  it('conta o que a tela mostra: card e itens avulsos uma vez cada', async () => {
    const tarefa = await criarTarefa({ titulo: 'T', data: '2026-10-28' })
    const card = await criarGrupo({ titulo: 'G', data: '2026-10-29' })
    const outro = await criarGrupo({ titulo: 'H', data: '2026-10-29' })
    const a = await criarItem(outro.id, 'a')
    const b = await criarItem(outro.id, 'b')
    const nota = await criarNota({ conteudo: 'n' })
    const procedimento = await criarProcedimento({ titulo: 'P', categoryId: '', etapas: [] })
    await arquivar({
      tarefas: [tarefa.id],
      cards: [card.id],
      itens: [a.id, b.id],
      notas: [nota.id],
      procedimentos: [procedimento.id],
    })
    expect(await contarArquivados()).toBe(5)
    expect(montarArquivados(await carregarArquivados(), HOJE)).toHaveLength(5)
  })
})

describe('excluir permanentemente', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('apaga o arquivado; notas de tarefa e grupo viram avulsas e anexos da nota somem', async () => {
    const tarefa = await criarTarefa({ titulo: 'T', data: '2026-10-28' })
    const card = await criarGrupo({ titulo: 'G', data: '2026-10-29' })
    const ligada = await criarNota({
      conteudo: 'da tarefa',
      vinculo: { tipo: 'tarefa', id: tarefa.id },
    })
    const doGrupo = await criarNota({
      conteudo: 'do grupo',
      vinculo: { tipo: 'grupo', id: card.seriesId },
    })
    const arquivada = await criarNota({ conteudo: 'arquivada' })
    await db.attachments.add({
      id: 'a',
      dono: { tipo: 'note', id: arquivada.id },
      tipo: 'link',
      nome: 'L',
      url: 'https://exemplo.com',
      criadoEm: '',
      atualizadoEm: '',
    })
    const procedimento = await criarProcedimento({ titulo: 'P', categoryId: '', etapas: [] })
    const alvos = {
      tarefas: [tarefa.id],
      cards: [card.id],
      notas: [arquivada.id],
      procedimentos: [procedimento.id],
    }
    await arquivar(alvos)
    await excluirDefinitivamente(alvos)

    expect(await db.tasks.count()).toBe(0)
    expect(await db.groupCards.count()).toBe(0)
    expect(await db.groupSeries.count()).toBe(0)
    expect(await db.procedures.count()).toBe(0)
    expect(await db.attachments.count()).toBe(0)
    expect(await db.notes.get(arquivada.id)).toBeUndefined()
    expect((await db.notes.get(ligada.id))?.vinculo).toBeUndefined()
    expect((await db.notes.get(doGrupo.id))?.vinculo).toBeUndefined()
    expect(await contarArquivados()).toBe(0)
  })

  it('excluir categoria com itens arquivados deixa todos sem categoria', async () => {
    const { criarCategoria, excluirCategoria } =
      await import('@/db/repositories/category-repository')
    const categoria = await criarCategoria({ nome: 'Casa' })
    const tarefa = await criarTarefa({ titulo: 'T', data: '2026-10-28', categoryId: categoria.id })
    const procedimentoCategoria = await criarCategoria({ nome: 'Rotinas', tipo: 'procedimento' })
    const procedimento = await criarProcedimento({
      titulo: 'P',
      categoryId: procedimentoCategoria.id,
      etapas: [],
    })
    await arquivar({ tarefas: [tarefa.id], procedimentos: [procedimento.id] })
    await excluirCategoria(categoria.id)
    await excluirCategoria(procedimentoCategoria.id)
    expect((await db.tasks.get(tarefa.id))?.categoryId).toBeUndefined()
    expect((await db.procedures.get(procedimento.id))?.categoryId).toBeUndefined()
    expect((await db.tasks.get(tarefa.id))?.status).toBe('arquivada')
  })
})

describe('backup do que está arquivado', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('exportar e importar mantém arquivado e arquivadoEm de cada tipo', async () => {
    const tarefa = await criarTarefa({ titulo: 'T', data: '2026-10-28' })
    const card = await criarGrupo({ titulo: 'G', data: '2026-10-29' })
    const item = await criarItem(card.id, 'i')
    const nota = await criarNota({ conteudo: 'n' })
    const procedimento = await criarProcedimento({ titulo: 'P', categoryId: '', etapas: [] })
    await arquivar({
      tarefas: [tarefa.id],
      cards: [card.id],
      itens: [item.id],
      notas: [nota.id],
      procedimentos: [procedimento.id],
    })
    const antes = {
      tarefa: await db.tasks.get(tarefa.id),
      card: await db.groupCards.get(card.id),
      item: await db.groupItems.get(item.id),
      nota: await db.notes.get(nota.id),
      procedimento: await db.procedures.get(procedimento.id),
    }

    const arquivo = JSON.stringify(await exportarDados())
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    const leitura = lerBackup(arquivo, versaoDoBanco())
    if (!leitura.isValido) throw new Error(leitura.mensagem)
    await importarDados(leitura.backup)

    expect(await db.tasks.get(tarefa.id)).toEqual(antes.tarefa)
    expect(await db.groupCards.get(card.id)).toEqual(antes.card)
    expect(await db.groupItems.get(item.id)).toEqual(antes.item)
    expect(await db.notes.get(nota.id)).toEqual(antes.nota)
    expect(await db.procedures.get(procedimento.id)).toEqual(antes.procedimento)
    expect(antes.nota?.arquivadoEm).toBeDefined()
  })

  it('backup antigo: nada vira arquivado, e o que já vinha arquivado ganha a data da última alteração', async () => {
    const arquivo = JSON.stringify({
      app: 'MemorIA',
      formato: 9,
      versaoBanco: 10,
      exportadoEm: '2026-11-01T10:00:00.000Z',
      tabelas: {
        categories: [],
        subcategories: [],
        subtasks: [],
        attachments: [],
        groupSeries: [{ id: 's', titulo: 'G', criadoEm: '1', atualizadoEm: '1' }],
        groupCards: [
          {
            id: 'c',
            seriesId: 's',
            data: '2026-10-29',
            ordem: 1,
            arquivado: true,
            criadoEm: '1',
            atualizadoEm: '2026-10-30T10:00:00.000Z',
          },
        ],
        groupItems: [],
        tasks: [
          {
            id: 't1',
            titulo: 'Velha',
            data: '2026-10-28',
            ordem: 1,
            status: 'arquivada',
            dataOriginal: '2026-10-28',
            criadoEm: '1',
            atualizadoEm: '2026-10-29T10:00:00.000Z',
          },
          {
            id: 't2',
            titulo: 'Ativa',
            data: '2026-10-28',
            ordem: 2,
            status: 'pendente',
            dataOriginal: '2026-10-28',
            criadoEm: '1',
            atualizadoEm: '2',
          },
        ],
        notes: [{ id: 'n', titulo: 'N', conteudo: 'x', criadoEm: '1', atualizadoEm: '2' }],
        procedures: [{ id: 'p', titulo: 'P', etapas: [], criadoEm: '1', atualizadoEm: '2' }],
      },
    })
    const leitura = lerBackup(arquivo, versaoDoBanco())
    if (!leitura.isValido) throw new Error(leitura.mensagem)
    await importarDados(leitura.backup)

    expect(await db.tasks.get('t1')).toMatchObject({
      status: 'arquivada',
      arquivadoEm: '2026-10-29T10:00:00.000Z',
    })
    expect((await db.tasks.get('t2'))?.arquivadoEm).toBeUndefined()
    expect(await db.groupCards.get('c')).toMatchObject({
      arquivado: true,
      arquivadoEm: '2026-10-30T10:00:00.000Z',
    })
    expect((await db.notes.get('n'))?.arquivado).toBeFalsy()
    expect((await db.procedures.get('p'))?.arquivado).toBeFalsy()
    expect(await listarNotas()).toHaveLength(1)
    expect(await listarProcedimentos()).toHaveLength(1)
  })
})
