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

    await router.navigate('/notas')
    const lista = await screen.findByRole('region', { name: 'Lista de notas' })
    expect(await within(lista).findByText('Ideias para a casa')).toBeInTheDocument()
    expect(within(lista).getByText('Pintar a varanda')).toBeInTheDocument()
  })

  it('não perde o texto ao sair logo depois de digitar', async () => {
    const usuario = userEvent.setup()
    const nota = await criarNota()
    const router = renderizarApp(`/notas/${nota.id}`)

    await usuario.type(await screen.findByLabelText('Texto da nota'), 'Última frase')
    // Sai antes do atraso de gravação terminar.
    await router.navigate('/notas')

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

describe('Notas ligadas pelo menu ⋯', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
    window.localStorage.clear()
  })

  it('"Adicionar nota" abre a gaveta, salva ligada à tarefa e a linha mostra o ícone', async () => {
    const usuario = userEvent.setup()
    const tarefa = await criarTarefa({ titulo: 'Ligar para o banco', data: hoje() })
    renderizarApp(`/dia/${hoje()}`)

    await usuario.click(
      await screen.findByRole('button', { name: 'Mais ações para Ligar para o banco' }),
    )
    await usuario.click(await screen.findByRole('menuitem', { name: 'Adicionar nota' }))
    const gaveta = await screen.findByRole('dialog', { name: 'Notas' })
    expect((await within(gaveta).findAllByText('Ligar para o banco')).length).toBeGreaterThan(0)
    const texto = within(gaveta).getByLabelText('Texto da nota')
    await waitFor(() => expect(texto).toHaveFocus())
    await usuario.type(texto, 'Protocolo 12345')
    expect(await within(gaveta).findByText('Salvo')).toBeInTheDocument()
    // Com a gaveta aberta o resto da tela fica fora do alcance (modal); fecha para conferir.
    await usuario.keyboard('{Escape}')

    expect(
      await screen.findByRole('button', { name: 'Notas de Ligar para o banco: 1 nota' }),
    ).toBeInTheDocument()
    const [nota] = await db.notes.toArray()
    expect(nota).toMatchObject({
      conteudo: 'Protocolo 12345',
      vinculo: { tipo: 'tarefa', id: tarefa.id },
    })
  })

  it('fechar a gaveta sem escrever não deixa nota vazia', async () => {
    const usuario = userEvent.setup()
    await criarTarefa({ titulo: 'Pagar luz', data: hoje() })
    renderizarApp(`/dia/${hoje()}`)

    await usuario.click(await screen.findByRole('button', { name: 'Mais ações para Pagar luz' }))
    await usuario.click(await screen.findByRole('menuitem', { name: 'Adicionar nota' }))
    await screen.findByRole('dialog', { name: 'Notas' })
    await waitFor(async () => expect(await db.notes.count()).toBe(1))
    await usuario.keyboard('{Escape}')
    await waitFor(async () => expect(await db.notes.count()).toBe(0))
  })

  it('na aba Notas, o cartão diz a quem a nota pertence', async () => {
    const tarefa = await criarTarefa({ titulo: 'Ligar para Fulano', data: hoje() })
    await criarNota({ conteudo: 'Número novo', vinculo: { tipo: 'tarefa', id: tarefa.id } })
    await criarNota({ titulo: 'Ideias' })
    renderizarApp('/notas')

    const lista = await screen.findByRole('region', { name: 'Lista de notas' })
    const ligada = await within(lista).findByRole('article', { name: 'Número novo' })
    expect(within(ligada).getByRole('link', { name: /Ligar para Fulano/ })).toHaveAttribute(
      'href',
      `/dia/${hoje()}`,
    )
    const avulsas = within(lista).getByRole('region', { name: 'Notas avulsas' })
    expect(within(avulsas).getByText('Nota avulsa')).toBeInTheDocument()
  })
})
