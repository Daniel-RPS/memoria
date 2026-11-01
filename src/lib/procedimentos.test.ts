import { describe, expect, it } from 'vitest'
import type { Procedure } from '@/db/types'
import { converterProcedimentoAntigo } from '@/lib/migracao-procedimentos'
import {
  agruparPorCategoria,
  buscarProcedimentos,
  etapasEmOrdem,
  numerarEtapas,
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

describe('agruparPorCategoria', () => {
  it('um bloco por categoria, na ordem das categorias, e "Sem categoria" no fim', () => {
    const blocos = agruparPorCategoria(
      [
        procedimento('1', 'Solto'),
        procedimento('2', 'Relatório', { categoryId: 'trabalho' }),
        procedimento('3', 'Regar', { categoryId: 'casa' }),
        procedimento('4', 'Limpar calhas', { categoryId: 'casa' }),
      ],
      [casa, trabalho],
    )
    expect(
      blocos.map((bloco) => [
        bloco.categoria?.nome ?? 'Sem categoria',
        bloco.procedimentos.map((item) => item.id),
      ]),
    ).toEqual([
      ['Casa', ['3', '4']],
      ['Trabalho', ['2']],
      ['Sem categoria', ['1']],
    ])
    expect(blocos[0].categoria?.cor).toBe('#2f7d4f')
  })

  it('não mostra bloco vazio, nem "Sem categoria" quando todos têm categoria', () => {
    const blocos = agruparPorCategoria(
      [procedimento('1', 'Relatório', { categoryId: 'trabalho' })],
      [casa, trabalho],
    )
    expect(blocos.map((bloco) => bloco.categoria?.id)).toEqual(['trabalho'])
  })

  it('categoria que não existe mais vai para "Sem categoria"', () => {
    const blocos = agruparPorCategoria(
      [procedimento('1', 'Órfão', { categoryId: 'apagada' })],
      [casa],
    )
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
