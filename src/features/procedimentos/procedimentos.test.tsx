import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/db/database'
import { criarProcedimento, type DadosProcedimento } from '@/db/repositories/procedure-repository'
import { agendarProcedimento } from '@/db/repositories/task-repository'
import { hoje } from '@/lib/datas'
import { renderizarApp } from '@/test/renderizar-app'

const certificado: DadosProcedimento = {
  titulo: 'Renovar certificado',
  descricao: 'TLS do servidor de e-mail',
  camposVariaveis: [
    { id: 'servidor', nome: 'Servidor', tipo: 'texto' },
    {
      id: 'senha',
      nome: 'Senha root',
      tipo: 'credencial',
      localCredencial: 'Cofre TI, item Mail',
    },
  ],
  secoes: [
    {
      id: 's1',
      titulo: 'Preparar',
      passos: [
        {
          id: 'p1',
          texto: 'Entrar em {{servidor}} com {{senha root}}',
          anexos: [],
          subpassos: [],
        },
        { id: 'p2', texto: 'Gerar CSR', codigo: 'openssl req -new', anexos: [], subpassos: [] },
      ],
    },
  ],
}

describe('Procedimentos', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('cria um procedimento pelo editor', async () => {
    const usuario = userEvent.setup()
    const router = renderizarApp('/procedimentos/novo')

    await usuario.type(await screen.findByLabelText('Título'), 'Backup mensal')
    await usuario.click(screen.getByRole('button', { name: 'Adicionar campo' }))
    await usuario.type(screen.getByLabelText('Nome do campo'), 'Disco')
    await usuario.type(screen.getByLabelText('Passo 1'), 'Conectar o {{{{disco}}')
    await usuario.click(screen.getByRole('button', { name: 'Criar procedimento' }))

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/procedimentos\/[^/]+$/))
    expect(await screen.findByRole('heading', { name: 'Backup mensal' })).toBeInTheDocument()
    const [salvo] = await db.procedures.toArray()
    expect(salvo).toMatchObject({ titulo: 'Backup mensal', versao: 1 })
    expect(salvo.secoes[0].passos[0]).toMatchObject({ texto: 'Conectar o {{disco}}' })
    expect(salvo.secoes[0].passos[0].id).toBeTruthy()
  })

  it('não salva sem título e sem texto no passo, e explica o que falta', async () => {
    const usuario = userEvent.setup()
    renderizarApp('/procedimentos/novo')

    await usuario.click(await screen.findByRole('button', { name: 'Criar procedimento' }))

    expect(await screen.findByText('Dê um título ao procedimento.')).toBeInTheDocument()
    expect(screen.getByText('Escreva o que fazer neste passo.')).toBeInTheDocument()
    expect(await db.procedures.count()).toBe(0)
  })

  it('editar e salvar guarda a versão anterior no histórico', async () => {
    const usuario = userEvent.setup()
    const procedimento = await criarProcedimento(certificado)
    const router = renderizarApp(`/procedimentos/${procedimento.id}/editar`)

    const titulo = await screen.findByLabelText('Título')
    await usuario.clear(titulo)
    await usuario.type(titulo, 'Renovar TLS')
    await usuario.click(screen.getByRole('button', { name: 'Salvar nova versão' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/procedimentos/${procedimento.id}`),
    )
    // Espera a página do procedimento desenhar (o endereço muda antes da tela).
    expect(await screen.findByRole('button', { name: 'Agendar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Renovar TLS' })).toBeInTheDocument()
    expect(screen.getByText('Versão 2')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Versão 1/ })).toBeInTheDocument()
    const salvo = await db.procedures.get(procedimento.id)
    expect(salvo?.secoes[0].passos.map((passo) => passo.id)).toEqual(['p1', 'p2'])
  })

  it('executa: troca os campos nos passos, marca, pula e registra sem mudar o modelo', async () => {
    const usuario = userEvent.setup()
    const procedimento = await criarProcedimento(certificado)
    const modelo = structuredClone(await db.procedures.get(procedimento.id))
    renderizarApp(`/procedimentos/${procedimento.id}/executar`)

    // Credencial: mostra onde está a senha e não oferece campo para digitá-la.
    expect(await screen.findAllByText('senha em: Cofre TI, item Mail')).not.toHaveLength(0)
    expect(screen.queryByLabelText('Senha root')).not.toBeInTheDocument()

    await usuario.type(screen.getByLabelText('Servidor'), 'mail01')
    const preparar = screen.getByRole('region', { name: 'Preparar' })
    expect(within(preparar).getByText('mail01')).toBeInTheDocument()

    await usuario.click(screen.getByRole('checkbox', { name: 'Passo 1 feito' }))
    await usuario.click(screen.getByRole('button', { name: 'Pular passo 2' }))
    await usuario.type(screen.getByLabelText('Observações desta execução'), 'Tudo certo')
    expect(await screen.findByText(/feitos, 1 pulados/)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Concluir execução' }))

    await waitFor(async () => {
      const [execucao] = await db.executions.toArray()
      expect(execucao.concluidaEm).toBeTruthy()
      expect(execucao).toMatchObject({
        valoresCampos: { servidor: 'mail01' },
        passosMarcados: ['p1'],
        passosPulados: ['p2'],
        observacoes: 'Tudo certo',
      })
    })
    expect(await db.procedures.get(procedimento.id)).toEqual(modelo)
  })

  it('pede confirmação ao concluir com passos sem marcar', async () => {
    const usuario = userEvent.setup()
    const procedimento = await criarProcedimento(certificado)
    renderizarApp(`/procedimentos/${procedimento.id}/executar`)

    await usuario.click(await screen.findByRole('button', { name: 'Concluir execução' }))
    expect(await screen.findByRole('alertdialog', { name: 'Faltam 2 passos' })).toBeInTheDocument()
  })

  it('agenda no calendário e, executando pela tarefa, conclui a tarefa', async () => {
    const usuario = userEvent.setup()
    const procedimento = await criarProcedimento(certificado)
    const tarefa = await agendarProcedimento(procedimento, hoje())
    const router = renderizarApp(`/dia/${hoje()}`)

    await usuario.click(await screen.findByRole('link', { name: 'Executar procedimento' }))
    expect(router.state.location.search).toBe(`?tarefa=${tarefa.id}`)

    await usuario.click(await screen.findByRole('checkbox', { name: 'Passo 1 feito' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Passo 2 feito' }))
    // Sem esperar, o app ainda vê 1 passo pendente e pede confirmação (comportamento correto).
    expect(await screen.findByText(/^2 de 2$/)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Concluir execução' }))

    await waitFor(async () => expect((await db.tasks.get(tarefa.id))?.status).toBe('concluida'))
    const [execucao] = await db.executions.toArray()
    expect(execucao.taskId).toBe(tarefa.id)
  })

  it('"Agendar" na página do procedimento cria a tarefa ligada', async () => {
    const usuario = userEvent.setup()
    const procedimento = await criarProcedimento(certificado)
    renderizarApp(`/procedimentos/${procedimento.id}`)

    await usuario.click(await screen.findByRole('button', { name: 'Agendar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Agendar execução' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Hoje' }))

    await waitFor(async () => {
      const [tarefa] = await db.tasks.toArray()
      expect(tarefa).toMatchObject({
        titulo: 'Renovar certificado',
        data: hoje(),
        procedureId: procedimento.id,
      })
    })
  })

  it('busca na lista ignorando acentos', async () => {
    const usuario = userEvent.setup()
    await criarProcedimento(certificado)
    await criarProcedimento({ ...certificado, titulo: 'Declaração de imposto', secoes: [] })
    renderizarApp('/procedimentos')

    const lista = await screen.findByRole('region', { name: 'Lista de procedimentos' })
    expect(await within(lista).findByText('Declaração de imposto')).toBeInTheDocument()

    await usuario.type(
      screen.getByRole('searchbox', { name: 'Buscar procedimentos' }),
      'declaracao',
    )
    await waitFor(() =>
      expect(within(lista).queryByText('Renovar certificado')).not.toBeInTheDocument(),
    )
    expect(within(lista).getByText('Declaração de imposto')).toBeInTheDocument()
  })
})
