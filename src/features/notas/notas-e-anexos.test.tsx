import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/db/database'
import { adicionarAnexo } from '@/db/repositories/attachment-repository'
import { criarNota } from '@/db/repositories/note-repository'
import { criarTarefa } from '@/db/repositories/task-repository'
import { hoje } from '@/lib/datas'
import { renderizarApp } from '@/test/renderizar-app'

describe('Notas', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('cria nota, salva sozinha e aparece na lista com o título', async () => {
    const usuario = userEvent.setup()
    const router = renderizarApp('/notas')

    await usuario.click(await screen.findByRole('button', { name: 'Nova nota' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/notas\/.+/))
    await usuario.type(await screen.findByLabelText('Título da nota'), 'Ideias para a casa')
    await usuario.type(screen.getByLabelText('Texto da nota'), 'Pintar a varanda')
    expect(await screen.findByText('Salvo')).toBeInTheDocument()

    const navegacao = screen.getByRole('navigation', { name: 'Telas' })
    await usuario.click(within(navegacao).getByRole('link', { name: 'Notas' }))
    const lista = await screen.findByRole('region', { name: 'Lista de notas' })
    expect(await within(lista).findByText('Ideias para a casa')).toBeInTheDocument()
    expect(within(lista).getByText('Pintar a varanda')).toBeInTheDocument()
  })

  it('não perde o texto ao sair logo depois de digitar', async () => {
    const usuario = userEvent.setup()
    const nota = await criarNota()
    renderizarApp(`/notas/${nota.id}`)

    await usuario.type(await screen.findByLabelText('Texto da nota'), 'Última frase')
    // Sai antes do atraso de gravação terminar.
    const navegacao = screen.getByRole('navigation', { name: 'Telas' })
    await usuario.click(within(navegacao).getByRole('link', { name: 'Notas' }))

    await waitFor(async () => expect((await db.notes.get(nota.id))?.conteudo).toBe('Última frase'))
  })

  it('busca notas ignorando acentos', async () => {
    const usuario = userEvent.setup()
    await criarNota({ titulo: 'Reunião do condomínio' })
    await criarNota({ titulo: 'Receitas' })
    renderizarApp('/notas')

    await usuario.type(await screen.findByRole('searchbox', { name: 'Buscar notas' }), 'condominio')
    const lista = screen.getByRole('region', { name: 'Lista de notas' })
    await waitFor(() => expect(within(lista).queryByText('Receitas')).not.toBeInTheDocument())
    expect(within(lista).getByText('Reunião do condomínio')).toBeInTheDocument()
  })
})

describe('Anexos', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('link: recusa javascript: e abre os válidos em outra aba com segurança', async () => {
    const usuario = userEvent.setup()
    const nota = await criarNota({ titulo: 'Links' })
    renderizarApp(`/notas/${nota.id}`)

    await usuario.click(await screen.findByRole('button', { name: 'Link' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Adicionar link' })
    await usuario.type(within(dialogo).getByLabelText('Endereço'), 'javascript:alert(1)')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Adicionar link' }))
    expect(
      await within(dialogo).findByText('Use um endereço que comece com http:// ou https://.'),
    ).toBeInTheDocument()

    const endereco = within(dialogo).getByLabelText('Endereço')
    await usuario.clear(endereco)
    await usuario.type(endereco, 'https://www.exemplo.com/manual')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Adicionar link' }))

    const link = await screen.findByRole('link', { name: /exemplo\.com/ })
    expect(link).toHaveAttribute('href', 'https://www.exemplo.com/manual')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('foto escolhida vira anexo com miniatura', async () => {
    const usuario = userEvent.setup()
    const nota = await criarNota({ titulo: 'Fotos' })
    renderizarApp(`/notas/${nota.id}`)

    const foto = new File([new Uint8Array([137, 80, 78, 71])], 'parede.png', { type: 'image/png' })
    await usuario.upload(await screen.findByLabelText('Escolher fotos da nota'), foto)

    expect(await screen.findByRole('button', { name: /^Ampliar Foto de / })).toBeInTheDocument()
    const [anexo] = await db.attachments.toArray()
    expect(anexo).toMatchObject({ tipo: 'foto', dono: { tipo: 'note', id: nota.id } })
  })

  it('excluir anexo tem "Desfazer"', async () => {
    const usuario = userEvent.setup()
    const nota = await criarNota({ titulo: 'Com link' })
    await adicionarAnexo({
      dono: { tipo: 'note', id: nota.id },
      tipo: 'link',
      nome: 'Manual',
      url: 'https://exemplo.com',
    })
    renderizarApp(`/notas/${nota.id}`)

    await usuario.click(await screen.findByRole('button', { name: 'Excluir Manual' }))
    await waitFor(async () => expect(await db.attachments.count()).toBe(0))
    await usuario.click(await screen.findByRole('button', { name: 'Desfazer' }))
    await waitFor(async () => expect(await db.attachments.count()).toBe(1))
  })

  it('sem suporte a gravação, o áudio explica em vez de quebrar', async () => {
    const usuario = userEvent.setup()
    const nota = await criarNota({ titulo: 'Áudio' })
    renderizarApp(`/notas/${nota.id}`)

    await usuario.click(await screen.findByRole('button', { name: 'Áudio' }))
    expect(await screen.findByText('Este navegador não permite gravar áudio.')).toBeInTheDocument()
  })

  it('o desenho abre numa folha com cores, espessuras, borracha e desfazer', async () => {
    const usuario = userEvent.setup()
    const nota = await criarNota({ titulo: 'Desenho' })
    renderizarApp(`/notas/${nota.id}`)

    await usuario.click(await screen.findByRole('button', { name: 'Desenho' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Novo desenho' })
    expect(within(dialogo).getByRole('img', { name: 'Folha de desenho' })).toBeInTheDocument()
    expect(within(dialogo).getByRole('radiogroup', { name: 'Cor' })).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Desfazer' })).toBeDisabled()
  })
})

describe('Anotação e anexos da tarefa', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    window.localStorage.clear()
  })

  it('pelo menu, escreve a anotação e a linha passa a indicar que tem nota', async () => {
    const usuario = userEvent.setup()
    const tarefa = await criarTarefa({ titulo: 'Ligar para o banco', data: hoje() })
    renderizarApp(`/dia/${hoje()}`)

    await usuario.click(
      await screen.findByRole('button', { name: 'Mais ações para Ligar para o banco' }),
    )
    await usuario.click(await screen.findByRole('menuitem', { name: 'Anotação e anexos' }))
    const anotacao = await screen.findByLabelText('Anotação da tarefa Ligar para o banco')
    await waitFor(() => expect(anotacao).toHaveFocus())
    await usuario.type(anotacao, 'Protocolo 12345')

    // Gravação atrasada (400 ms) + IndexedDB + redesenho: com a suíte em paralelo passa de 1 s.
    expect(
      await screen.findByRole(
        'button',
        { name: 'Anotação e anexos de Ligar para o banco: tem anotação' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    const [nota] = await db.notes.toArray()
    expect(nota).toMatchObject({
      conteudo: 'Protocolo 12345',
      dono: { tipo: 'task', id: tarefa.id },
    })
  })
})
