import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Dexie from 'dexie'
import { db, MemoriaDatabase } from '@/db/database'
import { definirAndamento, restaurarAndamento } from '@/db/repositories/andamento-repository'
import { arquivar, restaurarEstado } from '@/db/repositories/arquivo-repository'
import { exportarDados, importarDados, versaoDoBanco } from '@/db/repositories/backup-repository'
import { criarCategoria, excluirCategoria } from '@/db/repositories/category-repository'
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
  excluirGrupo,
  excluirItem,
  tirarDoGrupo,
} from '@/db/repositories/group-repository'
import {
  adiarTarefas,
  arquivarTarefa,
  criarTarefa,
  definirConclusao,
  excluirTarefa,
  moverTarefas,
  restaurarPosicoes,
  soltarTarefaNoDia,
} from '@/db/repositories/task-repository'
import {
  ajustarFimDaSessao,
  calcularFimAjustado,
  carregarDadosDeTempo,
  cortarSessaoNoIntervalo,
  editarSessao,
  encontrarSessoesLongas,
  excluirSessao,
  fatiarSessaoPorDiaLocal,
  filtrarTarefasDeTempo,
  formatarDuracao,
  formatarTempoAgora,
  gerarCsvDeTempo,
  lerPeriodoDeDados,
  montarGraficoPorTarefa,
  montarRelatorioDeTempo,
  somarTempoDoAlvo,
} from '@/domain/tempo'
import { lerBackup } from '@/lib/backup'

const HOJE = '2026-11-04'
const AMANHA = '2026-11-05'

describe('tempo: formatação e leitura de período (puro)', () => {
  it('formata o rótulo ao lado de "agora"', () => {
    expect(formatarTempoAgora(0)).toBe('agora · <1 min')
    expect(formatarTempoAgora(45_000)).toBe('agora · <1 min')
    expect(formatarTempoAgora(12 * 60_000)).toBe('agora · 12 min')
    expect(formatarTempoAgora(65 * 60_000)).toBe('agora · 1h 05')
    expect(formatarTempoAgora(120 * 60_000)).toBe('agora · 2h 00')
  })

  it('formata durações para o menu ⋯ e para a tela Dados', () => {
    expect(formatarDuracao(0)).toBe('0 min')
    expect(formatarDuracao(30_000)).toBe('<1 min')
    expect(formatarDuracao(12 * 60_000)).toBe('12 min')
    expect(formatarDuracao(80 * 60_000)).toBe('1h 20 min')
    expect(formatarDuracao(120 * 60_000)).toBe('2h')
  })

  it('lê o período salvo com fallback seguro para "semana"', () => {
    expect(lerPeriodoDeDados(null)).toEqual({ tipo: 'semana' })
    expect(lerPeriodoDeDados('invalido')).toEqual({ tipo: 'semana' })
    expect(lerPeriodoDeDados(JSON.stringify({ tipo: 'hoje' }))).toEqual({ tipo: 'hoje' })
    expect(
      lerPeriodoDeDados(
        JSON.stringify({ tipo: 'intervalo', inicio: '2026-11-01', fim: '2026-11-04' }),
      ),
    ).toEqual({ tipo: 'intervalo', inicio: '2026-11-01', fim: '2026-11-04' })
  })
})

describe('tempo: abrir e fechar sessão em todos os caminhos de andamento', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-04T10:00:00-03:00'))
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('abre sessão ao marcar em andamento e fecha ao parar; várias sessões na mesma tarefa somam', async () => {
    const tarefa = await criarTarefa({ titulo: 'Escrever relatório', data: HOJE })

    // 1ª sessão: 10:00 -> 10:15 (15 min)
    await definirAndamento({ tarefas: [tarefa.id] }, true)
    expect(await db.sessions.count()).toBe(1)
    expect((await db.sessions.toArray())[0].fim).toBeUndefined()

    vi.setSystemTime(new Date('2026-11-04T10:15:00-03:00'))
    await definirAndamento({ tarefas: [tarefa.id] }, false)

    // 2ª sessão: 11:00 -> 11:25 (25 min)
    vi.setSystemTime(new Date('2026-11-04T11:00:00-03:00'))
    await definirAndamento({ tarefas: [tarefa.id] }, true)
    vi.setSystemTime(new Date('2026-11-04T11:25:00-03:00'))
    await definirAndamento({ tarefas: [tarefa.id] }, false)

    const sessoes = await db.sessions.toArray()
    expect(sessoes).toHaveLength(2)
    const totalMs = somarTempoDoAlvo(sessoes, { tipo: 'tarefa', id: tarefa.id })
    expect(totalMs).toBe(40 * 60_000)
    expect(formatarDuracao(totalMs)).toBe('40 min')
  })

  it('duas tarefas em andamento em paralelo contam cada uma o seu tempo sem dividir', async () => {
    const a = await criarTarefa({ titulo: 'Tarefa A', data: HOJE })
    const b = await criarTarefa({ titulo: 'Tarefa B', data: HOJE })

    await definirAndamento({ tarefas: [a.id, b.id] }, true)
    vi.setSystemTime(new Date('2026-11-04T10:30:00-03:00'))
    await definirAndamento({ tarefas: [a.id, b.id] }, false)

    const dados = await carregarDadosDeTempo()
    const relatorio = montarRelatorioDeTempo(dados, { tipo: 'hoje' }, HOJE)
    expect(relatorio.tarefas).toHaveLength(2)
    expect(relatorio.tarefas[0].tempoTotalMs).toBe(30 * 60_000)
    expect(relatorio.tarefas[1].tempoTotalMs).toBe(30 * 60_000)
    expect(relatorio.tempoTotalMs).toBe(60 * 60_000)
  })

  it('fecha a sessão automaticamente ao concluir, mover, adiar, arrastar, arquivar e excluir', async () => {
    // 1. Concluir tarefa
    const tConcluir = await criarTarefa({ titulo: 'Concluir', data: HOJE })
    await definirAndamento({ tarefas: [tConcluir.id] }, true)
    vi.advanceTimersByTime(10 * 60_000)
    await definirConclusao(tConcluir.id, true)
    expect((await db.sessions.where('tarefaId').equals(tConcluir.id).first())?.fim).toBeDefined()

    // 2. Mover tarefa (e Desfazer reabre a sessão)
    const tMover = await criarTarefa({ titulo: 'Mover', data: HOJE })
    await definirAndamento({ tarefas: [tMover.id] }, true)
    vi.advanceTimersByTime(10 * 60_000)
    const movido = await moverTarefas([tMover.id], AMANHA)
    expect((await db.sessions.where('tarefaId').equals(tMover.id).first())?.fim).toBeDefined()
    await restaurarPosicoes(movido.anteriores)
    expect((await db.sessions.where('tarefaId').equals(tMover.id).first())?.fim).toBeUndefined()
    await definirAndamento({ tarefas: [tMover.id] }, false)

    // 3. Adiar tarefa
    const tAdiar = await criarTarefa({ titulo: 'Adiar', data: HOJE })
    await definirAndamento({ tarefas: [tAdiar.id] }, true)
    vi.advanceTimersByTime(10 * 60_000)
    await adiarTarefas([tAdiar.id], HOJE)
    expect((await db.sessions.where('tarefaId').equals(tAdiar.id).first())?.fim).toBeDefined()

    // 4. Arrastar para outro dia (soltarTarefaNoDia)
    const tArrastar = await criarTarefa({ titulo: 'Arrastar', data: HOJE })
    await definirAndamento({ tarefas: [tArrastar.id] }, true)
    vi.advanceTimersByTime(10 * 60_000)
    await soltarTarefaNoDia(tArrastar.id, AMANHA, [tArrastar.id])
    expect((await db.sessions.where('tarefaId').equals(tArrastar.id).first())?.fim).toBeDefined()

    // 5. Arquivar tarefa (direto e por arquivar com Desfazer)
    const tArquivar = await criarTarefa({ titulo: 'Arquivar', data: HOJE })
    await definirAndamento({ tarefas: [tArquivar.id] }, true)
    vi.advanceTimersByTime(10 * 60_000)
    const antArq = await arquivar({ tarefas: [tArquivar.id] })
    expect((await db.sessions.where('tarefaId').equals(tArquivar.id).first())?.fim).toBeDefined()
    await restaurarEstado(antArq)
    expect((await db.sessions.where('tarefaId').equals(tArquivar.id).first())?.fim).toBeUndefined()
    await arquivarTarefa(tArquivar.id)
    expect((await db.sessions.where('tarefaId').equals(tArquivar.id).first())?.fim).toBeDefined()

    // 6. Excluir tarefa apaga as sessões dela
    const tExcluir = await criarTarefa({ titulo: 'Excluir', data: HOJE })
    await definirAndamento({ tarefas: [tExcluir.id] }, true)
    vi.advanceTimersByTime(5 * 60_000)
    await excluirTarefa(tExcluir.id)
    expect(await db.sessions.where('tarefaId').equals(tExcluir.id).count()).toBe(0)

    // 7. Item de grupo: concluir, arquivar item, arquivar grupo, duplicar grupo e excluir
    const card = await criarGrupo({ titulo: 'Projeto', data: HOJE })
    const item1 = await criarItem(card.id, 'Item 1')
    const item2 = await criarItem(card.id, 'Item 2')
    const item3 = await criarItem(card.id, 'Item 3')

    await definirAndamento({ itens: [item1.id, item2.id, item3.id] }, true)
    vi.advanceTimersByTime(15 * 60_000)

    await definirConclusaoItem(item1.id, true)
    expect((await db.sessions.where('itemId').equals(item1.id).first())?.fim).toBeDefined()

    await arquivarItem(item2.id)
    expect((await db.sessions.where('itemId').equals(item2.id).first())?.fim).toBeDefined()

    // Duplicar grupo fecha a sessão do item3 pendente; desfazer reabre
    const copiado = await copiarGrupos([card.id], AMANHA)
    expect((await db.sessions.where('itemId').equals(item3.id).first())?.fim).toBeDefined()
    await desfazerAcao(copiado)
    expect((await db.sessions.where('itemId').equals(item3.id).first())?.fim).toBeUndefined()

    await arquivarGrupo(card.id)
    expect((await db.sessions.where('itemId').equals(item3.id).first())?.fim).toBeDefined()

    await excluirItem(item1.id)
    expect(await db.sessions.where('itemId').equals(item1.id).count()).toBe(0)

    await excluirGrupo(card.id)
    expect(await db.sessions.where('itemId').equals(item2.id).count()).toBe(0)
    expect(await db.sessions.where('itemId').equals(item3.id).count()).toBe(0)
  })

  it('Desfazer de marcar e parar andamento restaura as sessões', async () => {
    const tarefa = await criarTarefa({ titulo: 'Desfazer', data: HOJE })
    const marcou = await definirAndamento({ tarefas: [tarefa.id] }, true)
    expect(await db.sessions.count()).toBe(1)

    await restaurarAndamento(marcou)
    expect(await db.sessions.count()).toBe(0)

    await definirAndamento({ tarefas: [tarefa.id] }, true)
    vi.advanceTimersByTime(10 * 60_000)
    const parou = await definirAndamento({ tarefas: [tarefa.id] }, false)
    expect((await db.sessions.toArray())[0].fim).toBeDefined()

    await restaurarAndamento(parou)
    expect((await db.sessions.toArray())[0].fim).toBeUndefined()
  })

  it('soma o tempo de vários dias após adiar/mover tarefa solta e duplicar grupo (cadeiaId)', async () => {
    const cat = await criarCategoria({ nome: 'Trabalho', cor: '#8B3DFF' })
    const tarefa = await criarTarefa({
      titulo: 'Revisar arquitetura',
      data: HOJE,
      categoryId: cat.id,
    })
    const card = await criarGrupo({ titulo: 'Backend', data: HOJE, categoryId: cat.id })
    const itemHoje = await criarItem(card.id, 'Otimizar consulta')

    // Dia 1 (HOJE): 20 min na tarefa e 15 min no item
    await definirAndamento({ tarefas: [tarefa.id], itens: [itemHoje.id] }, true)
    vi.advanceTimersByTime(15 * 60_000)
    // Adia o item para amanhã (fecha a sessão de 15 min e cria cópia com mesmo cadeiaId)
    await adiarSelecao({ itens: [itemHoje.id] }, HOJE)
    vi.advanceTimersByTime(5 * 60_000)
    // Adia a tarefa para amanhã (fecha a sessão de 20 min)
    await adiarTarefas([tarefa.id], HOJE)

    // Dia 2 (AMANHA): +25 min na tarefa e +35 min na cópia do item
    vi.setSystemTime(new Date('2026-11-05T09:00:00-03:00'))
    const itemAmanha = await db.groupItems.where('origemItemId').equals(itemHoje.id).first()
    expect(itemAmanha).toBeDefined()
    expect(itemAmanha?.cadeiaId).toBe(itemHoje.cadeiaId)

    await definirAndamento({ tarefas: [tarefa.id], itens: [itemAmanha!.id] }, true)
    vi.advanceTimersByTime(25 * 60_000)
    await definirAndamento({ tarefas: [tarefa.id] }, false)
    vi.advanceTimersByTime(10 * 60_000)
    await definirAndamento({ itens: [itemAmanha!.id] }, false)

    const dados = await carregarDadosDeTempo()
    const relatorio = montarRelatorioDeTempo(dados, { tipo: 'semana' }, AMANHA)

    expect(relatorio.tarefasMedidas).toBe(2)
    const resumoItem = relatorio.tarefas.find((t) => t.titulo === 'Otimizar consulta')!
    const resumoTarefa = relatorio.tarefas.find((t) => t.titulo === 'Revisar arquitetura')!

    // Item: 15 min + 35 min = 50 min
    expect(resumoItem.tempoTotalMs).toBe(50 * 60_000)
    expect(resumoItem.nomeGrupo).toBe('Backend')
    expect(resumoItem.diasTrabalhados).toEqual([HOJE, AMANHA])

    // Tarefa: 20 min + 25 min = 45 min
    expect(resumoTarefa.tempoTotalMs).toBe(45 * 60_000)
    expect(resumoTarefa.diasTrabalhados).toEqual([HOJE, AMANHA])

    // Total da semana: 95 min
    expect(relatorio.tempoTotalMs).toBe(95 * 60_000)
  })

  it('preserva o histórico ao converter tarefa ↔ item no mesmo dia e ao arquivar', async () => {
    const tarefa = await criarTarefa({ titulo: 'Converter', data: HOJE })
    const card = await criarGrupo({ titulo: 'Grupo A', data: HOJE })

    await definirAndamento({ tarefas: [tarefa.id] }, true)
    vi.advanceTimersByTime(12 * 60_000)
    await definirAndamento({ tarefas: [tarefa.id] }, false)

    await colocarNoGrupo(tarefa.id, card.id)
    await definirAndamento({ itens: [tarefa.id] }, true)
    vi.advanceTimersByTime(8 * 60_000)
    await definirAndamento({ itens: [tarefa.id] }, false)

    await tirarDoGrupo(tarefa.id)
    await arquivarTarefa(tarefa.id)

    const dados = await carregarDadosDeTempo()
    const relatorio = montarRelatorioDeTempo(dados, { tipo: 'hoje' }, HOJE)
    expect(relatorio.tarefas).toHaveLength(1)
    expect(relatorio.tarefas[0]).toMatchObject({
      titulo: 'Converter',
      tempoTotalMs: 20 * 60_000,
      isArquivada: true,
    })
  })

  it('excluir categoria move as sessões para "Sem categoria"', async () => {
    const cat = await criarCategoria({ nome: 'Estudos', cor: '#10B981' })
    const tarefa = await criarTarefa({ titulo: 'Ler artigo', data: HOJE, categoryId: cat.id })
    await definirAndamento({ tarefas: [tarefa.id] }, true)
    vi.advanceTimersByTime(15 * 60_000)
    await definirAndamento({ tarefas: [tarefa.id] }, false)

    await excluirCategoria(cat.id)

    const dados = await carregarDadosDeTempo()
    expect(dados.sessoes[0].categoryId).toBeUndefined()
    const relatorio = montarRelatorioDeTempo(dados, { tipo: 'hoje' }, HOJE)
    expect(relatorio.porCategoria).toEqual([
      {
        categoryId: null,
        nome: 'Sem categoria',
        cor: null,
        tempoMs: 15 * 60_000,
        percentual: 100,
      },
    ])
  })
})

describe('tempo: corte pelo período, meia-noite, sessão longa, edição, CSV, migração e backup', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('corta sessão pela meia-noite e pelo intervalo filtrado', () => {
    // Sessão das 23:00 de 03/11 às 01:30 de 04/11 (2h30 no total)
    const sessao = {
      inicio: new Date('2026-11-03T23:00:00-03:00').toISOString(),
      fim: new Date('2026-11-04T01:30:00-03:00').toISOString(),
    }

    const fatias = fatiarSessaoPorDiaLocal(sessao)
    expect(fatias.map((f) => ({ data: f.data, min: f.duracaoMs / 60_000 }))).toEqual([
      { data: '2026-11-03', min: 60 },
      { data: '2026-11-04', min: 90 },
    ])

    // Filtrando só o dia 04/11, conta apenas os 90 minutos daquele dia
    const apenasDia4 = fatiarSessaoPorDiaLocal(sessao, undefined, {
      inicio: '2026-11-04',
      fim: '2026-11-04',
    })
    expect(apenasDia4).toHaveLength(1)
    expect(apenasDia4[0].duracaoMs).toBe(90 * 60_000)

    // Fora do intervalo devolve null
    const fora = cortarSessaoNoIntervalo(
      sessao,
      new Date('2026-11-05T00:00:00-03:00').getTime(),
      new Date('2026-11-06T00:00:00-03:00').getTime(),
    )
    expect(fora).toBeNull()
  })

  it('detecta sessão longa (≥ 4h ou que passou da meia-noite) e ajusta o fim', async () => {
    const tLonga = await criarTarefa({ titulo: 'Esquecida ligada', data: HOJE })
    const tCurta = await criarTarefa({ titulo: 'Recente', data: HOJE })
    const tMeiaNoite = await criarTarefa({ titulo: 'Virou a noite', data: '2026-11-03' })

    const inicioLonga = new Date('2026-11-04T08:00:00-03:00').toISOString()
    const inicioCurta = new Date('2026-11-04T12:30:00-03:00').toISOString()
    const inicioMeiaNoite = new Date('2026-11-03T23:40:00-03:00').toISOString()
    const agoraIso = new Date('2026-11-04T13:00:00-03:00').toISOString()

    await db.tasks.update(tLonga.id, { emAndamento: true, emAndamentoDesde: inicioLonga })
    await db.sessions.add({
      id: 's-longa',
      tarefaId: tLonga.id,
      inicio: inicioLonga,
      criadoEm: inicioLonga,
      atualizadoEm: inicioLonga,
    })
    await db.tasks.update(tCurta.id, { emAndamento: true, emAndamentoDesde: inicioCurta })
    await db.sessions.add({
      id: 's-curta',
      tarefaId: tCurta.id,
      inicio: inicioCurta,
      criadoEm: inicioCurta,
      atualizadoEm: inicioCurta,
    })
    await db.tasks.update(tMeiaNoite.id, { emAndamento: true, emAndamentoDesde: inicioMeiaNoite })
    await db.sessions.add({
      id: 's-noite',
      tarefaId: tMeiaNoite.id,
      inicio: inicioMeiaNoite,
      criadoEm: inicioMeiaNoite,
      atualizadoEm: inicioMeiaNoite,
    })

    const dados = await carregarDadosDeTempo()
    const avisos = encontrarSessoesLongas(dados, agoraIso)
    expect(avisos.map((a) => a.sessaoId)).toEqual(['s-longa', 's-noite'])
    expect(avisos[0].mensagem).toBe('‘Esquecida ligada’ está em andamento há 5h')

    // Ajustar fim para 09:30 encerra a sessão e tira a marca de emAndamento da tarefa
    const fimAjustado = calcularFimAjustado(inicioLonga, '09:30')
    await ajustarFimDaSessao('s-longa', fimAjustado)

    const sessaoAtualizada = await db.sessions.get('s-longa')
    expect(sessaoAtualizada?.fim).toBe(fimAjustado)
    expect((await db.tasks.get(tLonga.id))?.emAndamento).toBeUndefined()
  })

  it('edita e exclui sessão individualmente, validando horário inválido', async () => {
    const tarefa = await criarTarefa({ titulo: 'Editar sessão', data: HOJE })
    const inicio = new Date('2026-11-04T10:00:00-03:00').toISOString()
    const fim = new Date('2026-11-04T10:20:00-03:00').toISOString()
    await db.sessions.add({
      id: 's1',
      tarefaId: tarefa.id,
      inicio,
      fim,
      criadoEm: inicio,
      atualizadoEm: fim,
    })

    // Fim antes do início é recusado
    await expect(
      editarSessao('s1', {
        inicio,
        fim: new Date('2026-11-04T09:50:00-03:00').toISOString(),
      }),
    ).rejects.toThrow(/depois do início/)

    const novoFim = new Date('2026-11-04T10:45:00-03:00').toISOString()
    await editarSessao('s1', { inicio, fim: novoFim })
    expect((await db.sessions.get('s1'))?.fim).toBe(novoFim)

    await excluirSessao('s1')
    expect(await db.sessions.count()).toBe(0)
  })

  it('filtra por busca e exporta CSV com cabeçalho e valores escapados', async () => {
    const cat = await criarCategoria({ nome: 'Estudo', cor: '#3B82F6' })
    const tarefa = await criarTarefa({
      titulo: 'Ler capítulo, parte 1',
      data: HOJE,
      categoryId: cat.id,
    })
    const inicio = new Date('2026-11-04T14:00:00-03:00').toISOString()
    const fim = new Date('2026-11-04T14:35:00-03:00').toISOString()
    await db.sessions.add({
      id: 's-csv',
      tarefaId: tarefa.id,
      categoryId: cat.id,
      inicio,
      fim,
      criadoEm: inicio,
      atualizadoEm: fim,
    })

    const dados = await carregarDadosDeTempo()
    const relatorio = montarRelatorioDeTempo(dados, { tipo: 'hoje' }, HOJE, fim)
    expect(filtrarTarefasDeTempo(relatorio.tarefas, 'estudo')).toHaveLength(1)
    expect(filtrarTarefasDeTempo(relatorio.tarefas, 'inexistente')).toHaveLength(0)

    const csv = gerarCsvDeTempo(dados, { tipo: 'hoje' }, HOJE, fim)
    expect(csv.split('\n')).toEqual([
      'data,tarefa,grupo,categoria,início,fim,minutos',
      '2026-11-04,"Ler capítulo, parte 1",,Estudo,14:00,14:35,35',
    ])
  })

  it('migração para a v12 cria sessão aberta para tarefa e item que já estavam em andamento', async () => {
    const nomeBanco = `memoria-migracao-v12-${crypto.randomUUID()}`
    const antigo = new Dexie(nomeBanco)
    antigo.version(11).stores({
      categories: 'id, nome',
      subcategories: 'id, categoryId',
      tasks: 'id, data, [data+ordem], status, categoryId, dataOriginal',
      subtasks: 'id, taskId, [taskId+ordem]',
      procedures: 'id, titulo, categoryId',
      notes: 'id, [vinculo.tipo+vinculo.id]',
      attachments: 'id, [dono.tipo+dono.id]',
      groupSeries: 'id, titulo, categoryId',
      groupCards: 'id, seriesId, data, [seriesId+data]',
      groupItems: 'id, cardId, status, origemItemId, cadeiaId',
    })
    await antigo.open()
    await antigo.table('tasks').add({
      id: 't-mig',
      titulo: 'Já rodando',
      data: HOJE,
      dataOriginal: HOJE,
      ordem: 1,
      status: 'pendente',
      emAndamento: true,
      emAndamentoDesde: '2026-11-04T12:00:00.000Z',
      criadoEm: '2026-11-04T12:00:00.000Z',
      atualizadoEm: '2026-11-04T12:00:00.000Z',
    })
    await antigo.close()

    const migrado = new MemoriaDatabase(nomeBanco)
    await migrado.open()
    const sessoes = await migrado.sessions.toArray()
    expect(sessoes).toHaveLength(1)
    expect(sessoes[0]).toMatchObject({
      tarefaId: 't-mig',
      inicio: '2026-11-04T12:00:00.000Z',
    })
    expect(sessoes[0].fim).toBeUndefined()
    await migrado.delete()
  })

  it('backup exporta e importa sessões; backup antigo importa sem sessões', async () => {
    const tarefa = await criarTarefa({ titulo: 'Com sessão', data: HOJE })
    await db.sessions.add({
      id: 'sessao-bkp',
      tarefaId: tarefa.id,
      inicio: '2026-11-04T10:00:00.000Z',
      fim: '2026-11-04T10:25:00.000Z',
      criadoEm: '2026-11-04T10:00:00.000Z',
      atualizadoEm: '2026-11-04T10:25:00.000Z',
    })

    const exportado = await exportarDados()
    expect(exportado.tabelas.sessions).toHaveLength(1)

    const json = JSON.stringify(exportado)
    await Promise.all(db.tables.map((t) => t.clear()))
    const lido = lerBackup(json, versaoDoBanco())
    expect(lido.isValido).toBe(true)
    if (!lido.isValido) return
    await importarDados(lido.backup)
    expect(await db.sessions.toArray()).toHaveLength(1)

    // Backup formato 11 sem a propriedade `sessions`
    const antigo = JSON.parse(json)
    antigo.formato = 11
    delete antigo.tabelas.sessions
    const lidoAntigo = lerBackup(JSON.stringify(antigo), versaoDoBanco())
    expect(lidoAntigo.isValido).toBe(true)
    if (!lidoAntigo.isValido) return
    await importarDados(lidoAntigo.backup)
    expect(await db.sessions.count()).toBe(0)
  })

  it('montarGraficoPorTarefa: ordenação, proporção, limite de 8 com +N outras, cores e legenda', () => {
    // 3 tarefas com categorias diferentes e tempos 30 min, 20 min, 10 min
    const tarefas3 = [
      {
        chave: 't-10',
        tipo: 'tarefa' as const,
        titulo: 'Tarefa 10 min',
        categoria: { id: 'cat-c', nome: 'Saúde', cor: '#EC4899' },
        isArquivada: false,
        tempoTotalMs: 10 * 60_000,
        diasTrabalhados: ['2026-11-04'],
        sessoes: [],
      },
      {
        chave: 't-30',
        tipo: 'tarefa' as const,
        titulo: 'Tarefa 30 min',
        categoria: { id: 'cat-a', nome: 'Trabalho', cor: '#8B3DFF' },
        isArquivada: false,
        tempoTotalMs: 30 * 60_000,
        diasTrabalhados: ['2026-11-04'],
        sessoes: [],
      },
      {
        chave: 't-20',
        tipo: 'tarefa' as const,
        titulo: 'Tarefa 20 min',
        // Sem categoria: cor neutra (null)
        isArquivada: false,
        tempoTotalMs: 20 * 60_000,
        diasTrabalhados: ['2026-11-04'],
        sessoes: [],
      },
    ]

    const grafico3 = montarGraficoPorTarefa(tarefas3)
    expect(
      grafico3.itens.map((i) => ({ titulo: i.titulo, prop: i.proporcao, cor: i.cor })),
    ).toEqual([
      { titulo: 'Tarefa 30 min', prop: 100, cor: '#8B3DFF' },
      { titulo: 'Tarefa 20 min', prop: 67, cor: null },
      { titulo: 'Tarefa 10 min', prop: 33, cor: '#EC4899' },
    ])
    // Legenda na ordem de aparição das tarefas
    expect(grafico3.categoriasLegenda).toEqual([
      { id: 'cat-a', nome: 'Trabalho', cor: '#8B3DFF' },
      { id: null, nome: 'Sem categoria', cor: null },
      { id: 'cat-c', nome: 'Saúde', cor: '#EC4899' },
    ])

    // 10 tarefas -> 8 barras individuais + 1 barra "+2 outras" com a soma dos tempos
    const tarefas10 = Array.from({ length: 10 }, (_, i) => ({
      chave: `t-${i + 1}`,
      tipo: 'tarefa' as const,
      titulo: `Tarefa ${i + 1}`,
      isArquivada: false,
      tempoTotalMs: (10 - i) * 10 * 60_000, // 100, 90, 80, 70, 60, 50, 40, 30, 20, 10 min
      diasTrabalhados: ['2026-11-04'],
      sessoes: [],
    }))

    const grafico10 = montarGraficoPorTarefa(tarefas10)
    expect(grafico10.itens).toHaveLength(9)
    expect(grafico10.itens.slice(0, 8).map((i) => i.titulo)).toEqual([
      'Tarefa 1',
      'Tarefa 2',
      'Tarefa 3',
      'Tarefa 4',
      'Tarefa 5',
      'Tarefa 6',
      'Tarefa 7',
      'Tarefa 8',
    ])
    // Tarefas 9 (20 min) e 10 (10 min) somam 30 min -> proporção 30/100 = 30%
    const outras = grafico10.itens[8]
    expect(outras).toMatchObject({
      chave: 'outras',
      titulo: '+2 outras',
      cor: null,
      tempoMs: 30 * 60_000,
      proporcao: 30,
      isOutras: true,
    })
  })
})
