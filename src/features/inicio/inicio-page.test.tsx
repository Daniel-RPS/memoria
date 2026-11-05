import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/db/database'
import { definirAndamento } from '@/db/repositories/andamento-repository'
import { criarGrupo, criarItem } from '@/db/repositories/group-repository'
import { criarTarefa } from '@/db/repositories/task-repository'
import { hoje, somarDias } from '@/lib/datas'
import { renderizarApp } from '@/test/renderizar-app'

describe('Início', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    window.localStorage.clear()
  })

  it('o app abre no Início com o campo de captura focado', async () => {
    const router = renderizarApp('/')

    const campo = await screen.findByRole('textbox', { name: 'Título da tarefa' })
    expect(router.state.location.pathname).toBe('/inicio')
    await waitFor(() => expect(campo).toHaveFocus())
  })

  it('Enter cria a tarefa para hoje, ela aparece em "Hoje" e o aviso oferece desfazer', async () => {
    const usuario = userEvent.setup()
    renderizarApp('/inicio')

    const campo = await screen.findByRole('textbox', { name: 'Título da tarefa' })
    await usuario.type(campo, 'Pagar a luz{Enter}')

    const blocoHoje = screen.getByRole('region', { name: 'Hoje' })
    expect(await within(blocoHoje).findByText('1 pendente para hoje.')).toBeVisible()
    expect(within(blocoHoje).getByText('1 tarefa solta')).toBeVisible()
    await waitFor(() => expect(campo).toHaveValue(''))
    const [dia, mes] = hoje().split('-').reverse()
    expect(await screen.findByText(`Tarefa criada para ${dia}/${mes}`)).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Desfazer' }))
    await waitFor(async () => expect(await db.tasks.count()).toBe(0))
  })

  it('Grupo: nome, Enter, itens e Ctrl+Enter criam o grupo com os itens; desfazer tira tudo', async () => {
    const usuario = userEvent.setup()
    renderizarApp('/inicio')

    await screen.findByRole('textbox', { name: 'Título da tarefa' })
    await usuario.click(screen.getByRole('button', { name: 'Grupo' }))
    const nome = screen.getByRole('textbox', { name: 'Nome do grupo' })
    await waitFor(() => expect(nome).toHaveFocus())
    await usuario.keyboard(
      'Casa{Enter}Lavar roupa{Enter}{Enter}Regar plantas{Control>}{Enter}{/Control}',
    )

    const [dia, mes] = hoje().split('-').reverse()
    expect(
      await screen.findByText(`Grupo Casa criado com 2 itens · ${dia}/${mes}`),
    ).toBeInTheDocument()
    const itens = (await db.groupItems.toArray()).sort((a, b) => a.ordem - b.ordem)
    expect(itens.map((item) => item.titulo)).toEqual(['Lavar roupa', 'Regar plantas'])

    await usuario.click(screen.getByRole('button', { name: 'Desfazer' }))
    await waitFor(async () => expect(await db.groupSeries.count()).toBe(0))
    expect(await db.groupItems.count()).toBe(0)
  })

  it('título vazio mostra o erro e não cria nada', async () => {
    const usuario = userEvent.setup()
    renderizarApp('/inicio')

    await usuario.type(await screen.findByRole('textbox', { name: 'Título da tarefa' }), '{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('Escreva um nome.')
    expect(await db.tasks.count()).toBe(0)
  })

  it('Atrasadas: resumo e "Trazer todas para hoje" move a atrasada para hoje', async () => {
    const usuario = userEvent.setup()
    await criarTarefa({ titulo: 'Renovar CNH', data: somarDias(hoje(), -3) })
    renderizarApp('/inicio')

    const atrasadas = screen.getByRole('region', { name: 'Atrasadas' })
    expect(await within(atrasadas).findByText(/^1 item atrasado, de /)).toBeInTheDocument()
    expect(within(atrasadas).getByRole('link', { name: 'Ver atrasadas' })).toHaveAttribute(
      'href',
      `/dia/${somarDias(hoje(), -3)}`,
    )
    await usuario.click(within(atrasadas).getByRole('button', { name: 'Trazer todas para hoje' }))

    expect(await within(atrasadas).findByText('Tudo em dia')).toBeInTheDocument()
    expect((await db.tasks.toArray())[0]).toMatchObject({ data: hoje() })
  })

  it('Em andamento: só aparece quando há algo em andamento, não mostra nome de tarefa e some quando para', async () => {
    // Inicialmente sem nada em andamento
    renderizarApp('/inicio')
    expect(screen.queryByRole('region', { name: 'Em andamento' })).not.toBeInTheDocument()

    // Cria grupo com 2 itens em andamento e 1 tarefa solta em andamento
    const card = await criarGrupo({ titulo: 'Simulador POOSE', data: hoje() })
    const item1 = await criarItem(card.id, 'Tela 1 do simulador')
    const item2 = await criarItem(card.id, 'Tela 2 do simulador')
    const tarefaSolta = await criarTarefa({ titulo: 'Instalar dependências', data: hoje() })

    await definirAndamento({ tarefas: [tarefaSolta.id], itens: [item1.id, item2.id] }, true)

    // O bloco deve surgir reativamente
    const bloco = await screen.findByRole('region', { name: 'Em andamento' })
    expect(within(bloco).getByText('3 agora')).toBeVisible()
    expect(within(bloco).getByText('Simulador POOSE')).toBeVisible()
    expect(within(bloco).getByText('2 itens')).toBeVisible()
    expect(within(bloco).getByText('1 tarefa solta')).toBeVisible()

    // Não deve mostrar os nomes das tarefas
    expect(within(bloco).queryByText('Tela 1 do simulador')).not.toBeInTheDocument()
    expect(within(bloco).queryByText('Tela 2 do simulador')).not.toBeInTheDocument()
    expect(within(bloco).queryByText('Instalar dependências')).not.toBeInTheDocument()

    // Ao parar o andamento de todos, o bloco some sozinho
    await definirAndamento({ tarefas: [tarefaSolta.id], itens: [item1.id, item2.id] }, false)
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Em andamento' })).not.toBeInTheDocument()
    })
  })
})
