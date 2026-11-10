import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, MemoriaDatabase } from '@/db/database'
import {
  criarProcedimento,
  excluirProcedimento,
  moverProcedimento,
  obterProcedimento,
  salvarProcedimento,
} from '@/db/repositories/procedure-repository'
import {
  carregarDadosDosVinculos,
  contarNotasDe,
  criarNota,
  listarNotas,
} from '@/db/repositories/note-repository'
import { donoDaNota, indexarVinculos, vinculoDoProcedimento } from '@/lib/notas'

describe('procedure-repository', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('cria com 3 etapas, renomeia a 2ª, exclui a 1ª: ficam 2 etapas numeradas na ordem', async () => {
    const criado = await criarProcedimento({
      titulo: '  Trocar o filtro  ',
      categoryId: '',
      etapas: [
        { id: 'a', texto: 'Desligar a torneira' },
        { id: 'b', texto: 'Abrir a tampa' },
        { id: 'c', texto: 'Encaixar o refil' },
      ],
    })
    expect(criado.titulo).toBe('Trocar o filtro')
    expect(criado).not.toHaveProperty('categoryId')
    expect(criado.etapas.map((etapa) => etapa.ordem)).toEqual([0, 1, 2])

    // Renomear a 2ª.
    await salvarProcedimento(criado.id, {
      titulo: 'Trocar o filtro',
      categoryId: '',
      etapas: [
        { id: 'a', texto: 'Desligar a torneira' },
        { id: 'b', texto: 'Desrosquear a tampa' },
        { id: 'c', texto: 'Encaixar o refil' },
      ],
    })
    // Excluir a 1ª.
    await salvarProcedimento(criado.id, {
      titulo: 'Trocar o filtro',
      categoryId: '',
      etapas: [
        { id: 'b', texto: 'Desrosquear a tampa' },
        { id: 'c', texto: 'Encaixar o refil' },
      ],
    })

    expect((await obterProcedimento(criado.id))?.etapas).toEqual([
      { id: 'b', texto: 'Desrosquear a tampa', ordem: 0 },
      { id: 'c', texto: 'Encaixar o refil', ordem: 1 },
    ])
  })

  it('trocar a categoria e depois tirar grava e limpa o categoryId', async () => {
    const criado = await criarProcedimento({ titulo: 'P', categoryId: 'casa', etapas: [] })
    expect(criado.categoryId).toBe('casa')
    await salvarProcedimento(criado.id, { titulo: 'P', categoryId: '', etapas: [] })
    expect(await obterProcedimento(criado.id)).not.toHaveProperty('categoryId')
  })

  it('salvar um procedimento que não existe avisa', async () => {
    await expect(
      salvarProcedimento('nao-existe', { titulo: 'P', categoryId: '', etapas: [] }),
    ).rejects.toThrow('Procedimento não encontrado.')
  })

  it('excluir apaga o procedimento', async () => {
    const criado = await criarProcedimento({ titulo: 'P', categoryId: '', etapas: [] })
    await excluirProcedimento(criado.id)
    expect(await db.procedures.count()).toBe(0)
  })
})

describe('migração para o banco v7', () => {
  it('converte o procedimento da v6 sem perder título, categoria e passos', async () => {
    const nome = 'migracao-v7'
    const antigo = new Dexie(nome)
    antigo.version(6).stores({
      categories: 'id, nome',
      subcategories: 'id, categoryId',
      tasks: 'id, data, [data+ordem], status, categoryId, dataOriginal, procedureId',
      subtasks: 'id, taskId, [taskId+ordem]',
      procedures: 'id, titulo, categoryId',
      procedureVersions: 'id, procedureId, [procedureId+versao]',
      executions: 'id, procedureId, data, taskId',
      notes: 'id, [dono.tipo+dono.id]',
      attachments: 'id, [dono.tipo+dono.id]',
      groupSeries: 'id, titulo, categoryId',
      groupCards: 'id, seriesId, data, [seriesId+data]',
      groupItems: 'id, cardId, status, origemItemId',
    })
    const base = { criadoEm: '2026-01-01T10:00:00.000Z', atualizadoEm: '2026-01-02T10:00:00.000Z' }
    await antigo.table('procedures').add({
      id: 'p',
      titulo: 'Renovar certificado',
      categoryId: 'trabalho',
      descricao: 'TLS',
      camposVariaveis: [{ id: 'c', nome: 'Servidor', tipo: 'texto' }],
      versao: 3,
      secoes: [
        {
          id: 's1',
          titulo: 'Preparar',
          passos: [
            {
              id: 'p1',
              texto: 'Gerar CSR',
              codigo: 'openssl req -new',
              anexos: [],
              subpassos: [{ id: 'sp1', texto: 'Usar 4096 bits' }],
            },
          ],
        },
        {
          id: 's2',
          titulo: 'Instalar',
          passos: [{ id: 'p2', texto: 'Copiar para o servidor', anexos: [], subpassos: [] }],
        },
      ],
      ...base,
    })
    await antigo.table('procedureVersions').add({ id: 'v', procedureId: 'p', versao: 2 })
    await antigo.table('executions').add({ id: 'x', procedureId: 'p', data: '2026-10-30' })
    await antigo.table('tasks').add({
      id: 't',
      titulo: 'Renovar certificado',
      data: '2026-10-30',
      dataOriginal: '2026-10-30',
      ordem: 1,
      status: 'pendente',
      procedureId: 'p',
      ...base,
    })
    await antigo.table('attachments').bulkAdd([
      { id: 'a1', dono: { tipo: 'procedure', id: 'p' }, tipo: 'link', nome: 'Doc', ...base },
      { id: 'a2', dono: { tipo: 'step', id: 'p1' }, tipo: 'link', nome: 'Vídeo', ...base },
      { id: 'a3', dono: { tipo: 'task', id: 't' }, tipo: 'link', nome: 'Da tarefa', ...base },
    ])
    await antigo.table('notes').bulkAdd([
      { id: 'n1', titulo: '', conteudo: 'x', dono: { tipo: 'procedure', id: 'p' }, ...base },
      { id: 'n2', titulo: 'Avulsa', conteudo: 'y', ...base },
    ])
    antigo.close()

    const novo = new MemoriaDatabase(nome)
    await novo.open()

    expect(await novo.procedures.get('p')).toEqual({
      id: 'p',
      titulo: 'Renovar certificado',
      categoryId: 'trabalho',
      etapas: [
        { id: 'p1', texto: 'Gerar CSR', ordem: 0 },
        { id: 'sp1', texto: 'Usar 4096 bits', ordem: 1 },
        { id: 'p2', texto: 'Copiar para o servidor', ordem: 2 },
      ],
      // v14: preenchida pela ordem em que o cartão aparecia.
      ordem: 1,
      ...base,
    })
    expect(novo.tables.map((tabela) => tabela.name)).not.toContain('procedureVersions')
    expect(novo.tables.map((tabela) => tabela.name)).not.toContain('executions')
    const tarefa = await novo.tasks.get('t')
    expect(tarefa).toMatchObject({ titulo: 'Renovar certificado', status: 'pendente' })
    expect(tarefa).not.toHaveProperty('procedureId')
    expect((await novo.attachments.toArray()).map((anexo) => anexo.id)).toEqual(['a3'])
    expect((await novo.notes.toArray()).map((nota) => nota.id)).toEqual(['n2'])
    novo.close()
    await Dexie.delete(nome)
  })
})

describe('ordem manual e notas de procedimento', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  const dados = (titulo: string, categoryId = '') => ({ titulo, categoryId, etapas: [] })

  it('novo entra no fim da categoria; trocar de categoria leva para o fim da nova', async () => {
    const a = await criarProcedimento(dados('A', 'casa'))
    const b = await criarProcedimento(dados('B', 'casa'))
    const x = await criarProcedimento(dados('X', 'trabalho'))
    expect(b.ordem).toBeGreaterThan(a.ordem)

    await salvarProcedimento(a.id, dados('A', 'trabalho'))
    const movido = await obterProcedimento(a.id)
    expect(movido!.ordem).toBeGreaterThan(x.ordem)

    // Salvar sem trocar a categoria não muda a posição.
    await salvarProcedimento(a.id, dados('A renomeado', 'trabalho'))
    expect((await obterProcedimento(a.id))!.ordem).toBe(movido!.ordem)
  })

  it('subir/descer troca de lugar só dentro da categoria e não muda a data de edição', async () => {
    const a = await criarProcedimento(dados('A', 'casa'))
    const b = await criarProcedimento(dados('B', 'casa'))
    await moverProcedimento(b.id, 'cima')
    const [aDepois, bDepois] = await Promise.all([obterProcedimento(a.id), obterProcedimento(b.id)])
    expect(bDepois!.ordem).toBeLessThan(aDepois!.ordem)
    expect(bDepois!.atualizadoEm).toBe(b.atualizadoEm)
    // Já é o primeiro: não sobe mais.
    await moverProcedimento(b.id, 'cima')
    expect((await obterProcedimento(b.id))!.ordem).toBe(bDepois!.ordem)
  })

  it('notas ligadas ao procedimento; excluir o procedimento deixa as notas avulsas', async () => {
    const procedimento = await criarProcedimento(dados('Recuperação de senha'))
    const vinculo = vinculoDoProcedimento(procedimento)
    await criarNota({ conteudo: 'primeira', vinculo })
    await criarNota({ conteudo: 'segunda', vinculo })
    expect(await contarNotasDe(vinculo)).toBe(2)

    await excluirProcedimento(procedimento.id)
    expect(await contarNotasDe(vinculo)).toBe(0)
    const notas = await listarNotas()
    expect(notas.map((nota) => nota.conteudo).sort()).toEqual(['primeira', 'segunda'])
    expect(notas.every((nota) => nota.vinculo === undefined)).toBe(true)
  })

  it('o dono da nota mostra "Categoria › Procedimento"', async () => {
    const procedimento = await criarProcedimento(dados('Recuperação de senha'))
    const nota = await criarNota({ vinculo: vinculoDoProcedimento(procedimento) })
    const dadosDosVinculos = await carregarDadosDosVinculos([nota])
    const dono = donoDaNota(nota.vinculo, indexarVinculos(dadosDosVinculos, '2026-11-10'))
    expect(dono.tipo).toBe('procedimento')
    expect(dono.caminho).toEqual([
      { tipo: 'procedimento', texto: 'Recuperação de senha', procedimentoId: procedimento.id },
    ])
  })
})
