import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/db/database'
import { criarGrupo, criarItem } from '@/db/repositories/group-repository'
import { criarTarefa, definirConclusao } from '@/db/repositories/task-repository'
import { hoje, somarDias } from '@/lib/datas'
import { renderizarApp } from '@/test/renderizar-app'

const HOJE = hoje()
const ONTEM = somarDias(HOJE, -1)
const AMANHA = somarDias(HOJE, 1)

describe('Grupos na visão do dia', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    window.localStorage.clear()
  })

  it('cria o grupo, adiciona itens e mostra o progresso', async () => {
    const usuario = userEvent.setup()
    renderizarApp(`/dia/${HOJE}`)

    await usuario.type(await screen.findByRole('textbox', { name: 'Novo grupo' }), 'Casa{Enter}')
    const card = await screen.findByRole('region', { name: 'Grupo Casa' })
    const campo = within(card).getByRole('textbox', { name: 'Adicionar item em Casa' })
    await usuario.type(campo, 'Limpar o quarto{Enter}')
    await usuario.type(campo, 'Fazer almoço{Enter}')

    await usuario.click(
      await within(card).findByRole('checkbox', { name: 'Concluir Limpar o quarto' }),
    )
    expect(await within(card).findByLabelText('1 de 2 itens feitos')).toBeInTheDocument()
    // Concluídos vão para o fim do card, riscados.
    const feitos = within(card).getByRole('list', { name: 'Itens feitos de Casa' })
    expect(within(feitos).getByText('Limpar o quarto')).toBeInTheDocument()
  })

  it('mover o card leva só os pendentes; o card de origem fica concluído', async () => {
    const usuario = userEvent.setup()
    const card = await criarGrupo({ titulo: 'Casa', data: HOJE })
    const quarto = await criarItem(card.id, 'Limpar o quarto')
    const almoco = await criarItem(card.id, 'Fazer almoço')
    await definirConclusao(quarto.id, true)
    renderizarApp(`/dia/${HOJE}`)

    await usuario.click(await screen.findByRole('button', { name: 'Mais ações para o grupo Casa' }))
    await usuario.click(await screen.findByRole('menuitem', { name: 'Adiar para amanhã' }))

    await waitFor(async () => expect((await db.tasks.get(almoco.id))?.data).toBe(AMANHA))
    expect(await screen.findByText('1 tarefa adiada um dia')).toBeInTheDocument()
    // O card de hoje passa para "Concluídas".
    await usuario.click(await screen.findByRole('button', { name: 'Concluídas (1)' }))
    const concluidas = screen.getByRole('list', { name: 'Concluídas' })
    expect(within(concluidas).getByRole('region', { name: 'Grupo Casa' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Pendentes' })).not.toBeInTheDocument()
  })

  it('card todo concluído não oferece mover', async () => {
    const usuario = userEvent.setup()
    const card = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await definirConclusao((await criarItem(card.id, 'Varrer')).id, true)
    renderizarApp(`/dia/${HOJE}`)

    await usuario.click(await screen.findByRole('button', { name: 'Concluídas (1)' }))
    await usuario.click(await screen.findByRole('button', { name: 'Mais ações para o grupo Casa' }))
    expect(await screen.findByRole('menuitem', { name: 'Renomear' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Adiar para amanhã' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Mover para outro dia/ })).not.toBeInTheDocument()
  })

  it('item mostra há quantos dias está pendente pela data dele', async () => {
    const cardOntem = await criarGrupo({ titulo: 'Casa', data: ONTEM })
    await criarItem(cardOntem.id, 'Fazer almoço')
    const cardHoje = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await criarItem(cardHoje.id, 'Lavar a roupa')
    const usuario = userEvent.setup()
    renderizarApp(`/dia/${HOJE}`)

    await usuario.click(await screen.findByRole('button', { name: 'Trazer para hoje' }))

    const card = await screen.findByRole('region', { name: 'Grupo Casa' })
    await within(card).findByText('Fazer almoço')
    expect(within(card).getByText('pendente há 1 dia')).toBeInTheDocument()
    expect(screen.getAllByRole('region', { name: 'Grupo Casa' })).toHaveLength(1)
  })

  it('coloca uma tarefa solta no grupo e tira de volta pelo menu', async () => {
    const usuario = userEvent.setup()
    await criarGrupo({ titulo: 'Casa', data: HOJE })
    const tarefa = await criarTarefa({ titulo: 'Varrer', data: HOJE })
    renderizarApp(`/dia/${HOJE}`)

    await usuario.click(await screen.findByRole('button', { name: 'Mais ações para Varrer' }))
    // Pelo teclado: no jsdom o ponteiro simulado fecha o submenu ao sair do item.
    ;(await screen.findByRole('menuitem', { name: 'Colocar no grupo' })).focus()
    await usuario.keyboard('{ArrowRight}')
    ;(await screen.findByRole('menuitem', { name: 'Casa' })).focus()
    await usuario.keyboard('{Enter}')

    const card = await screen.findByRole('region', { name: 'Grupo Casa' })
    await within(card).findByText('Varrer')
    expect((await db.tasks.get(tarefa.id))?.groupInstanceId).toBeDefined()

    await usuario.click(within(card).getByRole('button', { name: 'Mais ações para Varrer' }))
    await usuario.click(await screen.findByRole('menuitem', { name: 'Tirar do grupo' }))
    await waitFor(async () =>
      expect((await db.tasks.get(tarefa.id))?.groupInstanceId).toBeUndefined(),
    )
  })

  it('o filtro de categoria vale para os cards', async () => {
    const casa = await db.categories.add({
      id: 'casa',
      nome: 'Casa',
      cor: '#2f8f5b',
      criadoEm: '',
      atualizadoEm: '',
    })
    await criarGrupo({ titulo: 'Limpeza', data: HOJE, categoryId: casa })
    await criarGrupo({ titulo: 'Trabalho', data: HOJE })
    renderizarApp(`/dia/${HOJE}?categoria=casa`)

    expect(await screen.findByRole('region', { name: 'Grupo Limpeza' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Grupo Trabalho' })).not.toBeInTheDocument()
  })
})
