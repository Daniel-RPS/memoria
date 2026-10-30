import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/db/database'
import { criarCategoria } from '@/db/repositories/category-repository'
import { criarSubtarefa } from '@/db/repositories/subtask-repository'
import { criarTarefa } from '@/db/repositories/task-repository'
import { hoje, somarDias } from '@/lib/datas'
import { renderizarApp } from '@/test/renderizar-app'

function renderizarDia(data: string) {
  return renderizarApp(`/dia/${data}`)
}

describe('Visão do dia', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    window.localStorage.clear()
  })

  it('cria tarefa pela linha "Nova tarefa" e mantém o campo pronto para a próxima', async () => {
    const usuario = userEvent.setup()
    renderizarDia(hoje())

    const campo = screen.getByRole('textbox', { name: 'Nova tarefa' })
    await usuario.type(campo, 'Comprar café{Enter}')

    const pendentes = await screen.findByRole('list', { name: 'Pendentes' })
    expect(within(pendentes).getByText('Comprar café')).toBeInTheDocument()
    await waitFor(() => expect(campo).toHaveValue(''))
  })

  it('não perde tarefas digitadas em sequência rápida', async () => {
    const usuario = userEvent.setup()
    renderizarDia(hoje())

    const campo = screen.getByRole('textbox', { name: 'Nova tarefa' })
    await usuario.type(campo, 'Primeira{Enter}Segunda{Enter}Terceira{Enter}')

    const pendentes = await screen.findByRole('list', { name: 'Pendentes' })
    await waitFor(() =>
      expect(
        within(pendentes)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(['Primeira', 'Segunda', 'Terceira']),
    )
  })

  it('concluir move a tarefa para o grupo "Concluídas", que começa recolhido', async () => {
    const usuario = userEvent.setup()
    await criarTarefa({ titulo: 'Regar plantas', data: hoje() })
    renderizarDia(hoje())

    await usuario.click(await screen.findByRole('checkbox', { name: 'Concluir Regar plantas' }))

    const grupo = await screen.findByRole('button', { name: 'Concluídas (1)' })
    expect(grupo).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list', { name: 'Pendentes' })).not.toBeInTheDocument()

    await usuario.click(grupo)
    const concluidas = screen.getByRole('list', { name: 'Concluídas' })
    expect(
      within(concluidas).getByRole('checkbox', { name: 'Desmarcar Regar plantas' }),
    ).toBeChecked()
  })

  it('mostra há quantos dias a tarefa está pendente', async () => {
    await criarTarefa({ titulo: 'Ligar para o banco', data: somarDias(hoje(), -3) })
    renderizarDia(somarDias(hoje(), -3))

    expect(await screen.findByText('pendente há 3 dias')).toBeInTheDocument()
  })

  it('volta para hoje quando a data da URL é inválida', async () => {
    const router = renderizarDia('2026-02-31')
    await waitFor(() => expect(router.state.location.pathname).toBe(`/dia/${hoje()}`))
  })

  it('adiciona subtarefas pelo menu e mostra o progresso', async () => {
    const usuario = userEvent.setup()
    await criarTarefa({ titulo: 'Mudar de casa', data: hoje() })
    renderizarDia(hoje())

    await usuario.click(
      await screen.findByRole('button', { name: 'Mais ações para Mudar de casa' }),
    )
    await usuario.click(await screen.findByRole('menuitem', { name: 'Adicionar subtarefa' }))

    const campo = await screen.findByRole('textbox', { name: 'Nova subtarefa' })
    await waitFor(() => expect(campo).toHaveFocus())
    await usuario.type(campo, 'Caixas{Enter}Fita{Enter}')

    const progresso = await screen.findByRole('button', {
      name: 'Subtarefas de Mudar de casa: 0 de 2 concluídas',
    })
    expect(progresso).toHaveTextContent('0 de 2')
    expect(progresso).toHaveAttribute('aria-expanded', 'true')
  })

  it('marcar subtarefas atualiza o progresso e não conclui a tarefa', async () => {
    const usuario = userEvent.setup()
    const tarefa = await criarTarefa({ titulo: 'Viajar', data: hoje() })
    await criarSubtarefa({ taskId: tarefa.id, titulo: 'Passagem' })
    await criarSubtarefa({ taskId: tarefa.id, titulo: 'Hotel' })
    renderizarDia(hoje())

    await usuario.click(
      await screen.findByRole('button', { name: 'Subtarefas de Viajar: 0 de 2 concluídas' }),
    )
    const subtarefas = screen.getByRole('list', { name: 'Subtarefas de Viajar' })
    await usuario.click(within(subtarefas).getByRole('checkbox', { name: 'Concluir Passagem' }))
    await usuario.click(within(subtarefas).getByRole('checkbox', { name: 'Concluir Hotel' }))

    expect(
      await screen.findByRole('button', { name: 'Subtarefas de Viajar: 2 de 2 concluídas' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Concluir Viajar' })).not.toBeChecked()
  })

  it('filtra por categoria, guarda o filtro na URL e cria a tarefa já na categoria', async () => {
    const usuario = userEvent.setup()
    const casa = await criarCategoria({ nome: 'Casa' })
    const trabalho = await criarCategoria({ nome: 'Trabalho' })
    await criarTarefa({ titulo: 'Podar', data: hoje(), categoryId: casa.id })
    await criarTarefa({ titulo: 'Relatório', data: hoje(), categoryId: trabalho.id })
    const router = renderizarDia(hoje())

    const filtros = await screen.findByRole('group', { name: 'Filtrar por categoria' })
    await usuario.click(within(filtros).getByRole('button', { name: 'Casa' }))

    const pendentes = await screen.findByRole('list', { name: 'Pendentes' })
    await waitFor(() => expect(within(pendentes).queryByText('Relatório')).not.toBeInTheDocument())
    expect(within(pendentes).getByText('Podar')).toBeInTheDocument()
    expect(router.state.location.search).toBe(`?categoria=${casa.id}`)

    await usuario.type(screen.getByRole('textbox', { name: 'Nova tarefa' }), 'Regar{Enter}')
    await waitFor(async () => {
      const regar = (await db.tasks.toArray()).find((tarefa) => tarefa.titulo === 'Regar')
      expect(regar?.categoryId).toBe(casa.id)
    })

    await usuario.click(screen.getByRole('link', { name: 'Próximo dia' }))
    expect(router.state.location.search).toBe(`?categoria=${casa.id}`)
  })

  it('define a categoria pelo menu e mostra o rótulo na linha', async () => {
    const usuario = userEvent.setup()
    const casa = await criarCategoria({ nome: 'Casa' })
    await criarTarefa({ titulo: 'Lavar louça', data: hoje() })
    renderizarDia(hoje())

    await usuario.click(await screen.findByRole('button', { name: 'Mais ações para Lavar louça' }))
    // Pelo teclado: no jsdom o ponteiro simulado fecha o submenu ao sair do item.
    ;(await screen.findByRole('menuitem', { name: 'Categoria' })).focus()
    await usuario.keyboard('{ArrowRight}')
    ;(await screen.findByRole('menuitemradio', { name: 'Casa' })).focus()
    await usuario.keyboard('{Enter}')

    const pendentes = await screen.findByRole('list', { name: 'Pendentes' })
    expect(await within(pendentes).findByText('Casa')).toBeInTheDocument()
    expect((await db.tasks.toArray())[0].categoryId).toBe(casa.id)
  })

  it('fecha o painel aberto pelo menu se nada for digitado', async () => {
    const usuario = userEvent.setup()
    await criarTarefa({ titulo: 'Ler livro', data: hoje() })
    renderizarDia(hoje())

    await usuario.click(await screen.findByRole('button', { name: 'Mais ações para Ler livro' }))
    await usuario.click(await screen.findByRole('menuitem', { name: 'Adicionar subtarefa' }))
    const campo = await screen.findByRole('textbox', { name: 'Nova subtarefa' })
    await waitFor(() => expect(campo).toHaveFocus())

    await usuario.click(screen.getByRole('textbox', { name: 'Nova tarefa' }))
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Nova subtarefa' })).not.toBeInTheDocument(),
    )
  })
})
