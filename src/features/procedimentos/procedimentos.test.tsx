import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/db/database'
import { criarCategoria, reordenarCategoria } from '@/db/repositories/category-repository'
import { criarProcedimento } from '@/db/repositories/procedure-repository'
import { renderizarApp } from '@/test/renderizar-app'

/** Rótulos "Etapa N" e textos das etapas, na ordem da tela. */
function etapasNaTela() {
  const lista = screen.getByRole('list', { name: 'Etapas' })
  return within(lista)
    .getAllByRole('textbox')
    .map((campo) => [
      campo.closest('li')?.querySelector('label')?.textContent,
      (campo as HTMLTextAreaElement).value,
    ])
}

describe('Procedimentos', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('cria com 3 etapas, renomeia a 2ª e exclui a 1ª: numeração fica 1 e 2, na ordem', async () => {
    const usuario = userEvent.setup()
    const router = renderizarApp('/procedimentos/novo')

    await usuario.type(await screen.findByLabelText('Título'), 'Trocar o filtro')
    for (const texto of ['Desligar a torneira', 'Abrir a tampa', 'Encaixar o refil']) {
      await usuario.click(screen.getByRole('button', { name: 'Adicionar etapa' }))
      // A etapa nova recebe o foco.
      await usuario.keyboard(texto)
    }
    await usuario.click(screen.getByRole('button', { name: 'Criar procedimento' }))

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/procedimentos\/[^/]+$/))
    // "Salvo" só existe na página do procedimento (o endereço muda antes de ela desenhar).
    expect(await screen.findByRole('status')).toHaveTextContent('Salvo')
    const segunda = await screen.findByLabelText('Etapa 2')
    expect(segunda).toHaveValue('Abrir a tampa')

    await usuario.clear(segunda)
    await usuario.type(segunda, 'Desrosquear a tampa')
    await usuario.click(screen.getByRole('button', { name: 'Excluir etapa 1' }))

    expect(screen.getByLabelText('Etapa 1')).toHaveValue('Desrosquear a tampa')
    expect(screen.getByLabelText('Etapa 2')).toHaveValue('Encaixar o refil')
    expect(screen.queryByLabelText('Etapa 3')).not.toBeInTheDocument()
    expect(etapasNaTela()).toEqual([
      ['Etapa 1', 'Desrosquear a tampa'],
      ['Etapa 2', 'Encaixar o refil'],
    ])

    await waitFor(async () => {
      const [salvo] = await db.procedures.toArray()
      expect(salvo.etapas.map(({ texto, ordem }) => ({ texto, ordem }))).toEqual([
        { texto: 'Desrosquear a tampa', ordem: 0 },
        { texto: 'Encaixar o refil', ordem: 1 },
      ])
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Salvo')
  })

  it('não cria sem título', async () => {
    const usuario = userEvent.setup()
    renderizarApp('/procedimentos/novo')

    await usuario.click(await screen.findByRole('button', { name: 'Criar procedimento' }))

    expect(await screen.findByText('Dê um título ao procedimento.')).toBeInTheDocument()
    expect(await db.procedures.count()).toBe(0)
  })

  it('lista um bloco por categoria, com "Sem categoria" no fim', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const trabalho = await criarCategoria({ nome: 'Trabalho' })
    await criarProcedimento({ titulo: 'Solto', categoryId: '', etapas: [] })
    await criarProcedimento({ titulo: 'Relatório', categoryId: trabalho.id, etapas: [] })
    await criarProcedimento({
      titulo: 'Regar plantas',
      categoryId: casa.id,
      etapas: [{ id: 'e', texto: 'Encher o regador' }],
    })
    renderizarApp('/procedimentos')

    await screen.findByRole('link', { name: /Regar plantas/ })
    const blocos = screen.getAllByRole('heading', { level: 2 }).map((titulo) => titulo.textContent)
    expect(blocos).toEqual(['Casa1', 'Trabalho1', 'Sem categoria1'])
    const casaBloco = screen.getByRole('region', { name: 'Casa' })
    expect(within(casaBloco).getByRole('link', { name: /Regar plantas/ })).toHaveTextContent(
      '1 etapa',
    )
  })

  it('a busca encontra pelo título e pelo texto da etapa', async () => {
    const usuario = userEvent.setup()
    await criarProcedimento({
      titulo: 'Backup do notebook',
      categoryId: '',
      etapas: [{ id: 'e1', texto: 'Conectar o disco externo' }],
    })
    await criarProcedimento({ titulo: 'Renovar documento', categoryId: '', etapas: [] })
    renderizarApp('/procedimentos')
    const busca = await screen.findByRole('searchbox', { name: 'Buscar procedimentos' })
    await screen.findByRole('link', { name: /Backup do notebook/ })

    await usuario.type(busca, 'documento')
    expect(screen.getByRole('link', { name: /Renovar documento/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Backup do notebook/ })).not.toBeInTheDocument()

    await usuario.clear(busca)
    await usuario.type(busca, 'disco externo')
    expect(screen.getByRole('link', { name: /Backup do notebook/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Renovar documento/ })).not.toBeInTheDocument()

    await usuario.clear(busca)
    await usuario.type(busca, 'impressora')
    expect(screen.getByText('Nenhum procedimento com “impressora”.')).toBeInTheDocument()
  })

  it('excluir o procedimento pede confirmação', async () => {
    const usuario = userEvent.setup()
    const procedimento = await criarProcedimento({ titulo: 'Velho', categoryId: '', etapas: [] })
    const router = renderizarApp(`/procedimentos/${procedimento.id}`)

    await usuario.click(await screen.findByRole('button', { name: 'Excluir procedimento…' }))
    const dialogo = screen.getByRole('alertdialog', { name: 'Excluir “Velho”?' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(await db.procedures.count()).toBe(1)

    await usuario.click(screen.getByRole('button', { name: 'Excluir procedimento…' }))
    await usuario.click(screen.getByRole('button', { name: 'Excluir procedimento' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/procedimentos'))
    expect(await db.procedures.count()).toBe(0)
  })

  it('o seletor de categoria cria uma subcategoria ali mesmo e ela fica aplicada', async () => {
    const usuario = userEvent.setup()
    const casa = await criarCategoria({ nome: 'Casa' })
    const procedimento = await criarProcedimento({ titulo: 'Regar', categoryId: '', etapas: [] })
    renderizarApp(`/procedimentos/${procedimento.id}`)

    await usuario.click(await screen.findByRole('button', { name: 'Categoria' }))
    ;(await screen.findByRole('menuitem', { name: 'Nova subcategoria em Casa' })).focus()
    await usuario.keyboard('{Enter}')
    await usuario.type(
      await screen.findByRole('textbox', { name: 'Nova subcategoria' }),
      'Jardim{Enter}',
    )

    await waitFor(async () => {
      const [jardim] = await db.subcategories.toArray()
      expect(await db.procedures.get(procedimento.id)).toMatchObject({
        categoryId: casa.id,
        subcategoryId: jardim?.id,
      })
    })
    expect(screen.getByRole('button', { name: 'Categoria' })).toHaveTextContent('Casa › Jardim')
  })

  it('os blocos seguem a ordem das categorias definida pelo usuário', async () => {
    const casa = await criarCategoria({ nome: 'Casa' })
    const trabalho = await criarCategoria({ nome: 'Trabalho' })
    await reordenarCategoria([trabalho.id, casa.id], trabalho.id)
    await criarProcedimento({ titulo: 'Relatório', categoryId: trabalho.id, etapas: [] })
    await criarProcedimento({ titulo: 'Regar', categoryId: casa.id, etapas: [] })
    renderizarApp('/procedimentos')

    await screen.findByRole('link', { name: /Regar/ })
    const blocos = screen.getAllByRole('heading', { level: 2 }).map((titulo) => titulo.textContent)
    expect(blocos).toEqual(['Trabalho1', 'Casa1'])
  })
})
