import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { db } from '@/db/database'
import {
  copiarGrupos,
  criarGrupo,
  criarItem,
  definirConclusaoItem,
} from '@/db/repositories/group-repository'
import { hoje, somarDias } from '@/lib/datas'
import { inicioDaSemana } from '@/lib/semana'
import { renderizarApp } from '@/test/renderizar-app'

const HOJE = hoje()

describe('Grupos nas visões de semana, mês e ano', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('semana: card compacto arrastável pelo cabeçalho, com "Novo grupo" na coluna', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await definirConclusaoItem((await criarItem(card.id, 'Arrumar o quarto')).id, true)
    await criarItem(card.id, 'Fazer comida')
    renderizarApp(`/semana/${inicioDaSemana(HOJE)}`)

    expect(
      await screen.findByRole('button', {
        name: 'Grupo Casa, 1/2. Espaço para levar os pendentes a outro dia.',
      }),
    ).toBeInTheDocument()
    const itens = screen.getByRole('list', { name: 'Itens de Casa' })
    expect(within(itens).getByText('Fazer comida')).toBeInTheDocument()
    expect(screen.getAllByRole('textbox', { name: /^Novo grupo em / })).toHaveLength(7)
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
})
