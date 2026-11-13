import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import {
  adicionarAnexo,
  excluirAnexo,
  listarAnexos,
} from '@/db/repositories/attachment-repository'
import {
  criarNota,
  excluirNota,
  metadadosDeAnexosDasNotas,
} from '@/db/repositories/note-repository'
import { exportarDados, importarDados } from '@/db/repositories/backup-repository'
import { lerBackup } from '@/lib/backup'

describe('Anexos de documentos no domínio e banco', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('adiciona documento a uma nota, lista metadados, remove anexo e excluir nota apaga conteúdo', async () => {
    const nota = await criarNota({ titulo: 'Nota com Doc', conteudo: 'Texto da nota' })
    const pdfBytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]) // %PDF-1.4
    const blobPdf = new Blob([pdfBytes], { type: 'application/pdf' })

    const anexo = await adicionarAnexo({
      dono: { tipo: 'note', id: nota.id },
      tipo: 'documento',
      nome: 'manual.pdf',
      blob: blobPdf,
      extensao: '.pdf',
      tamanho: pdfBytes.length,
    })

    expect(anexo.id).toBeDefined()
    expect(anexo.tipo).toBe('documento')
    expect(anexo.nome).toBe('manual.pdf')
    expect(anexo.extensao).toBe('.pdf')
    expect(anexo.tamanho).toBe(pdfBytes.length)

    // Metadados sem carregar blobs
    const metas = await metadadosDeAnexosDasNotas([nota.id])
    const metaDaNota = metas.get(nota.id)
    expect(metaDaNota).toBeDefined()
    expect(metaDaNota?.quantosDocumentos).toBe(1)
    expect(metaDaNota?.tipos.has('documento')).toBe(true)
    expect(metaDaNota?.nomesAnexos).toContain('manual.pdf')

    // Listar anexos
    const lista = await listarAnexos({ tipo: 'note', id: nota.id })
    expect(lista).toHaveLength(1)
    expect(lista[0].nome).toBe('manual.pdf')

    // Remover o anexo
    const excluido = await excluirAnexo(anexo.id)
    expect(excluido?.id).toBe(anexo.id)
    expect(await db.attachments.count()).toBe(0)

    // Adiciona novamente para testar a exclusão da nota
    await adicionarAnexo({
      dono: { tipo: 'note', id: nota.id },
      tipo: 'documento',
      nome: 'manual.pdf',
      blob: blobPdf,
      extensao: '.pdf',
      tamanho: pdfBytes.length,
    })
    expect(await db.attachments.count()).toBe(1)

    // Excluir a nota apaga o anexo junto (sem lixo no banco)
    await excluirNota(nota.id)
    expect(await db.notes.count()).toBe(0)
    expect(await db.attachments.count()).toBe(0)
  })

  it('backup exporta e importa um documento (conteúdo idêntico byte a byte)', async () => {
    const nota = await criarNota({ titulo: 'Nota Backup', conteudo: 'Teste' })
    const docBytes = new Uint8Array([1, 2, 3, 4, 5, 255, 254, 253])
    const docBlob = new Blob([docBytes], { type: 'application/vnd.ms-excel' })

    await adicionarAnexo({
      dono: { tipo: 'note', id: nota.id },
      tipo: 'documento',
      nome: 'planilha.xlsx',
      blob: docBlob,
      extensao: '.xlsx',
      tamanho: docBytes.length,
    })

    const backup = await exportarDados()
    expect(backup.tabelas.attachments).toHaveLength(1)
    const anexoBackup = backup.tabelas.attachments[0]
    expect(anexoBackup.tipo).toBe('documento')
    expect(anexoBackup.nome).toBe('planilha.xlsx')
    expect(anexoBackup.conteudo).toBeDefined()

    // Limpa o banco e importa de volta
    await db.delete()
    await db.open()
    expect(await db.attachments.count()).toBe(0)

    await importarDados(backup)
    expect(await db.attachments.count()).toBe(1)

    const anexoImportado = await db.attachments.get(anexoBackup.id)
    expect(anexoImportado).toBeDefined()
    expect(anexoImportado?.nome).toBe('planilha.xlsx')
    expect(anexoImportado?.tipo).toBe('documento')
    expect(anexoImportado?.extensao).toBe('.xlsx')

    const bytesImportados = new Uint8Array(await anexoImportado!.blob!.arrayBuffer())
    expect(Array.from(bytesImportados)).toEqual(Array.from(docBytes))
  })

  it('backup antigo sem documentos importa normalmente', async () => {
    const backupAntigoJson = JSON.stringify({
      app: 'MemorIA',
      formato: 18,
      versaoBanco: db.verno,
      exportadoEm: '2026-10-30T10:00:00.000Z',
      tabelas: {
        categories: [],
        tasks: [],
        subtasks: [],
        procedures: [],
        notes: [
          {
            id: 'n1',
            titulo: 'Nota Antiga',
            conteudo: 'Sem anexos de documento',
            criadoEm: '2026-10-30T10:00:00.000Z',
            atualizadoEm: '2026-10-30T10:00:00.000Z',
          },
        ],
        attachments: [
          {
            id: 'a1',
            dono: { tipo: 'note', id: 'n1' },
            tipo: 'link',
            nome: 'Link antigo',
            url: 'https://exemplo.com',
            criadoEm: '2026-10-30T10:00:00.000Z',
            atualizadoEm: '2026-10-30T10:00:00.000Z',
          },
        ],
        groupSeries: [],
        groupCards: [],
        groupItems: [],
        sessions: [],
        lembretes: [],
        adiamentos: [],
      },
    })

    const lido = lerBackup(backupAntigoJson, db.verno)
    expect(lido.isValido).toBe(true)
    if (lido.isValido) {
      await importarDados(lido.backup)
      expect(await db.notes.count()).toBe(1)
      expect(await db.attachments.count()).toBe(1)
      const anexo = await db.attachments.get('a1')
      expect(anexo?.tipo).toBe('link')
    }
  })
})
