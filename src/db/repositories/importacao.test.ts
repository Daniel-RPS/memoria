import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { exportarDados, versaoDoBanco } from '@/db/repositories/backup-repository'
import { criarCategoria } from '@/db/repositories/category-repository'
import { criarGrupo, criarItem } from '@/db/repositories/group-repository'
import {
  carregarExistentes,
  desfazerImportacao,
  importarRascunho,
  type OpcoesDeGravacao,
} from '@/db/repositories/importacao-repository'
import { criarNota } from '@/db/repositories/note-repository'
import { criarProcedimento } from '@/db/repositories/procedure-repository'
import { criarSubtarefa } from '@/db/repositories/subtask-repository'
import { criarTarefa } from '@/db/repositories/task-repository'
import { lerBackup } from '@/lib/backup'
import { lerMarkdown } from '@/lib/importar/markdown'
import { categoriasDoBackup, lerPartesDoBackup } from '@/lib/importar/memoria'
import {
  acharDuplicados,
  planejarImportacao,
  type AcaoParaDuplicado,
} from '@/lib/importar/planejar'
import { juntarRascunhos, type RascunhoDeImportacao } from '@/lib/importar/rascunho'

const DIA = '2026-11-03'
const SEM_CATEGORIA: OpcoesDeGravacao = {
  categoriaDeGrupo: { modo: 'nenhuma' },
  categoriaDeProcedimento: { modo: 'nenhuma' },
}

async function importar(
  rascunho: RascunhoDeImportacao,
  acao: AcaoParaDuplicado = 'pular',
  opcoes = SEM_CATEGORIA,
) {
  const duplicados = acharDuplicados(rascunho, await carregarExistentes(), DIA)
  const plano = planejarImportacao(rascunho, {
    desmarcadas: new Set(),
    duplicados,
    acao,
    dataPadrao: DIA,
  })
  return importarRascunho(plano, opcoes)
}

async function contarTudo() {
  const tabelas = [
    db.categories,
    db.subcategories,
    db.tasks,
    db.subtasks,
    db.groupSeries,
    db.groupCards,
    db.groupItems,
    db.procedures,
    db.notes,
    db.attachments,
  ]
  return Promise.all(tabelas.map((tabela) => tabela.count()))
}

describe('importação', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('.md com tarefas, grupo, procedimento e nota; desfazer remove tudo', async () => {
    const antes = await contarTudo()
    const rascunho = juntarRascunhos([
      lerMarkdown(
        '- [ ] Ligar\n  - [x] Achar o número\n- [x] Pagar\n\n# Mercado\n- Leite\n- [x] Café',
        'tarefas',
        'a',
      ),
      lerMarkdown('# Deploy\n1. Build\n2. Publicar', 'procedimento', 'b'),
      lerMarkdown('# Ideias\nUma ideia', 'nota', 'c'),
    ])
    const resultado = await importar(rascunho)
    expect(resultado.quantidade).toBe(5)

    const tarefas = (await db.tasks.toArray()).sort((a, b) => a.ordem - b.ordem)
    expect(tarefas.map(({ titulo, data, status }) => [titulo, data, status])).toEqual([
      ['Ligar', DIA, 'pendente'],
      ['Pagar', DIA, 'concluida'],
    ])
    const [subtarefa] = await db.subtasks.toArray()
    expect(subtarefa).toMatchObject({ titulo: 'Achar o número', concluida: true })
    const itens = (await db.groupItems.toArray()).sort((a, b) => a.ordem - b.ordem)
    expect(itens.map(({ titulo, status }) => [titulo, status])).toEqual([
      ['Leite', 'pendente'],
      ['Café', 'concluido'],
    ])
    expect((await db.groupCards.toArray())[0].data).toBe(DIA)
    expect((await db.procedures.toArray())[0].etapas.map((etapa) => etapa.texto)).toEqual([
      'Build',
      'Publicar',
    ])
    expect((await db.notes.toArray())[0]).toMatchObject({ titulo: 'Ideias', conteudo: 'Uma ideia' })

    await desfazerImportacao(resultado)
    expect(await contarTudo()).toEqual(antes)
  })

  it('duplicados: pular não cria; substituir troca e desfazer devolve como estava', async () => {
    const tarefa = await criarTarefa({ titulo: 'Pagar', data: DIA })
    await criarSubtarefa({ taskId: tarefa.id, titulo: 'Antiga' })
    const procedimento = await criarProcedimento({
      titulo: 'Deploy',
      categoryId: '',
      etapas: [{ id: 'e1', texto: 'Velha' }],
    })
    const nota = await criarNota({ titulo: 'Ideias', conteudo: 'antes' })
    const card = await criarGrupo({ titulo: 'Mercado', data: DIA })
    await criarItem(card.id, 'Leite')
    const rascunho = juntarRascunhos([
      lerMarkdown('- [x] pagar\n  - Nova\n\n# Mercado\n- [x] Leite\n- Pão', 'tarefas', 'a'),
      lerMarkdown('# deploy\n1. Nova', 'procedimento', 'b'),
      lerMarkdown('# Ideias\ndepois', 'nota', 'c'),
    ])

    expect((await importar(rascunho, 'pular')).quantidade).toBe(0)
    expect(await db.tasks.count()).toBe(1)

    const resultado = await importar(rascunho, 'substituir')
    expect(await db.tasks.count()).toBe(1)
    expect((await db.tasks.get(tarefa.id))?.status).toBe('concluida')
    expect((await db.subtasks.toArray()).map((sub) => sub.titulo)).toEqual(['Nova'])
    expect((await db.procedures.get(procedimento.id))?.etapas[0].texto).toBe('Nova')
    expect((await db.notes.get(nota.id))?.conteudo).toBe('depois')
    const itens = (await db.groupItems.toArray()).sort((a, b) => a.ordem - b.ordem)
    expect(itens.map(({ titulo, status }) => [titulo, status])).toEqual([
      ['Leite', 'concluido'],
      ['Pão', 'pendente'],
    ])

    await desfazerImportacao(resultado)
    expect((await db.tasks.get(tarefa.id))?.status).toBe('pendente')
    expect((await db.subtasks.toArray()).map((sub) => sub.titulo)).toEqual(['Antiga'])
    expect((await db.procedures.get(procedimento.id))?.etapas[0].texto).toBe('Velha')
    expect((await db.notes.get(nota.id))?.conteudo).toBe('antes')
    expect((await db.groupItems.toArray()).map(({ titulo, status }) => [titulo, status])).toEqual([
      ['Leite', 'pendente'],
    ])
  })

  it('"da origem" usa a categoria do tipo com o mesmo nome ou cria (e desfazer apaga a criada)', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const rascunho = juntarRascunhos([
      lerMarkdown('- x', 'tarefas', 'a'),
      lerMarkdown('- y', 'tarefas', 'b'),
    ])
    rascunho.tarefas[0].categoria = 'casa'
    rascunho.tarefas[1].categoria = 'Trabalho'
    const resultado = await importar(rascunho, 'pular', {
      categoriaDeGrupo: { modo: 'da-origem' },
      categoriaDeProcedimento: { modo: 'nenhuma' },
    })
    const tarefas = (await db.tasks.toArray()).sort((a, b) => a.ordem - b.ordem)
    const trabalho = (await db.categories.toArray()).find(
      (categoria) => categoria.nome === 'Trabalho',
    )
    expect(tarefas.map((tarefa) => tarefa.categoryId)).toEqual([casa.id, trabalho?.id])
    expect(trabalho?.tipo).toBe('grupo')

    await desfazerImportacao(resultado)
    expect((await db.categories.toArray()).map((categoria) => categoria.nome)).toEqual(['Casa'])
  })

  it('backup em partes: só procedimentos, ou só o que é de uma categoria', async () => {
    const cloudflare = await criarCategoria({ nome: 'Cloudflare', tipo: 'procedimento' })
    await criarCategoria({ nome: 'Cloudflare' })
    await criarProcedimento({
      titulo: 'DNS',
      categoryId: cloudflare.id,
      etapas: [{ id: 'a', texto: 'Apontar' }],
    })
    await criarProcedimento({ titulo: 'Outro', categoryId: '', etapas: [] })
    await criarTarefa({ titulo: 'Solta', data: DIA })
    await criarNota({ titulo: 'Nota', conteudo: '' })
    const lido = lerBackup(JSON.stringify(await exportarDados()), versaoDoBanco())
    if (!lido.isValido) throw new Error(lido.mensagem)

    expect(categoriasDoBackup(lido.backup)).toEqual(['Cloudflare'])
    const soProcedimentos = lerPartesDoBackup(lido.backup, { partes: ['procedimentos'] })
    expect(soProcedimentos.procedimentos.map((item) => item.titulo).sort()).toEqual([
      'DNS',
      'Outro',
    ])
    expect(soProcedimentos.tarefas).toEqual([])
    expect(soProcedimentos.notas).toEqual([])

    const daCategoria = lerPartesDoBackup(lido.backup, {
      partes: ['tarefas', 'procedimentos', 'notas'],
      categoria: 'cloudflare',
    })
    expect(daCategoria.procedimentos).toEqual([
      expect.objectContaining({ titulo: 'DNS', categoria: 'Cloudflare', etapas: ['Apontar'] }),
    ])
    expect(daCategoria.tarefas).toEqual([])
    expect(daCategoria.notas).toEqual([])
  })
})
