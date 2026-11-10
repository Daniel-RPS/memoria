import { describe, expect, it } from 'vitest'
import {
  anexoDoArquivo,
  anexoParaArquivo,
  base64ParaBlob,
  blobParaBase64,
  FORMATO_ATUAL,
  isBackupAtrasado,
  lerBackup,
  MARCA_DO_APP,
  nomeDoArquivo,
  quantidadesDoBackup,
  resumirQuantidades,
  type Backup,
} from '@/lib/backup'

const VERSAO_BANCO = 5

function backupVazio(): Backup {
  return {
    app: MARCA_DO_APP,
    formato: FORMATO_ATUAL,
    versaoBanco: VERSAO_BANCO,
    exportadoEm: '2026-10-30T12:00:00.000Z',
    tabelas: {
      categories: [],
      tasks: [],
      subtasks: [],
      procedures: [],
      notes: [],
      attachments: [],
      groupSeries: [],
      groupCards: [],
      groupItems: [],
      sessions: [],
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

  it('aceita backup do formato 1, sem grupos', () => {
    const { groupSeries, groupCards, groupItems, ...semGrupos } = backupVazio().tabelas
    const antigo = { ...backupVazio(), formato: 1, versaoBanco: 2, tabelas: semGrupos }
    const resultado = lerBackup(JSON.stringify(antigo), VERSAO_BANCO)
    expect(resultado).toMatchObject({
      isValido: true,
      backup: { tabelas: { groupSeries, groupCards, groupItems } },
    })
  })

  it('converte o backup do formato 2: cards eram instâncias e itens eram tarefas', () => {
    const { groupCards, groupItems, ...resto } = backupVazio().tabelas
    const card = { id: 'c', seriesId: 's', data: '2026-10-30', ordem: 1, arquivado: false }
    const antigo = {
      ...backupVazio(),
      formato: 2,
      versaoBanco: 3,
      tabelas: {
        ...resto,
        groupSeries: [{ id: 's', titulo: 'Casa', criadoEm: '', atualizadoEm: '' }],
        groupInstances: [{ ...card, criadoEm: '', atualizadoEm: '' }],
        tasks: [tarefa, { ...tarefa, id: 'i', titulo: 'Varrer', groupInstanceId: 'c' }],
      },
    }
    expect(groupCards.length + groupItems.length).toBe(0)
    const resultado = lerBackup(JSON.stringify(antigo), VERSAO_BANCO)
    expect(resultado.isValido).toBe(true)
    if (!resultado.isValido) return
    const { tabelas } = resultado.backup
    expect(tabelas.tasks.map((item) => item.id)).toEqual(['t1'])
    expect(tabelas.groupCards).toMatchObject([card])
    expect(tabelas.groupItems).toMatchObject([
      { id: 'i', cardId: 'c', titulo: 'Varrer', status: 'pendente', dataOriginal: '2026-10-28' },
    ])
  })

  it('converte o backup do formato 3: procedimentos com passos viram etapas', () => {
    const { procedures, ...resto } = backupVazio().tabelas
    const base = { criadoEm: '', atualizadoEm: '' }
    const antigo = {
      ...backupVazio(),
      formato: 3,
      versaoBanco: VERSAO_BANCO,
      tabelas: {
        ...resto,
        tasks: [{ ...tarefa, procedureId: 'p' }],
        procedures: [
          {
            id: 'p',
            titulo: 'Backup',
            categoryId: 'casa',
            descricao: '',
            camposVariaveis: [],
            versao: 2,
            secoes: [
              {
                id: 's',
                titulo: 'S',
                passos: [
                  { id: 'p1', texto: 'Conectar', anexos: [], subpassos: [] },
                  { id: 'p2', texto: 'Copiar', codigo: 'cp', anexos: [], subpassos: [] },
                ],
              },
            ],
            ...base,
          },
        ],
        procedureVersions: [{ id: 'v', procedureId: 'p', versao: 1, alteradoEm: '' }],
        executions: [{ id: 'x', procedureId: 'p' }],
        notes: [
          { id: 'n1', titulo: '', conteudo: 'x', dono: { tipo: 'procedure', id: 'p' }, ...base },
          { id: 'n2', titulo: 'Avulsa', conteudo: 'y', ...base },
        ],
        attachments: [
          { id: 'a1', dono: { tipo: 'step', id: 'p1' }, tipo: 'link', nome: 'V', ...base },
          { id: 'a2', dono: { tipo: 'task', id: 't1' }, tipo: 'link', nome: 'T', ...base },
        ],
      },
    }
    expect(procedures).toEqual([])
    const resultado = lerBackup(JSON.stringify(antigo), VERSAO_BANCO)
    expect(resultado.isValido).toBe(true)
    if (!resultado.isValido) return
    const { tabelas } = resultado.backup
    expect(tabelas.procedures).toEqual([
      {
        id: 'p',
        titulo: 'Backup',
        categoryId: 'casa',
        etapas: [
          { id: 'p1', texto: 'Conectar', ordem: 0 },
          { id: 'p2', texto: 'Copiar', ordem: 1 },
        ],
        // Formato 15: sem `ordem` no arquivo, preenchida pelo título.
        ordem: 1,
        ...base,
      },
    ])
    expect(tabelas).not.toHaveProperty('procedureVersions')
    expect(tabelas).not.toHaveProperty('executions')
    expect(tabelas.tasks[0]).not.toHaveProperty('procedureId')
    expect(tabelas.notes.map((nota) => nota.id)).toEqual(['n2'])
    expect(tabelas.attachments.map((anexo) => anexo.id)).toEqual(['a2'])
  })

  it('backup do formato 4, sem ordem de categorias, recebe a ordem ao ler', () => {
    const antigo = backupVazio()
    const base = { criadoEm: '1', atualizadoEm: '1' }
    const arquivo = {
      ...antigo,
      formato: 4,
      tabelas: {
        ...antigo.tabelas,
        categories: [
          { ...base, id: 'b', nome: 'Trabalho', cor: '#000000' },
          { ...base, id: 'a', nome: 'Casa', cor: '#000000' },
        ],
        subcategories: [{ ...base, id: 's', categoryId: 'a', nome: 'Jardim' }],
      },
    }
    const resultado = lerBackup(JSON.stringify(arquivo), VERSAO_BANCO)
    expect(resultado.isValido).toBe(true)
    if (!resultado.isValido) return
    const { tabelas } = resultado.backup
    expect(tabelas.categories.map(({ id, ordem }) => ({ id, ordem }))).toEqual([
      { id: 'b', ordem: 2 },
      { id: 'a', ordem: 1 },
    ])
    expect(tabelas).not.toHaveProperty('subcategories')
  })

  it('backup do formato 5, sem tipo de categoria, é classificado pela regra da migração', () => {
    const antigo = backupVazio()
    const base = { criadoEm: '1', atualizadoEm: '1' }
    const arquivo = {
      ...antigo,
      formato: 5,
      tabelas: {
        ...antigo.tabelas,
        categories: [
          { ...base, id: 'casa', nome: 'Casa', cor: '#000000', ordem: 1 },
          { ...base, id: 'git', nome: 'Github', cor: '#000000', ordem: 2 },
        ],
        tasks: [{ ...tarefa, categoryId: 'git' }],
        procedures: [{ ...base, id: 'p', titulo: 'Publicar', categoryId: 'git', etapas: [] }],
      },
    }
    const resultado = lerBackup(JSON.stringify(arquivo), VERSAO_BANCO)
    expect(resultado.isValido).toBe(true)
    if (!resultado.isValido) return
    const { categories, procedures, tasks } = resultado.backup.tabelas
    expect(categories.map(({ nome, tipo }) => `${tipo}:${nome}`)).toEqual([
      'grupo:Casa',
      'grupo:Github',
      'procedimento:Github',
    ])
    expect(tasks[0].categoryId).toBe('git')
    expect(procedures[0].categoryId).toBe(categories[2].id)
  })

  it('backup do formato 6: anotação de tarefa vira nota ligada e itens ganham cadeia', () => {
    const antigo = backupVazio()
    const base = { criadoEm: '1', atualizadoEm: '1' }
    const item = { ...base, titulo: 'Deploy', ordem: 1, dataOriginal: '2026-10-30' }
    const arquivo = {
      ...antigo,
      formato: 6,
      tabelas: {
        ...antigo.tabelas,
        tasks: [tarefa],
        notes: [
          { ...base, id: 'n1', titulo: '', conteudo: 'a', dono: { tipo: 'task', id: 't1' } },
          { ...base, id: 'n2', titulo: 'Solta', conteudo: 'b' },
        ],
        groupItems: [
          { ...item, id: 'i1', cardId: 'c1', status: 'transferido' },
          { ...item, id: 'i2', cardId: 'c2', status: 'pendente', origemItemId: 'i1' },
        ],
      },
    }
    const resultado = lerBackup(JSON.stringify(arquivo), VERSAO_BANCO)
    expect(resultado.isValido).toBe(true)
    if (!resultado.isValido) return
    const { notes, groupItems } = resultado.backup.tabelas
    expect(notes).toEqual([
      { ...base, id: 'n1', titulo: '', conteudo: 'a', vinculo: { tipo: 'tarefa', id: 't1' } },
      { ...base, id: 'n2', titulo: 'Solta', conteudo: 'b' },
    ])
    expect(groupItems.map((registro) => registro.cadeiaId)).toEqual(['i1', 'i1'])
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
      tipo: 'grupo',
      ordem: 1,
      criadoEm: '',
      atualizadoEm: '',
    })
    expect(resumirQuantidades(quantidadesDoBackup(backup))).toEqual(['2 tarefas', '1 categoria'])
  })

  it('nomeia o arquivo com a data', () => {
    expect(nomeDoArquivo('2026-10-30')).toBe('memoria-backup-2026-10-30.json')
  })
})

describe('isBackupAtrasado', () => {
  const dataHoje = '2026-11-10'

  it('não lembra quando ainda não há dados', () => {
    expect(isBackupAtrasado(null, dataHoje, false)).toBe(false)
  })

  it('lembra quando há dados e nunca houve backup', () => {
    expect(isBackupAtrasado(null, dataHoje, true)).toBe(true)
  })

  it('só lembra depois de mais de 7 dias, pelo dia local', () => {
    expect(isBackupAtrasado('2026-11-03T23:30:00-03:00', dataHoje, true)).toBe(false)
    // 00:30 UTC do dia 3 ainda é dia 2 em São Paulo.
    expect(isBackupAtrasado('2026-11-03T00:30:00Z', dataHoje, true)).toBe(true)
  })

  it('trata momento ilegível como sem backup', () => {
    expect(isBackupAtrasado('ontem', dataHoje, true)).toBe(true)
  })
})
