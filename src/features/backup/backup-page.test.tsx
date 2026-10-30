import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/db/database'
import { exportarDados } from '@/db/repositories/backup-repository'
import { criarTarefa } from '@/db/repositories/task-repository'
import { renderizarApp } from '@/test/renderizar-app'

function arquivo(conteudo: string, nome = 'backup.json') {
  return new File([conteudo], nome, { type: 'application/json' })
}

describe('Página de backup', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('baixa o backup com o nome do dia e lembra quando foi feito', async () => {
    const usuario = userEvent.setup()
    await criarTarefa({ titulo: 'Pagar conta', data: '2026-10-30' })
    const criarUrl = vi.fn(() => 'blob:backup')
    URL.createObjectURL = criarUrl
    URL.revokeObjectURL = vi.fn()
    const clicar = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderizarApp('/backup')

    expect(await screen.findByText('Agora você tem 1 tarefa.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum backup feito neste navegador.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Baixar backup' }))

    await waitFor(() => expect(clicar).toHaveBeenCalled())
    const link = clicar.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toMatch(/^memoria-backup-\d{4}-\d{2}-\d{2}\.json$/)
    expect(await screen.findByText(/Último backup neste navegador: /)).toBeInTheDocument()
  })

  it('recusa arquivo que não é backup e não mexe nos dados', async () => {
    const usuario = userEvent.setup()
    await criarTarefa({ titulo: 'Fica', data: '2026-10-30' })
    renderizarApp('/backup')

    await usuario.upload(await screen.findByLabelText('Arquivo de backup'), arquivo('{"x":1}'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este arquivo não é um backup do MemorIA.',
    )
    expect(await db.tasks.count()).toBe(1)
  })

  it('mostra o que tem no arquivo e, após confirmar, substitui os dados', async () => {
    const usuario = userEvent.setup()
    await criarTarefa({ titulo: 'Do backup 1', data: '2026-10-29' })
    await criarTarefa({ titulo: 'Do backup 2', data: '2026-10-30' })
    const conteudo = JSON.stringify(await exportarDados())
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    await criarTarefa({ titulo: 'Atual', data: '2026-10-30' })
    renderizarApp('/backup')

    await usuario.upload(
      await screen.findByLabelText('Arquivo de backup'),
      arquivo(conteudo, 'memoria-backup-2026-10-30.json'),
    )

    expect(await screen.findByText('memoria-backup-2026-10-30.json')).toBeInTheDocument()
    expect(screen.getByText('2 tarefas')).toBeInTheDocument()
    expect(await screen.findByText('1 tarefa')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Substituir meus dados' }))
    const dialogo = await screen.findByRole('alertdialog', { name: 'Substituir todos os dados?' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Substituir dados' }))

    await waitFor(async () => {
      const titulos = (await db.tasks.toArray()).map((tarefa) => tarefa.titulo).sort()
      expect(titulos).toEqual(['Do backup 1', 'Do backup 2'])
    })
    expect(
      await screen.findByText('Dados restaurados de memoria-backup-2026-10-30.json.'),
    ).toBeInTheDocument()
  })

  it('cancelar a confirmação não altera nada', async () => {
    const usuario = userEvent.setup()
    await criarTarefa({ titulo: 'Do backup', data: '2026-10-30' })
    const conteudo = JSON.stringify(await exportarDados())
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    await criarTarefa({ titulo: 'Atual', data: '2026-10-30' })
    renderizarApp('/backup')

    await usuario.upload(await screen.findByLabelText('Arquivo de backup'), arquivo(conteudo))
    await usuario.click(await screen.findByRole('button', { name: 'Substituir meus dados' }))
    const dialogo = await screen.findByRole('alertdialog', { name: 'Substituir todos os dados?' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))

    expect((await db.tasks.toArray()).map((tarefa) => tarefa.titulo)).toEqual(['Atual'])
  })
})
