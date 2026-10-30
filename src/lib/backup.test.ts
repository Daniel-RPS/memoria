import { describe, expect, it } from 'vitest'
import {
  anexoDoArquivo,
  anexoParaArquivo,
  base64ParaBlob,
  blobParaBase64,
  FORMATO_ATUAL,
  lerBackup,
  MARCA_DO_APP,
  nomeDoArquivo,
  quantidadesDoBackup,
  resumirQuantidades,
  type Backup,
} from '@/lib/backup'

const VERSAO_BANCO = 2

function backupVazio(): Backup {
  return {
    app: MARCA_DO_APP,
    formato: FORMATO_ATUAL,
    versaoBanco: VERSAO_BANCO,
    exportadoEm: '2026-10-30T12:00:00.000Z',
    tabelas: {
      categories: [],
      subcategories: [],
      tasks: [],
      subtasks: [],
      procedures: [],
      procedureVersions: [],
      executions: [],
      notes: [],
      attachments: [],
    },
  }
}

const tarefa = {
  id: 't1',
  titulo: 'Pagar conta',
  data: '2026-10-30',
  dataOriginal: '2026-10-28',
  ordem: 1.5,
  status: 'pendente' as const,
  criadoEm: '2026-10-28T10:00:00.000Z',
  atualizadoEm: '2026-10-30T10:00:00.000Z',
}

describe('lerBackup', () => {
  it('aceita um backup válido e mantém as datas como texto', () => {
    const backup = backupVazio()
    backup.tabelas.tasks.push(tarefa)
    const resultado = lerBackup(JSON.stringify(backup), VERSAO_BANCO)
    expect(resultado).toEqual({ isValido: true, backup })
  })

  it('recusa o que não é JSON', () => {
    const resultado = lerBackup('isto não é json', VERSAO_BANCO)
    expect(resultado).toMatchObject({ isValido: false })
    expect(!resultado.isValido && resultado.mensagem).toMatch(/não é um JSON válido/)
  })

  it('recusa JSON que não é backup do MemorIA', () => {
    expect(lerBackup('{"nome": "outra coisa"}', VERSAO_BANCO)).toEqual({
      isValido: false,
      mensagem: 'Este arquivo não é um backup do MemorIA.',
    })
  })

  it('recusa registro alterado e diz onde está o problema', () => {
    const backup = backupVazio()
    backup.tabelas.tasks.push({ ...tarefa, data: '30/10/2026' })
    const resultado = lerBackup(JSON.stringify(backup), VERSAO_BANCO)
    expect(!resultado.isValido && resultado.mensagem).toMatch(/tabelas › tasks › 0 › data/)
  })

  it('recusa backup de uma versão mais nova do app', () => {
    const backup = { ...backupVazio(), versaoBanco: VERSAO_BANCO + 1 }
    const resultado = lerBackup(JSON.stringify(backup), VERSAO_BANCO)
    expect(!resultado.isValido && resultado.mensagem).toMatch(/versão mais nova/)
  })

  it('descarta campos desconhecidos', () => {
    const backup = backupVazio()
    backup.tabelas.tasks.push({ ...tarefa, senha: 'nunca' } as typeof tarefa)
    const resultado = lerBackup(JSON.stringify(backup), VERSAO_BANCO)
    expect(resultado.isValido && resultado.backup.tabelas.tasks[0]).not.toHaveProperty('senha')
  })
})

describe('anexos em base64', () => {
  it('converte o conteúdo binário ida e volta sem perder bytes', async () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 128])
    const base64 = await blobParaBase64(new Blob([bytes], { type: 'image/png' }))
    const volta = base64ParaBlob(base64, 'image/png')
    expect(volta.type).toBe('image/png')
    expect(new Uint8Array(await volta.arrayBuffer())).toEqual(bytes)
  })

  it('anexo com blob vira conteúdo no arquivo e volta como blob', async () => {
    const anexo = {
      id: 'a1',
      dono: { tipo: 'task' as const, id: 't1' },
      tipo: 'audio' as const,
      nome: 'lembrete.webm',
      blob: new Blob(['som'], { type: 'audio/webm' }),
      criadoEm: '',
      atualizadoEm: '',
    }
    const noArquivo = await anexoParaArquivo(anexo)
    expect(noArquivo).not.toHaveProperty('blob')
    expect(noArquivo.conteudo?.tipo).toBe('audio/webm')

    const restaurado = anexoDoArquivo(JSON.parse(JSON.stringify(noArquivo)))
    expect(await restaurado.blob?.text()).toBe('som')
  })
})

describe('textos do backup', () => {
  it('resume as quantidades no singular e no plural', () => {
    const backup = backupVazio()
    backup.tabelas.tasks.push(tarefa, { ...tarefa, id: 't2' })
    backup.tabelas.categories.push({
      id: 'c',
      nome: 'Casa',
      cor: '#000000',
      criadoEm: '',
      atualizadoEm: '',
    })
    expect(resumirQuantidades(quantidadesDoBackup(backup))).toEqual(['2 tarefas', '1 categoria'])
  })

  it('nomeia o arquivo com a data', () => {
    expect(nomeDoArquivo('2026-10-30')).toBe('memoria-backup-2026-10-30.json')
  })
})
