import { describe, expect, it } from 'vitest'
import type { Procedure } from '@/db/types'
import { converterProcedimentoAntigo } from '@/lib/migracao-procedimentos'
import {
  buscarProcedimentos,
  montarBlocosDeProcedimentos,
  etapasEmOrdem,
  numerarEtapas,
  previaDoProcedimento,
} from '@/lib/procedimentos'

function procedimento(id: string, titulo: string, extras: Partial<Procedure> = {}): Procedure {
  return { id, titulo, etapas: [], criadoEm: '', atualizadoEm: '', ...extras }
}

const casa = { id: 'casa', nome: 'Casa', cor: '#2f7d4f' }
const trabalho = { id: 'trabalho', nome: 'Trabalho', cor: '#3366cc' }

describe('buscarProcedimentos', () => {
  const backup = procedimento('b', 'Backup do notebook', {
    etapas: [{ id: 'e', texto: 'Conectar o disco externo', ordem: 0 }],
  })
  const certificado = procedimento('c', 'Renovar certificado', {
    etapas: [{ id: 'f', texto: 'Gerar a requisição de backup', ordem: 0 }],
  })
  const lista = [certificado, backup]

  it('sem termo, devolve todos em ordem de título', () => {
    expect(buscarProcedimentos(lista, '  ').map((item) => item.id)).toEqual(['b', 'c'])
  })

  it('encontra pelo título, sem diferenciar acento e maiúscula', () => {
    expect(buscarProcedimentos(lista, 'CERTIFICADO').map((item) => item.id)).toEqual(['c'])
  })

  it('encontra pelo texto de uma etapa', () => {
    expect(buscarProcedimentos(lista, 'disco externo').map((item) => item.id)).toEqual(['b'])
    expect(buscarProcedimentos(lista, 'requisicao').map((item) => item.id)).toEqual(['c'])
  })

  it('quem tem o termo no título vem antes de quem só tem na etapa', () => {
    expect(buscarProcedimentos(lista, 'backup').map((item) => item.id)).toEqual(['b', 'c'])
  })

  it('não encontra o que não está no título nem nas etapas', () => {
    expect(buscarProcedimentos(lista, 'impressora')).toEqual([])
  })
})

describe('montarBlocosDeProcedimentos', () => {
  const resumo = (blocos: ReturnType<typeof montarBlocosDeProcedimentos>['blocos']) =>
    blocos.map((bloco) => [
      bloco.categoria?.nome ?? 'Sem categoria',
      bloco.procedimentos.map((item) => item.id),
    ])

  it('toda categoria vira bloco, na ordem das categorias, e "Sem categoria" no fim', () => {
    const todos = [
      procedimento('1', 'Solto'),
      procedimento('2', 'Relatório', { categoryId: 'trabalho' }),
      procedimento('3', 'Regar', { categoryId: 'casa' }),
      procedimento('4', 'Limpar calhas', { categoryId: 'casa' }),
    ]
    const { blocos } = montarBlocosDeProcedimentos([casa, trabalho], todos, todos, false)
    expect(resumo(blocos)).toEqual([
      ['Casa', ['3', '4']],
      ['Trabalho', ['2']],
      ['Sem categoria', ['1']],
    ])
    expect(blocos[0].categoria?.cor).toBe('#2f7d4f')
  })

  it('categorias vazias aparecem na ordem; "Sem categoria" só com itens', () => {
    const todos = [procedimento('1', 'Relatório', { categoryId: 'trabalho' })]
    const resultado = montarBlocosDeProcedimentos([trabalho, casa], todos, todos, false)
    expect(resumo(resultado.blocos)).toEqual([
      ['Trabalho', ['1']],
      ['Casa', []],
    ])
    expect(resultado).toMatchObject({ isVazia: false, isSemResultado: false })
  })

  it('só categorias, sem nenhum procedimento: blocos vazios, sem o convite grande', () => {
    const resultado = montarBlocosDeProcedimentos([casa, trabalho], [], [], false)
    expect(resumo(resultado.blocos)).toEqual([
      ['Casa', []],
      ['Trabalho', []],
    ])
    expect(resultado.isVazia).toBe(false)
  })

  it('convite grande só sem procedimentos e sem categorias', () => {
    expect(montarBlocosDeProcedimentos([], [], [], false)).toEqual({
      blocos: [],
      isVazia: true,
      isSemResultado: false,
    })
    const solto = [procedimento('1', 'Solto')]
    expect(montarBlocosDeProcedimentos([], solto, solto, false).isVazia).toBe(false)
  })

  it('com busca ou filtro, blocos sem resultado somem (os vazios também)', () => {
    const todos = [
      procedimento('1', 'Relatório', { categoryId: 'trabalho' }),
      procedimento('2', 'Regar', { categoryId: 'casa' }),
    ]
    const resultado = montarBlocosDeProcedimentos([casa, trabalho], todos, [todos[0]], true)
    expect(resumo(resultado.blocos)).toEqual([['Trabalho', ['1']]])
    const nada = montarBlocosDeProcedimentos([casa, trabalho], todos, [], true)
    expect(nada).toEqual({ blocos: [], isVazia: false, isSemResultado: true })
  })

  it('categoria que não existe mais vai para "Sem categoria"', () => {
    const orfao = [procedimento('1', 'Órfão', { categoryId: 'apagada' })]
    const { blocos } = montarBlocosDeProcedimentos([], orfao, orfao, false)
    expect(blocos).toEqual([
      { categoria: null, procedimentos: [expect.objectContaining({ id: '1' })] },
    ])
  })
})

describe('etapas', () => {
  it('numerarEtapas grava a posição na ordem', () => {
    expect(
      numerarEtapas([
        { id: 'b', texto: 'Segunda' },
        { id: 'c', texto: 'Terceira' },
      ]),
    ).toEqual([
      { id: 'b', texto: 'Segunda', ordem: 0 },
      { id: 'c', texto: 'Terceira', ordem: 1 },
    ])
  })

  it('etapasEmOrdem ordena pela ordem gravada', () => {
    const etapas = [
      { id: 'b', texto: 'B', ordem: 1 },
      { id: 'a', texto: 'A', ordem: 0 },
    ]
    expect(etapasEmOrdem({ etapas }).map((etapa) => etapa.id)).toEqual(['a', 'b'])
  })
})

describe('converterProcedimentoAntigo', () => {
  it('mantém título, categoria e datas; passos de todas as seções viram etapas na ordem', () => {
    const convertido = converterProcedimentoAntigo({
      id: 'p',
      titulo: 'Renovar certificado',
      categoryId: 'trabalho',
      criadoEm: '2026-01-01T10:00:00.000Z',
      atualizadoEm: '2026-02-01T10:00:00.000Z',
      secoes: [
        {
          passos: [
            { id: 'p1', texto: 'Gerar CSR', subpassos: [{ id: 's1', texto: 'Usar 4096 bits' }] },
            { id: 'p2', texto: 'Enviar à autoridade', subpassos: [] },
          ],
        },
        { passos: [{ id: 'p3', texto: 'Instalar no servidor' }] },
      ],
    })
    expect(convertido).toEqual({
      id: 'p',
      titulo: 'Renovar certificado',
      categoryId: 'trabalho',
      criadoEm: '2026-01-01T10:00:00.000Z',
      atualizadoEm: '2026-02-01T10:00:00.000Z',
      etapas: [
        { id: 'p1', texto: 'Gerar CSR', ordem: 0 },
        { id: 's1', texto: 'Usar 4096 bits', ordem: 1 },
        { id: 'p2', texto: 'Enviar à autoridade', ordem: 2 },
        { id: 'p3', texto: 'Instalar no servidor', ordem: 3 },
      ],
    })
  })

  it('sem categoria continua sem categoria', () => {
    const convertido = converterProcedimentoAntigo({
      id: 'p',
      titulo: 'Solto',
      criadoEm: '',
      atualizadoEm: '',
      secoes: [],
    })
    expect(convertido).not.toHaveProperty('categoryId')
    expect(convertido.etapas).toEqual([])
  })
})

describe('previaDoProcedimento', () => {
  const etapas = (...textos: string[]) =>
    textos.map((texto, ordem) => ({ id: `e${ordem}`, texto, ordem }))

  it('traz no máximo 3 etapas, na ordem, numeradas, e "+ N etapas" com o resto', () => {
    const fora = etapas('A', 'B', 'C', 'D', 'E', 'F', 'G').reverse()
    const previa = previaDoProcedimento(procedimento('p', 'Fechamento', { etapas: fora }))

    expect(previa.etapas).toEqual(['1. A', '2. B', '3. C'])
    expect(previa.restantes).toBe('+ 4 etapas')
    expect(previa.total).toBe('7 etapas')
    expect(previa.isVazio).toBe(false)
  })

  it('"+ 1 etapa" no singular e nada a mais com 3 ou menos', () => {
    expect(
      previaDoProcedimento(procedimento('p', 'X', { etapas: etapas('A', 'B', 'C', 'D') }))
        .restantes,
    ).toBe('+ 1 etapa')
    const tres = previaDoProcedimento(procedimento('p', 'X', { etapas: etapas('A', 'B', 'C') }))
    expect(tres.restantes).toBeUndefined()
    expect(tres.etapas).toHaveLength(3)
    expect(previaDoProcedimento(procedimento('p', 'X', { etapas: etapas('A') })).total).toBe(
      '1 etapa',
    )
  })

  it('sem etapas: prévia vazia e marcada como vazia', () => {
    const previa = previaDoProcedimento(procedimento('p', 'Regar'))
    expect(previa).toMatchObject({ etapas: [], total: '0 etapas', isVazio: true })
    expect(previa.restantes).toBeUndefined()
  })

  it('etapa em branco aparece como "Etapa sem texto"', () => {
    expect(
      previaDoProcedimento(procedimento('p', 'X', { etapas: etapas('  ', 'B') })).etapas,
    ).toEqual(['1. Etapa sem texto', '2. B'])
  })

  it('datas pelo dia local; sem data, nada', () => {
    // 01:30 UTC de 02/11 = 22:30 de 01/11 em São Paulo.
    expect(
      previaDoProcedimento(procedimento('p', 'X', { atualizadoEm: '2026-11-02T01:30:00.000Z' }))
        .datas,
    ).toBe('editado em 01/11')
    expect(previaDoProcedimento(procedimento('p', 'X')).datas).toBeUndefined()
  })

  it('"criado em" sempre; "editado em" só quando o dia é outro', () => {
    const mesmoDia = previaDoProcedimento(
      procedimento('p', 'X', {
        criadoEm: '2026-11-01T12:00:00.000Z',
        atualizadoEm: '2026-11-02T01:30:00.000Z', // 22:30 de 01/11 local
      }),
    )
    expect(mesmoDia.datas).toBe('criado em 01/11')
    const outroDia = previaDoProcedimento(
      procedimento('p', 'X', {
        criadoEm: '2026-11-01T12:00:00.000Z',
        atualizadoEm: '2026-11-02T12:00:00.000Z',
      }),
    )
    expect(outroDia.datas).toBe('criado 01/11 · editado 02/11')
  })
})
