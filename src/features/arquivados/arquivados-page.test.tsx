import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { arquivar } from '@/db/repositories/arquivo-repository'
import { criarGrupo, criarItem } from '@/db/repositories/group-repository'
import { criarNota } from '@/db/repositories/note-repository'
import { criarProcedimento } from '@/db/repositories/procedure-repository'
import { criarTarefa } from '@/db/repositories/task-repository'
import { CHAVE_TIPO_DOS_ARQUIVADOS } from '@/features/arquivados/arquivados-page'
import { renderizarApp } from '@/test/renderizar-app'

function navegacao() {
  return screen.getByRole('navigation', { name: 'Telas' })
}

async function arquivarUmDeCada() {
  const tarefa = await criarTarefa({ titulo: 'Ligar para Fulano', data: '2026-10-28' })
  const card = await criarGrupo({ titulo: 'Casa', data: '2026-10-29' })
  await criarItem(card.id, 'Varrer')
  const nota = await criarNota({ titulo: 'Senha do roteador', conteudo: 'Trocar no domingo' })
  const procedimento = await criarProcedimento({
    titulo: 'Renovar certificado',
    categoryId: '',
    etapas: [{ id: 'e1', texto: 'Abrir o portal' }],
  })
  await arquivar({
    tarefas: [tarefa.id],
    cards: [card.id],
    notas: [nota.id],
    procedimentos: [procedimento.id],
  })
}

describe('tela Arquivados', () => {
  beforeEach(async () => {
    localStorage.clear()
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('o item fica entre Categorias e Dados, sem contador quando não há nada', async () => {
    renderizarApp('/arquivados')
    const links = await within(navegacao()).findAllByRole('link')
    const nomes = links.map((link) => link.textContent)
    const indice = nomes.indexOf('Arquivados')
    expect(nomes[indice - 1]).toBe('Categorias')
    expect(nomes[indice + 1]).toBe('Dados')
    expect(nomes[indice + 2]).toBe('Backup')
    expect(within(navegacao()).getByRole('link', { name: 'Arquivados' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      await screen.findByText(
        'Nada arquivado. Use Arquivar no menu ⋯ de uma tarefa, grupo, nota ou procedimento.',
      ),
    ).toBeInTheDocument()
  })

  it('mostra um bloco por tipo, filtra com contagem e busca, e o contador da barra acompanha', async () => {
    await arquivarUmDeCada()
    const usuario = userEvent.setup()
    renderizarApp('/arquivados')

    for (const [bloco, titulo] of [
      ['Tarefas', 'Ligar para Fulano'],
      ['Grupos de tarefas', 'Casa'],
      ['Notas', 'Senha do roteador'],
      ['Procedimentos', 'Renovar certificado'],
    ] as const) {
      const regiao = await screen.findByRole('region', { name: bloco })
      expect(within(regiao).getByText(titulo)).toBeInTheDocument()
    }
    expect(screen.getByRole('radio', { name: /^Todos/ })).toHaveTextContent('4')
    expect(within(navegacao()).getByRole('link', { name: 'Arquivados' })).toHaveAttribute(
      'aria-description',
      '4 itens',
    )

    await usuario.click(screen.getByRole('radio', { name: /^Notas/ }))
    expect(screen.queryByText('Ligar para Fulano')).not.toBeInTheDocument()
    expect(screen.getByText('Senha do roteador')).toBeInTheDocument()
    expect(localStorage.getItem(CHAVE_TIPO_DOS_ARQUIVADOS)).toBe('nota')

    await usuario.click(screen.getByRole('radio', { name: /^Todos/ }))
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar arquivados' }), 'portal')
    expect(screen.getByText('Renovar certificado')).toBeInTheDocument()
    expect(screen.queryByText('Senha do roteador')).not.toBeInTheDocument()
  })

  it('desarquivar nota some da lista e o contador cai na hora', async () => {
    await arquivarUmDeCada()
    const usuario = userEvent.setup()
    renderizarApp('/arquivados')
    await screen.findByText('Senha do roteador')

    await usuario.click(screen.getByRole('button', { name: 'Desarquivar Senha do roteador' }))
    await screen.findByText('Nota desarquivada')
    // A lista e o contador se atualizam sozinhos (consulta ao vivo), sem recarregar.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /^Senha do roteador/ })).not.toBeInTheDocument(),
    )
    await waitFor(() =>
      expect(within(navegacao()).getByRole('link', { name: 'Arquivados' })).toHaveAttribute(
        'aria-description',
        '3 itens',
      ),
    )
  })
})
