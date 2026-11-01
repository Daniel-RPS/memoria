import { db } from '@/db/database'
import {
  anexoDoArquivo,
  anexoParaArquivo,
  FORMATO_ATUAL,
  MARCA_DO_APP,
  NOMES_DAS_TABELAS,
  type Backup,
  type NomeTabela,
  type Quantidades,
} from '@/lib/backup'

/** Versão atual do banco (o backup guarda a versão em que foi feito). */
export function versaoDoBanco() {
  return db.verno
}

/** Todos os dados do app, prontos para virar o arquivo de backup. */
export async function exportarDados(): Promise<Backup> {
  const tabelas = await db.transaction('r', db.tables, async () => ({
    categories: await db.categories.toArray(),
    subcategories: await db.subcategories.toArray(),
    tasks: await db.tasks.toArray(),
    subtasks: await db.subtasks.toArray(),
    procedures: await db.procedures.toArray(),
    notes: await db.notes.toArray(),
    attachments: await db.attachments.toArray(),
    groupSeries: await db.groupSeries.toArray(),
    groupCards: await db.groupCards.toArray(),
    groupItems: await db.groupItems.toArray(),
  }))
  // Fora da transação: ler blobs não é operação do Dexie e encerraria a transação.
  const attachments = await Promise.all(tabelas.attachments.map(anexoParaArquivo))
  return {
    app: MARCA_DO_APP,
    formato: FORMATO_ATUAL,
    versaoBanco: versaoDoBanco(),
    exportadoEm: new Date().toISOString(),
    tabelas: { ...tabelas, attachments },
  }
}

/**
 * Substitui TODOS os dados pelos do backup, numa transação única:
 * se algo falhar, os dados atuais ficam intactos.
 */
export async function importarDados(backup: Backup) {
  const { tabelas } = backup
  const anexos = tabelas.attachments.map(anexoDoArquivo)
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    await db.categories.bulkAdd(tabelas.categories)
    await db.subcategories.bulkAdd(tabelas.subcategories)
    await db.tasks.bulkAdd(tabelas.tasks)
    await db.subtasks.bulkAdd(tabelas.subtasks)
    await db.procedures.bulkAdd(tabelas.procedures)
    await db.notes.bulkAdd(tabelas.notes)
    await db.attachments.bulkAdd(anexos)
    await db.groupSeries.bulkAdd(tabelas.groupSeries)
    await db.groupCards.bulkAdd(tabelas.groupCards)
    await db.groupItems.bulkAdd(tabelas.groupItems)
  })
}

/** Quantidade de registros de cada tabela, para comparar com o backup antes de importar. */
export async function contarDados(): Promise<Quantidades> {
  const nomes = Object.keys(NOMES_DAS_TABELAS) as NomeTabela[]
  const totais = await Promise.all(nomes.map((nome) => db.table(nome).count()))
  return Object.fromEntries(nomes.map((nome, indice) => [nome, totais[indice]])) as Quantidades
}
