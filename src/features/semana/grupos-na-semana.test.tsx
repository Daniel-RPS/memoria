import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { db } from '@/db/database'
import { criarGrupo, criarItem } from '@/db/repositories/group-repository'
import { definirConclusao } from '@/db/repositories/task-repository'
import { hoje } from '@/lib/datas'
import { inicioDaSemana } from '@/lib/semana'
import { renderizarApp } from '@/test/renderizar-app'

const HOJE = hoje()

describe('Grupos nas visões de semana, mês e ano', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('semana: card compacto com os pendentes e os feitos na contagem do dia', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await definirConclusao((await criarItem(card.id, 'Limpar o quarto')).id, true)
    await criarItem(card.id, 'Fazer almoço')
    renderizarApp(`/semana/${inicioDaSemana(HOJE)}`)

    const cabecalho = await screen.findByRole('button', {
      name: 'Grupo Casa, 1/2. Espaço para mover o grupo.',
    })
    expect(cabecalho).toBeInTheDocument()
    const itens = screen.getByRole('list', { name: 'Itens de Casa' })
    expect(within(itens).getByText('Fazer almoço')).toBeInTheDocument()
    expect(within(itens).queryByText('Limpar o quarto')).not.toBeInTheDocument()
    expect(screen.getByText('1 concluída')).toBeInTheDocument()
  })

  it('mês: os itens dos grupos contam como tarefas do dia', async () => {
    const card = await criarGrupo({ titulo: 'Casa', data: HOJE })
    await criarItem(card.id, 'Fazer almoço')
    await criarItem(card.id, 'Lavar a roupa')
    renderizarApp(`/mes/${HOJE}`)

    expect(await screen.findByText('Fazer almoço')).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: /2 pendentes/ })).toBeInTheDocument()
  })
})
