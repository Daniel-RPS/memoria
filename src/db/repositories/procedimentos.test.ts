import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import {
  atualizarExecucao,
  concluirExecucao,
  descartarExecucao,
  iniciarOuRetomarExecucao,
  listarExecucoes,
  mudarEstadoDoPasso,
} from '@/db/repositories/execution-repository'
import {
  criarProcedimento,
  excluirProcedimento,
  listarVersoes,
  obterVersao,
  restaurarVersao,
  salvarProcedimento,
  type DadosProcedimento,
} from '@/db/repositories/procedure-repository'
import { criarTarefa } from '@/db/repositories/task-repository'

const HOJE = '2026-10-30'

const dados: DadosProcedimento = {
  titulo: 'Renovar certificado',
  descricao: 'Certificado TLS do servidor de e-mail',
  camposVariaveis: [{ id: 'c1', nome: 'Servidor', tipo: 'texto' }],
  secoes: [
    {
      id: 's1',
      titulo: 'Preparar',
      passos: [
        { id: 'p1', texto: 'Acessar {{servidor}}', anexos: [], subpassos: [] },
        { id: 'p2', texto: 'Gerar CSR', codigo: 'openssl req -new', anexos: [], subpassos: [] },
      ],
    },
  ],
}

describe('versões do procedimento', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('cada edição salva guarda a versão anterior', async () => {
    const procedimento = await criarProcedimento(dados)
    expect(procedimento.versao).toBe(1)

    expect(await salvarProcedimento(procedimento.id, { ...dados, titulo: 'Renovar TLS' })).toBe(2)

    const versoes = await listarVersoes(procedimento.id)
    expect(versoes.map((versao) => versao.versao)).toEqual([1])
    expect(versoes[0].snapshot.titulo).toBe('Renovar certificado')
    expect((await db.procedures.get(procedimento.id))?.titulo).toBe('Renovar TLS')
  })

  it('restaurar uma versão antiga também guarda a atual', async () => {
    const procedimento = await criarProcedimento(dados)
    await salvarProcedimento(procedimento.id, { ...dados, titulo: 'Versão 2' })

    expect(await restaurarVersao(procedimento.id, 1)).toBe(3)

    expect((await db.procedures.get(procedimento.id))?.titulo).toBe('Renovar certificado')
    expect((await listarVersoes(procedimento.id)).map((versao) => versao.versao)).toEqual([2, 1])
    expect((await obterVersao(procedimento.id, 2))?.titulo).toBe('Versão 2')
  })

  it('excluir apaga versões e execuções, mas a tarefa agendada fica sem vínculo', async () => {
    const procedimento = await criarProcedimento(dados)
    await salvarProcedimento(procedimento.id, dados)
    await iniciarOuRetomarExecucao({ procedureId: procedimento.id, hoje: HOJE })
    const tarefa = await criarTarefa({ titulo: 'Agendada', data: HOJE })
    await db.tasks.update(tarefa.id, { procedureId: procedimento.id })

    await excluirProcedimento(procedimento.id)

    expect(await db.procedures.count()).toBe(0)
    expect(await db.procedureVersions.count()).toBe(0)
    expect(await db.executions.count()).toBe(0)
    expect((await db.tasks.get(tarefa.id))?.procedureId).toBeUndefined()
  })
})

describe('modo execução', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('IMPORTANTE: executar do início ao fim nunca altera o procedimento', async () => {
    const procedimento = await criarProcedimento(dados)
    const antes = structuredClone(await db.procedures.get(procedimento.id))

    const execucao = await iniciarOuRetomarExecucao({ procedureId: procedimento.id, hoje: HOJE })
    await atualizarExecucao(execucao.id, {
      valoresCampos: { c1: 'mail01' },
      passosMarcados: ['p1'],
      passosPulados: ['p2'],
      observacoes: 'CSR já existia',
    })
    await concluirExecucao(execucao.id)

    expect(await db.procedures.get(procedimento.id)).toEqual(antes)
    expect(await db.procedureVersions.count()).toBe(0)
    const [registrada] = await listarExecucoes(procedimento.id)
    expect(registrada).toMatchObject({
      versao: 1,
      valoresCampos: { c1: 'mail01' },
      passosMarcados: ['p1'],
      passosPulados: ['p2'],
      observacoes: 'CSR já existia',
    })
    expect(registrada.concluidaEm).toBeTruthy()
  })

  it('retoma a execução em andamento em vez de abrir outra', async () => {
    const procedimento = await criarProcedimento(dados)
    const primeira = await iniciarOuRetomarExecucao({ procedureId: procedimento.id, hoje: HOJE })
    await atualizarExecucao(primeira.id, { passosMarcados: ['p1'] })

    const retomada = await iniciarOuRetomarExecucao({ procedureId: procedimento.id, hoje: HOJE })
    expect(retomada.id).toBe(primeira.id)
    expect(retomada.passosMarcados).toEqual(['p1'])

    await concluirExecucao(primeira.id)
    const nova = await iniciarOuRetomarExecucao({ procedureId: procedimento.id, hoje: HOJE })
    expect(nova.id).not.toBe(primeira.id)
  })

  it('a execução segue a versão em que começou, mesmo se o procedimento for editado', async () => {
    const procedimento = await criarProcedimento(dados)
    const execucao = await iniciarOuRetomarExecucao({ procedureId: procedimento.id, hoje: HOJE })
    await salvarProcedimento(procedimento.id, { ...dados, secoes: [] })

    const retomada = await iniciarOuRetomarExecucao({ procedureId: procedimento.id, hoje: HOJE })
    expect(retomada.versao).toBe(1)
    expect((await obterVersao(procedimento.id, execucao.versao))?.secoes).toHaveLength(1)
  })

  it('concluir a execução de uma tarefa agendada conclui a tarefa', async () => {
    const procedimento = await criarProcedimento(dados)
    const tarefa = await criarTarefa({ titulo: 'Renovar', data: HOJE })
    const execucao = await iniciarOuRetomarExecucao({
      procedureId: procedimento.id,
      hoje: HOJE,
      taskId: tarefa.id,
    })

    await concluirExecucao(execucao.id)

    expect((await db.tasks.get(tarefa.id))?.status).toBe('concluida')
  })

  it('descartar apaga só execução em andamento', async () => {
    const procedimento = await criarProcedimento(dados)
    const andamento = await iniciarOuRetomarExecucao({ procedureId: procedimento.id, hoje: HOJE })
    await descartarExecucao(andamento.id)
    expect(await db.executions.count()).toBe(0)

    const concluida = await iniciarOuRetomarExecucao({ procedureId: procedimento.id, hoje: HOJE })
    await concluirExecucao(concluida.id)
    await descartarExecucao(concluida.id)
    expect(await db.executions.count()).toBe(1)
  })
})

describe('marcar passos', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('cliques rápidos em passos diferentes não apagam um ao outro', async () => {
    const procedimento = await criarProcedimento(dados)
    const execucao = await iniciarOuRetomarExecucao({ procedureId: procedimento.id, hoje: HOJE })

    await Promise.all([
      mudarEstadoDoPasso(execucao.id, 'p1', 'feito'),
      mudarEstadoDoPasso(execucao.id, 'p2', 'pulado'),
    ])

    const atual = await db.executions.get(execucao.id)
    expect(atual).toMatchObject({ passosMarcados: ['p1'], passosPulados: ['p2'] })
  })
})
