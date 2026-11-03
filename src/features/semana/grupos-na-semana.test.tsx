import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/db/database'
import {
  copiarGrupos,
  criarGrupo,
  criarItem,
  definirConclusaoItem,
} from '@/db/repositories/group-repository'
import { criarCategoria } from '@/db/repositories/category-repository'
import { hoje, somarDias } from '@/lib/datas'
import { inicioDaSemana } from '@/lib/semana'
import { renderizarApp } from '@/test/renderizar-app'

const HOJE = hoje()

describe('Grupos nas visões de semana, mês e ano', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('semana: card compacto arrastável pelo cabeçalho, com "Novo grupo" na coluna', async () => {
    const usuario = userEvent.setup()
    const card = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await definirConclusaoItem((await criarItem(card.id, 'Arrumar o quarto')).id, true)
    await criarItem(card.id, 'Fazer comida')
    renderizarApp(`/semana/${inicioDaSemana(HOJE)}`)

    expect(
      await screen.findByRole('button', {
        name: 'Grupo Casa, 1/2. Espaço para levar os pendentes a outro dia.',
      }),
    ).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Expandir Casa' }))
    const itens = screen.getByRole('list', { name: 'Itens de Casa' })
    expect(within(itens).getByText('Fazer comida')).toBeInTheDocument()
    expect(screen.getAllByRole('textbox', { name: /^Novo grupo em / })).toHaveLength(7)
  })

  it('semana: todos os cards abrem recolhidos e o estado não é lembrado (nem o antigo)', async () => {
    const usuario = userEvent.setup()
    const card = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await criarItem(card.id, 'Fazer comida')
    const outroDia = await criarGrupo({ titulo: 'Casa', data: somarDias(HOJE, 1) })
    await criarItem(outroDia.id, 'Lavar roupa')
    // Lista antiga de recolhidos (até 03/11/2026): é apagada e não manda mais.
    localStorage.setItem('memoria:recolhidos:semana:cards', JSON.stringify(['outro']))
    renderizarApp(`/semana/${inicioDaSemana(HOJE)}`)

    const expandir = await screen.findAllByRole('button', { name: 'Expandir Casa' })
    expect(expandir).toHaveLength(2)
    expect(localStorage.getItem('memoria:recolhidos:semana:cards')).toBeNull()
    await usuario.click(expandir[0])
    expect(screen.getAllByRole('button', { name: 'Recolher Casa' })).toHaveLength(1)
    expect(screen.getByText('Fazer comida')).toBeVisible()
    await usuario.click(screen.getByRole('button', { name: 'Expandir tudo' }))
    expect(screen.getAllByRole('button', { name: 'Recolher Casa' })).toHaveLength(2)
    cleanup()

    renderizarApp(`/semana/${inicioDaSemana(HOJE)}`)
    expect(await screen.findAllByRole('button', { name: 'Expandir Casa' })).toHaveLength(2)
  })

  it('mês: itens pendentes e feitos contam; transferidos não', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await criarItem(card.id, 'Fazer comida')
    await definirConclusaoItem((await criarItem(card.id, 'Varrer')).id, true)
    await copiarGrupos([card.id], somarDias(HOJE, 1))
    renderizarApp(`/mes/${HOJE}`)

    // Hoje: 1 feito e 1 transferido (não conta); amanhã: a cópia pendente.
    expect(
      await screen.findByRole('listitem', { name: /, 1 concluída$|: 1 concluída$/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Grupo Casa, 1 pendentes/ })).toBeInTheDocument()
  })

  it('semana: menu → leva os pendentes para amanhã e Ctrl+Z desfaz', async () => {
    const usuario = userEvent.setup()
    const card = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await criarItem(card.id, 'Fazer comida')
    await criarItem(card.id, 'Lavar roupa')
    renderizarApp(`/semana/${inicioDaSemana(HOJE)}`)

    await usuario.click(await screen.findByRole('button', { name: 'Expandir Casa' }))
    // Cada item pendente tem a própria alça; o card inteiro arrasta o grupo.
    expect(
      await screen.findByRole('button', { name: /^Arrastar Fazer comida\./ }),
    ).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Mais ações para o grupo Casa' }))
    await usuario.click(
      await screen.findByRole('menuitem', { name: 'Levar pendentes para amanhã' }),
    )

    expect(await screen.findByText('2 itens levados para o dia seguinte')).toBeInTheDocument()
    await waitFor(async () => expect(await db.groupCards.count()).toBe(2))

    await usuario.keyboard('{Control>}z{/Control}')
    await waitFor(async () => expect(await db.groupCards.count()).toBe(1))
    expect((await db.groupItems.toArray()).every((item) => item.status === 'pendente')).toBe(true)
  })

  it('semana: renomeia o card e adiciona, renomeia e exclui itens ali mesmo', async () => {
    const usuario = userEvent.setup()
    const card = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await criarItem(card.id, 'Varrer')
    renderizarApp(`/semana/${inicioDaSemana(HOJE)}`)

    await usuario.click(await screen.findByRole('button', { name: 'Casa' }))
    const titulo = screen.getByRole('textbox', { name: 'Nome da tarefa' })
    await usuario.clear(titulo)
    await usuario.type(titulo, 'Lar{Enter}')
    await waitFor(async () => expect((await db.groupSeries.toArray())[0].titulo).toBe('Lar'))

    await usuario.type(
      await screen.findByRole('textbox', { name: 'Adicionar item em Lar' }),
      'Lavar louça{Enter}',
    )
    const itens = await screen.findByRole('list', { name: 'Itens de Lar' })
    await usuario.click(await within(itens).findByRole('button', { name: 'Lavar louça' }))
    const campoItem = screen.getByRole('textbox', { name: 'Nome da tarefa' })
    await usuario.clear(campoItem)
    await usuario.type(campoItem, 'Lavar a louça{Enter}')
    expect(await within(itens).findByRole('button', { name: 'Lavar a louça' })).toBeInTheDocument()

    await usuario.click(within(itens).getByRole('button', { name: 'Mais ações para Varrer' }))
    await usuario.click(await screen.findByRole('menuitem', { name: 'Excluir' }))
    await waitFor(async () =>
      expect((await db.groupItems.toArray()).map((item) => item.titulo)).toEqual(['Lavar a louça']),
    )
  })

  it('semana: "Novo grupo" já nasce na categoria escolhida ao lado', async () => {
    const usuario = userEvent.setup()
    const casa = await criarCategoria({ nome: 'Casa' })
    renderizarApp(`/semana/${inicioDaSemana(HOJE)}`)
    const [campo] = await screen.findAllByRole('textbox', { name: /^Novo grupo em / })
    const [botaoCategoria] = screen.getAllByRole('button', {
      name: /^Categoria do novo grupo em .*: Sem categoria$/,
    })

    await usuario.click(botaoCategoria)
    await usuario.click(await screen.findByRole('menuitemradio', { name: 'Casa' }))
    await usuario.type(campo, 'Faxina{Enter}')

    await waitFor(async () => expect((await db.groupSeries.toArray())[0]?.categoryId).toBe(casa.id))
  })
})
