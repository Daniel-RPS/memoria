import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import {
  contarDados,
  exportarDados,
  importarDados,
  versaoDoBanco,
} from '@/db/repositories/backup-repository'
import {
  criarCategoria,
  criarSubcategoria,
  listarCategorias,
  reordenarCategoria,
  reordenarSubcategoria,
} from '@/db/repositories/category-repository'
import { criarNota } from '@/db/repositories/note-repository'
import { criarProcedimento, salvarProcedimento } from '@/db/repositories/procedure-repository'
import { criarSubtarefa } from '@/db/repositories/subtask-repository'
import { criarGrupo, criarItem, definirConclusaoItem } from '@/db/repositories/group-repository'
import { criarTarefa, definirConclusao, moverTarefas } from '@/db/repositories/task-repository'
import { lerBackup } from '@/lib/backup'

async function popularBanco() {
  const casa = await criarCategoria({ nome: 'Casa' })
  const jardim = await criarSubcategoria({ categoryId: casa.id, nome: 'Jardim' })
  const tarefa = await criarTarefa({
    titulo: 'Podar',
    data: '2026-10-28',
    categoryId: casa.id,
    subcategoryId: jardim.id,
  })
  await moverTarefas([tarefa.id], '2026-10-30')
  await criarSubtarefa({ taskId: tarefa.id, titulo: 'Comprar tesoura' })
  const procedimento = await criarProcedimento({
    titulo: 'Backup',
    categoryId: casa.id,
    etapas: [
      { id: 'e1', texto: 'Conectar o disco' },
      { id: 'e2', texto: 'Copiar a pasta' },
    ],
  })
  await salvarProcedimento(procedimento.id, {
    titulo: 'Backup semanal',
    categoryId: casa.id,
    etapas: [{ id: 'e2', texto: 'Copiar a pasta' }],
  })
  await criarProcedimento({ titulo: 'Sem categoria', categoryId: '', etapas: [] })
  await db.notes.add({ id: 'n', titulo: 'Nota', conteudo: 'texto', criadoEm: '', atualizadoEm: '' })
  const grupo = await criarGrupo({ titulo: 'Hostinger', data: '2026-10-30' })
  const deploy = await criarItem(grupo.id, 'Fazer Deploy')
  await criarNota({ conteudo: 'do grupo', vinculo: { tipo: 'grupo', id: grupo.seriesId } })
  await criarNota({ conteudo: 'do item', vinculo: { tipo: 'item', id: deploy.cadeiaId } })
  await criarNota({ conteudo: 'da tarefa', vinculo: { tipo: 'tarefa', id: tarefa.id } })
  await db.attachments.add({
    id: 'a',
    dono: { tipo: 'task', id: tarefa.id },
    tipo: 'foto',
    nome: 'folha.png',
    blob: new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }),
    criadoEm: '',
    atualizadoEm: '',
  })
}

/** Conteúdo comparável de todas as tabelas (anexos com o blob lido como bytes). */
async function fotografarBanco() {
  const tabelas: Record<string, unknown[]> = {}
  for (const tabela of db.tables) {
    const registros = await tabela.toArray()
    tabelas[tabela.name] = await Promise.all(
      registros.map(async (registro) =>
        registro.blob instanceof Blob
          ? { ...registro, blob: [...new Uint8Array(await registro.blob.arrayBuffer())] }
          : registro,
      ),
    )
  }
  return tabelas
}

describe('backup', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('exportar, apagar tudo e importar devolve exatamente os mesmos dados', async () => {
    await popularBanco()
    const antes = await fotografarBanco()

    const arquivo = JSON.stringify(await exportarDados())
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    const leitura = lerBackup(arquivo, versaoDoBanco())
    expect(leitura.isValido).toBe(true)
    if (!leitura.isValido) return
    await importarDados(leitura.backup)

    expect(await fotografarBanco()).toEqual(antes)
    const tarefa = (await db.tasks.toArray())[0]
    expect(tarefa).toMatchObject({ data: '2026-10-30', dataOriginal: '2026-10-28' })
    const vinculos = (await db.notes.toArray()).map((nota) => nota.vinculo?.tipo ?? 'avulsa')
    expect(vinculos.sort()).toEqual(['avulsa', 'grupo', 'item', 'tarefa'])
    const procedimentos = await db.procedures.orderBy('titulo').toArray()
    expect(procedimentos.map(({ titulo, etapas }) => ({ titulo, etapas }))).toEqual([
      { titulo: 'Backup semanal', etapas: [{ id: 'e2', texto: 'Copiar a pasta', ordem: 0 }] },
      { titulo: 'Sem categoria', etapas: [] },
    ])
  })

  it('exporta e importa a ordem das categorias e a subcategoria do procedimento', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const trabalho = await criarCategoria({ nome: 'Trabalho' })
    const jardim = await criarSubcategoria({ categoryId: casa.id, nome: 'Jardim' })
    const contas = await criarSubcategoria({ categoryId: casa.id, nome: 'Contas' })
    await reordenarCategoria([trabalho.id, casa.id], trabalho.id)
    await reordenarSubcategoria([contas.id, jardim.id], contas.id)
    await criarProcedimento({
      titulo: 'Adubar',
      categoryId: casa.id,
      subcategoryId: jardim.id,
      etapas: [],
    })
    const arquivo = JSON.stringify(await exportarDados())
    expect(JSON.parse(arquivo).tabelas.categories[0]).toHaveProperty('ordem')

    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    const leitura = lerBackup(arquivo, versaoDoBanco())
    if (!leitura.isValido) throw new Error(leitura.mensagem)
    await importarDados(leitura.backup)

    const categorias = await listarCategorias()
    expect(categorias.map((categoria) => categoria.nome)).toEqual(['Trabalho', 'Casa'])
    expect(categorias[1].subcategorias.map((sub) => sub.nome)).toEqual(['Contas', 'Jardim'])
    expect((await db.procedures.toArray())[0]).toMatchObject({ subcategoryId: jardim.id })
  })

  it('exporta e importa o tipo das categorias', async () => {
    await criarCategoria({ nome: 'Github', tipo: 'grupo' })
    await criarCategoria({ nome: 'Github', tipo: 'procedimento' })
    const arquivo = JSON.stringify(await exportarDados())
    const tipos = JSON.parse(arquivo).tabelas.categories.map((item: { tipo: string }) => item.tipo)
    expect(tipos.sort()).toEqual(['grupo', 'procedimento'])

    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    const leitura = lerBackup(arquivo, versaoDoBanco())
    if (!leitura.isValido) throw new Error(leitura.mensagem)
    await importarDados(leitura.backup)

    const categorias = await listarCategorias()
    expect(categorias.map(({ nome, tipo }) => `${tipo}:${nome}`).sort()).toEqual([
      'grupo:Github',
      'procedimento:Github',
    ])
  })

  it('exporta e importa o momento da conclusão de tarefas e itens de grupo (mapa do Início)', async () => {
    const tarefa = await criarTarefa({ titulo: 'Feita', data: '2026-10-30' })
    await definirConclusao(tarefa.id, true)
    const card = await criarGrupo({ titulo: 'Casa', data: '2026-10-30' })
    const item = await criarItem(card.id, 'Varrer')
    await definirConclusaoItem(item.id, true)
    const concluidaEm = (await db.tasks.get(tarefa.id))?.concluidaEm
    const concluidoEm = (await db.groupItems.get(item.id))?.concluidoEm
    expect(concluidaEm).toBeDefined()
    expect(concluidoEm).toBeDefined()

    const arquivo = JSON.stringify(await exportarDados())
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    const leitura = lerBackup(arquivo, versaoDoBanco())
    if (!leitura.isValido) throw new Error(leitura.mensagem)
    await importarDados(leitura.backup)

    expect(await db.tasks.get(tarefa.id)).toMatchObject({ status: 'concluida', concluidaEm })
    expect(await db.groupItems.get(item.id)).toMatchObject({ status: 'concluido', concluidoEm })
  })

  it('importar substitui: o que não está no backup some', async () => {
    await criarTarefa({ titulo: 'Do backup', data: '2026-10-30' })
    const backup = await exportarDados()
    await criarTarefa({ titulo: 'Criada depois', data: '2026-10-30' })

    await importarDados(backup)

    expect((await db.tasks.toArray()).map((tarefa) => tarefa.titulo)).toEqual(['Do backup'])
  })

  it('se a importação falhar no meio, os dados atuais ficam intactos', async () => {
    await criarTarefa({ titulo: 'Atual', data: '2026-10-30' })
    const backup = await exportarDados()
    // Dois registros com o mesmo id fazem o bulkAdd falhar depois de limpar as tabelas.
    backup.tabelas.categories.push(
      {
        id: 'repetido',
        nome: 'A',
        cor: '#000000',
        tipo: 'grupo',
        ordem: 1,
        criadoEm: '',
        atualizadoEm: '',
      },
      {
        id: 'repetido',
        nome: 'B',
        cor: '#000000',
        tipo: 'grupo',
        ordem: 2,
        criadoEm: '',
        atualizadoEm: '',
      },
    )
    backup.tabelas.tasks = []

    await expect(importarDados(backup)).rejects.toThrow()

    expect((await db.tasks.toArray()).map((tarefa) => tarefa.titulo)).toEqual(['Atual'])
    expect(await db.categories.count()).toBe(0)
  })

  it('conta os registros atuais de cada tabela', async () => {
    await popularBanco()
    expect(await contarDados()).toMatchObject({
      tasks: 1,
      subtasks: 1,
      categories: 1,
      subcategories: 1,
      procedures: 2,
      notes: 4,
      attachments: 1,
      groupItems: 1,
    })
  })
})
