import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/db/database'
import {
  copiarGrupos,
  criarGrupo,
  criarItem,
  definirConclusaoItem,
} from '@/db/repositories/group-repository'
import { criarTarefa } from '@/db/repositories/task-repository'
import { hoje, somarDias } from '@/lib/datas'
import { diaCurto } from '@/lib/grupos'
import { renderizarApp } from '@/test/renderizar-app'

const HOJE = hoje()
const ONTEM = somarDias(HOJE, -1)
const AMANHA = somarDias(HOJE, 1)

async function criarCasaDoExemplo(data = HOJE) {
  const card = await criarGrupo({ titulo: 'Casa', data })
  const itens = []
  for (const titulo of [
    'Arrumar o quarto',
    'Arrumar o banheiro',
    'Fazer comida',
    'Lavar garagem',
  ]) {
    itens.push(await criarItem(card.id, titulo))
  }
  for (const indice of [0, 1, 3]) await definirConclusaoItem(itens[indice].id, true)
  return card
}

describe('Grupos na visão do dia', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    window.localStorage.clear()
  })

  it('cria o grupo ao lado de "Nova tarefa", adiciona itens e mostra o progresso', async () => {
    const usuario = userEvent.setup()
    renderizarApp(`/dia/${HOJE}`)

    await usuario.type(await screen.findByRole('textbox', { name: 'Novo grupo' }), 'Casa{Enter}')
    const card = await screen.findByRole('region', { name: 'Grupo Casa' })
    const campo = within(card).getByRole('textbox', { name: 'Adicionar item em Casa' })
    await usuario.type(campo, 'Arrumar o quarto{Enter}')
    await usuario.type(campo, 'Fazer comida{Enter}')

    await usuario.click(
      await within(card).findByRole('checkbox', { name: 'Concluir Arrumar o quarto' }),
    )
    expect(await within(card).findByText('1/2')).toBeInTheDocument()
    // O grupo não é categoria: nenhuma categoria "Casa" foi criada.
    expect(await db.categories.count()).toBe(0)
  })

  it('exemplo: mover o card copia o pendente e o original fica com ele transferido', async () => {
    const usuario = userEvent.setup()
    await criarCasaDoExemplo()
    renderizarApp(`/dia/${HOJE}`)

    await usuario.click(await screen.findByRole('button', { name: 'Mais ações para o grupo Casa' }))
    await usuario.click(await screen.findByRole('menuitem', { name: 'Levar pendentes para…' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Levar pendentes de “Casa”' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Amanhã' }))

    await waitFor(async () => expect(await db.groupCards.count()).toBe(2))
    expect(await screen.findByText('1 item levado para amanhã')).toBeInTheDocument()
    const card = screen.getByRole('region', { name: 'Grupo Casa' })
    const transferido = await within(card).findByRole('link', {
      name: `transferido para ${diaCurto(AMANHA)}`,
    })
    expect(transferido).toHaveAttribute('href', `/dia/${AMANHA}`)
    // Sem caixa de seleção no transferido; os feitos continuam marcados.
    expect(within(card).queryByRole('checkbox', { name: /Fazer comida/ })).not.toBeInTheDocument()
    expect(within(card).getByText('3 feitos · 1 transferido')).toBeInTheDocument()
    expect(within(card).getByText('encerrado')).toBeInTheDocument()

    await usuario.click(transferido)
    const cardAmanha = await screen.findByRole('region', { name: 'Grupo Casa' })
    expect(
      await within(cardAmanha).findByRole('checkbox', { name: 'Concluir Fazer comida' }),
    ).toBeInTheDocument()
    expect(within(cardAmanha).queryByText('Arrumar o quarto')).not.toBeInTheDocument()
  })

  it('card com tudo marcado: mover e adiar ficam desabilitados', async () => {
    const usuario = userEvent.setup()
    const card = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await definirConclusaoItem((await criarItem(card.id, 'Varrer')).id, true)
    renderizarApp(`/dia/${HOJE}`)

    await usuario.click(await screen.findByRole('button', { name: 'Mais ações para o grupo Casa' }))
    expect(
      await screen.findByRole('menuitem', { name: 'Levar pendentes para amanhã' }),
    ).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('menuitem', { name: 'Levar pendentes para…' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByText('Nenhum item pendente para levar.')).toBeInTheDocument()
  })

  it('a cópia mostra "pendente desde" com a data original', async () => {
    const card = await criarCasaDoExemplo(ONTEM)
    await copiarGrupos([card.id], HOJE)
    renderizarApp(`/dia/${HOJE}`)

    const cardHoje = await screen.findByRole('region', { name: 'Grupo Casa' })
    expect(
      await within(cardHoje).findByText(`pendente desde ${diaCurto(ONTEM)}`),
    ).toBeInTheDocument()
  })

  it('a cópia num dia futuro também mostra "pendente desde"; itens novos dela, não', async () => {
    const card = await criarCasaDoExemplo(HOJE)
    await copiarGrupos([card.id], AMANHA)
    const cardAmanha = (await db.groupCards.where('data').equals(AMANHA).first())!
    await criarItem(cardAmanha.id, 'Lavar roupa')
    renderizarApp(`/dia/${AMANHA}`)

    const cardNaTela = await screen.findByRole('region', { name: 'Grupo Casa' })
    expect(
      await within(cardNaTela).findByText(`pendente desde ${diaCurto(HOJE)}`),
    ).toBeInTheDocument()
    expect(within(cardNaTela).getAllByText(/^pendente desde/)).toHaveLength(1)
  })

  it('"Trazer para hoje" copia os pendentes dos cards de ontem', async () => {
    const usuario = userEvent.setup()
    await criarCasaDoExemplo(ONTEM)
    await criarTarefa({ titulo: 'Pagar conta', data: ONTEM })
    renderizarApp(`/dia/${HOJE}`)

    expect(await screen.findByText('Ficaram 2 tarefas pendentes ontem.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Trazer para hoje' }))

    expect(await screen.findByText('1 tarefa movida e 1 item levado para hoje')).toBeInTheDocument()
    const card = await screen.findByRole('region', { name: 'Grupo Casa' })
    expect(
      within(card).getByRole('checkbox', { name: 'Concluir Fazer comida' }),
    ).toBeInTheDocument()
    expect(await db.groupCards.count()).toBe(2)
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
    expect(await db.groupItems.get(tarefa.id)).toBeDefined()
    expect(await db.tasks.count()).toBe(0)

    await usuario.click(within(card).getByRole('button', { name: 'Mais ações para Varrer' }))
    await usuario.click(await screen.findByRole('menuitem', { name: 'Tirar do grupo' }))
    await waitFor(async () => expect(await db.tasks.get(tarefa.id)).toBeDefined())
    expect(await db.groupItems.count()).toBe(0)
  })

  it('o filtro de categoria vale para os cards', async () => {
    await db.categories.add({
      id: 'casa',
      nome: 'Limpeza',
      cor: '#2f8f5b',
      ordem: 1,
      criadoEm: '',
      atualizadoEm: '',
    })
    await criarGrupo({ titulo: 'Casa', data: HOJE, categoryId: 'casa' })
    await criarGrupo({ titulo: 'Trabalho', data: HOJE })
    renderizarApp(`/dia/${HOJE}?categoria=casa`)

    expect(await screen.findByRole('region', { name: 'Grupo Casa' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Grupo Trabalho' })).not.toBeInTheDocument()
  })

  it('selecionando, clicar no cabeçalho marca o card inteiro', async () => {
    const usuario = userEvent.setup()
    await criarCasaDoExemplo()
    renderizarApp(`/dia/${HOJE}`)

    await usuario.click(await screen.findByRole('button', { name: 'Selecionar' }))
    await usuario.click(screen.getByRole('button', { name: 'Casa' }))

    expect(screen.getByRole('checkbox', { name: 'Selecionar grupo Casa' })).toBeChecked()
    await usuario.click(screen.getByRole('button', { name: 'Casa' }))
    expect(screen.getByRole('checkbox', { name: 'Selecionar grupo Casa' })).not.toBeChecked()
  })

  it('menu ⋯ › Categoria › Nova categoria cria, aplica ao card e fecha o menu', async () => {
    const usuario = userEvent.setup()
    await criarGrupo({ titulo: 'Casa', data: HOJE })
    renderizarApp(`/dia/${HOJE}`)

    await usuario.click(await screen.findByRole('button', { name: 'Mais ações para o grupo Casa' }))
    // Submenu Radix no jsdom: pelo teclado.
    ;(await screen.findByRole('menuitem', { name: 'Categoria' })).focus()
    await usuario.keyboard('{ArrowRight}')
    ;(await screen.findByRole('menuitem', { name: 'Nova categoria' })).focus()
    await usuario.keyboard('{Enter}')
    const campo = await screen.findByRole('textbox', { name: 'Nova categoria' })
    await usuario.type(campo, '   {Enter}')
    expect(await screen.findByText('Escreva um nome.')).toBeInTheDocument()
    await usuario.clear(campo)
    await usuario.type(campo, 'Trabalho{Enter}')

    await waitFor(async () => {
      const [categoria] = await db.categories.toArray()
      const [serie] = await db.groupSeries.toArray()
      expect(categoria?.nome).toBe('Trabalho')
      expect(serie.categoryId).toBe(categoria?.id)
    })
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    const card = screen.getByRole('region', { name: 'Grupo Casa' })
    expect(await within(card).findByText('Trabalho')).toBeInTheDocument()
  })
})
