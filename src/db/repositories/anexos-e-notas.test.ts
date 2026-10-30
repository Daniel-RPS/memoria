import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import {
  adicionarAnexo,
  contarAnexos,
  excluirAnexo,
  listarAnexos,
  restaurarAnexo,
} from '@/db/repositories/attachment-repository'
import {
  criarNota,
  excluirNota,
  listarNotas,
  obterNotaDoDono,
  salvarNotaDoDono,
} from '@/db/repositories/note-repository'
import {
  criarProcedimento,
  excluirProcedimento,
  salvarProcedimento,
} from '@/db/repositories/procedure-repository'
import { criarTarefa, excluirTarefa } from '@/db/repositories/task-repository'
import { esquemaLink, formatarDuracao, nomeDoLink, nomePadrao } from '@/lib/anexos'

const foto = () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })

describe('regras de anexos', () => {
  it('aceita só links http e https', () => {
    expect(esquemaLink.safeParse({ url: 'https://exemplo.com/a', nome: '' }).success).toBe(true)
    for (const url of ['javascript:alert(1)', 'data:text/html,x', 'exemplo.com', '']) {
      expect(esquemaLink.safeParse({ url, nome: '' }).success).toBe(false)
    }
  })

  it('dá nomes e durações legíveis', () => {
    expect(nomeDoLink('https://www.exemplo.com.br/caminho')).toBe('exemplo.com.br')
    expect(nomePadrao('foto', new Date(2026, 9, 30, 14, 5))).toBe('Foto de 30/10 14:05')
    expect([7, 90, 725].map(formatarDuracao)).toEqual(['0:07', '1:30', '12:05'])
  })
})

describe('anexos', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('lista por dono, em ordem, e conta sem carregar os arquivos', async () => {
    await adicionarAnexo({
      dono: { tipo: 'task', id: 't1' },
      tipo: 'foto',
      nome: 'A',
      blob: foto(),
    })
    await adicionarAnexo({
      dono: { tipo: 'task', id: 't1' },
      tipo: 'link',
      nome: 'B',
      url: 'https://exemplo.com',
    })
    await adicionarAnexo({ dono: { tipo: 'task', id: 't2' }, tipo: 'audio', nome: 'C' })

    const anexos = await listarAnexos({ tipo: 'task', id: 't1' })
    expect(anexos.map((anexo) => anexo.nome)).toEqual(['A', 'B'])
    expect(anexos[0].mime).toBe('image/png')
    expect(await contarAnexos('task', ['t1', 't2', 't3'])).toEqual(
      new Map([
        ['t1', 2],
        ['t2', 1],
      ]),
    )
  })

  it('excluir devolve o anexo e "Desfazer" o traz de volta igual', async () => {
    const anexo = await adicionarAnexo({
      dono: { tipo: 'note', id: 'n' },
      tipo: 'foto',
      nome: 'F',
      blob: foto(),
    })
    const excluido = await excluirAnexo(anexo.id)
    expect(await db.attachments.count()).toBe(0)

    await restaurarAnexo(excluido!)
    const [devolvido] = await listarAnexos({ tipo: 'note', id: 'n' })
    expect(devolvido.id).toBe(anexo.id)
    expect([...new Uint8Array(await devolvido.blob!.arrayBuffer())]).toEqual([1, 2, 3])
  })
})

describe('notas', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('a anotação da tarefa é criada, atualizada e apagada quando fica vazia', async () => {
    const dono = { tipo: 'task' as const, id: 't1' }
    await salvarNotaDoDono(dono, 'Ligar antes das 10h')
    await salvarNotaDoDono(dono, 'Ligar antes das 11h')
    expect((await obterNotaDoDono(dono))?.conteudo).toBe('Ligar antes das 11h')
    expect(await db.notes.count()).toBe(1)

    await salvarNotaDoDono(dono, '   ')
    expect(await db.notes.count()).toBe(0)
  })

  it('a lista de notas mostra só as avulsas, da mais recente para a mais antiga', async () => {
    const primeira = await criarNota({ titulo: 'Primeira' })
    await new Promise((resolve) => setTimeout(resolve, 5))
    await criarNota({ titulo: 'Segunda' })
    await salvarNotaDoDono({ tipo: 'task', id: 't' }, 'Anotação de tarefa')

    expect((await listarNotas()).map((nota) => nota.titulo)).toEqual(['Segunda', 'Primeira'])
    await excluirNota(primeira.id)
    expect(await listarNotas()).toHaveLength(1)
  })
})

describe('exclusão em cascata', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((tabela) => tabela.clear()))
  })

  it('excluir a nota apaga os anexos dela', async () => {
    const nota = await criarNota({ titulo: 'Com foto' })
    await adicionarAnexo({
      dono: { tipo: 'note', id: nota.id },
      tipo: 'foto',
      nome: 'F',
      blob: foto(),
    })
    await excluirNota(nota.id)
    expect(await db.attachments.count()).toBe(0)
  })

  it('excluir a tarefa apaga anotação e anexos dela, e só dela', async () => {
    const tarefa = await criarTarefa({ titulo: 'Com anexos', data: '2026-10-30' })
    const outra = await criarTarefa({ titulo: 'Outra', data: '2026-10-30' })
    await salvarNotaDoDono({ tipo: 'task', id: tarefa.id }, 'texto')
    await adicionarAnexo({ dono: { tipo: 'task', id: tarefa.id }, tipo: 'foto', nome: 'F' })
    await adicionarAnexo({ dono: { tipo: 'task', id: outra.id }, tipo: 'foto', nome: 'G' })

    await excluirTarefa(tarefa.id)

    expect(await db.notes.count()).toBe(0)
    expect((await db.attachments.toArray()).map((anexo) => anexo.nome)).toEqual(['G'])
  })

  it('excluir o procedimento apaga os anexos dele e dos passos de todas as versões', async () => {
    const procedimento = await criarProcedimento({
      titulo: 'P',
      descricao: '',
      camposVariaveis: [],
      secoes: [
        { id: 's', titulo: 'S', passos: [{ id: 'antigo', texto: 'x', anexos: [], subpassos: [] }] },
      ],
    })
    await salvarProcedimento(procedimento.id, {
      ...procedimento,
      secoes: [
        { id: 's', titulo: 'S', passos: [{ id: 'novo', texto: 'y', anexos: [], subpassos: [] }] },
      ],
    })
    await adicionarAnexo({
      dono: { tipo: 'procedure', id: procedimento.id },
      tipo: 'foto',
      nome: 'P',
    })
    await adicionarAnexo({ dono: { tipo: 'step', id: 'antigo' }, tipo: 'foto', nome: 'A' })
    await adicionarAnexo({ dono: { tipo: 'step', id: 'novo' }, tipo: 'foto', nome: 'N' })
    await adicionarAnexo({ dono: { tipo: 'step', id: 'de-outro' }, tipo: 'foto', nome: 'O' })

    await excluirProcedimento(procedimento.id)

    expect((await db.attachments.toArray()).map((anexo) => anexo.nome)).toEqual(['O'])
  })
})
