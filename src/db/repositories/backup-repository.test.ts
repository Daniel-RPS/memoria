import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import {
  contarDados,
  exportarDados,
  importarDados,
  versaoDoBanco,
} from '@/db/repositories/backup-repository'
import { criarCategoria, criarSubcategoria } from '@/db/repositories/category-repository'
import { concluirExecucao, iniciarOuRetomarExecucao } from '@/db/repositories/execution-repository'
import { criarProcedimento, salvarProcedimento } from '@/db/repositories/procedure-repository'
import { criarSubtarefa } from '@/db/repositories/subtask-repository'
import { criarTarefa, moverTarefas } from '@/db/repositories/task-repository'
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
    descricao: '',
    camposVariaveis: [{ id: 'c', nome: 'Disco', tipo: 'texto' }],
    secoes: [
      { id: 's', titulo: 'S', passos: [{ id: 'p', texto: 'x', anexos: [], subpassos: [] }] },
    ],
  })
  await salvarProcedimento(procedimento.id, { ...procedimento, titulo: 'Backup v2' })
  const execucao = await iniciarOuRetomarExecucao({
    procedureId: procedimento.id,
    hoje: '2026-10-30',
  })
  await concluirExecucao(execucao.id)
  await db.notes.add({ id: 'n', titulo: 'Nota', conteudo: 'texto', criadoEm: '', atualizadoEm: '' })
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
      { id: 'repetido', nome: 'A', cor: '#000000', criadoEm: '', atualizadoEm: '' },
      { id: 'repetido', nome: 'B', cor: '#000000', criadoEm: '', atualizadoEm: '' },
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
      procedures: 1,
      procedureVersions: 1,
      executions: 1,
      notes: 1,
      attachments: 1,
    })
  })
})
