import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/db/database'
import { criarTarefa } from '@/db/repositories/task-repository'
import { hoje, somarDias } from '@/lib/datas'
import { renderizarApp } from '@/test/renderizar-app'

const HOJE = hoje()
const ONTEM = somarDias(HOJE, -1)
const AMANHA = somarDias(HOJE, 1)

/** Títulos das pendentes, lidos do nome da caixa "Concluir <título>" (sem selos e rótulos). */
async function titulosPendentes() {
  const lista = screen.queryByRole('list', { name: 'Pendentes' })
  if (!lista) return []
  return within(lista)
    .queryAllByRole('checkbox', { name: /^Concluir / })
    .map((caixa) => caixa.getAttribute('aria-label')!.replace(/^Concluir /, ''))
}

describe('Mover tarefas na visão do dia', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    window.localStorage.clear()
  })

  it('traz as pendências de ontem e permite desfazer', async () => {
    const usuario = userEvent.setup()
    const tarefa = await criarTarefa({ titulo: 'Pagar boleto', data: ONTEM })
    renderizarApp(`/dia/${HOJE}`)

    expect(await screen.findByText('Ficou 1 tarefa pendente ontem.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Trazer para hoje' }))

    await waitFor(async () => expect(await titulosPendentes()).toEqual(['Pagar boleto']))
    expect(screen.getByText('pendente há 1 dia')).toBeInTheDocument()
    expect(await screen.findByText('1 tarefa movida para hoje')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Desfazer' }))
    await waitFor(async () => expect((await db.tasks.get(tarefa.id))?.data).toBe(ONTEM))
  })

  it('"Adiar para amanhã" pelo menu tira a tarefa de hoje sem mudar a data original', async () => {
    const usuario = userEvent.setup()
    const tarefa = await criarTarefa({ titulo: 'Ligar para o síndico', data: HOJE })
    renderizarApp(`/dia/${HOJE}`)

    await usuario.click(
      await screen.findByRole('button', { name: 'Mais ações para Ligar para o síndico' }),
    )
    await usuario.click(await screen.findByRole('menuitem', { name: 'Adiar para amanhã' }))

    await waitFor(async () => expect((await db.tasks.get(tarefa.id))?.data).toBe(AMANHA))
    expect((await db.tasks.get(tarefa.id))?.dataOriginal).toBe(HOJE)
    await waitFor(async () => expect(await titulosPendentes()).toEqual([]))
  })

  it('"Mover para outro dia…" abre o calendário e move para o dia escolhido', async () => {
    const usuario = userEvent.setup()
    const tarefa = await criarTarefa({ titulo: 'Revisar contrato', data: ONTEM })
    renderizarApp(`/dia/${ONTEM}`)

    await usuario.click(
      await screen.findByRole('button', { name: 'Mais ações para Revisar contrato' }),
    )
    await usuario.click(await screen.findByRole('menuitem', { name: 'Mover para outro dia…' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Mover para outro dia' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Hoje' }))

    await waitFor(async () => expect((await db.tasks.get(tarefa.id))?.data).toBe(HOJE))
  })

  it('seleciona várias e adia todas de uma vez', async () => {
    const usuario = userEvent.setup()
    await criarTarefa({ titulo: 'A', data: HOJE })
    await criarTarefa({ titulo: 'B', data: HOJE })
    await criarTarefa({ titulo: 'C', data: HOJE })
    renderizarApp(`/dia/${HOJE}`)

    await usuario.click(await screen.findByRole('button', { name: 'Selecionar' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Selecionar A' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Selecionar C' }))
    expect(screen.getByText('2 selecionadas')).toBeInTheDocument()

    const barra = screen.getByRole('toolbar', { name: 'Ações para as tarefas selecionadas' })
    await usuario.click(within(barra).getByRole('button', { name: 'Adiar para amanhã' }))

    await waitFor(async () => expect(await titulosPendentes()).toEqual(['B']))
    const amanha = await db.tasks.where('data').equals(AMANHA).sortBy('ordem')
    expect(amanha.map((tarefa) => tarefa.titulo)).toEqual(['A', 'C'])
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })

  it('Esc sai do modo de seleção', async () => {
    const usuario = userEvent.setup()
    await criarTarefa({ titulo: 'A', data: HOJE })
    renderizarApp(`/dia/${HOJE}`)

    await usuario.click(await screen.findByRole('button', { name: 'Selecionar' }))
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Concluir A' })).toBeInTheDocument()
  })
})
