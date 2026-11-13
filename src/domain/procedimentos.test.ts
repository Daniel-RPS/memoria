import { describe, expect, it } from 'vitest'
import {
  ordemNoFimDaCategoria,
  planejarMoverProcedimento,
  planejarReordenarProcedimentos,
  preencherOrdemDosProcedimentos,
  procedimentosDoBloco,
  rotuloDaEtapa,
} from '@/domain/procedimentos'

describe('rotuloDaEtapa', () => {
  it('usa o padrão automático "Etapa N" quando não há rótulo personalizado', () => {
    expect(rotuloDaEtapa(1)).toBe('Etapa 1')
    expect(rotuloDaEtapa(5)).toBe('Etapa 5')
    expect(rotuloDaEtapa(2, undefined)).toBe('Etapa 2')
    expect(rotuloDaEtapa(3, null)).toBe('Etapa 3')
  })

  it('usa o rótulo personalizado quando preenchido', () => {
    expect(rotuloDaEtapa(1, 'Segunda-feira')).toBe('Segunda-feira')
    expect(rotuloDaEtapa(2, 'Backup')).toBe('Backup')
  })

  it('vazio ou só espaços volta ao padrão "Etapa N"', () => {
    expect(rotuloDaEtapa(1, '')).toBe('Etapa 1')
    expect(rotuloDaEtapa(4, '   ')).toBe('Etapa 4')
  })
})

const p = (id: string, ordem: number, categoryId?: string) => ({
  id,
  titulo: id,
  ordem,
  ...(categoryId && { categoryId }),
})

/** Aplica as mudanças planejadas e devolve os ids do bloco na nova ordem. */
function aplicar(lista: ReturnType<typeof p>[], id: string, direcao: 'cima' | 'baixo') {
  const mudancas = planejarMoverProcedimento(lista, id, direcao)
  if (!mudancas) return null
  const nova = lista.map((item) => {
    const mudanca = mudancas.find((m) => m.id === item.id)
    return mudanca ? { ...item, ordem: mudanca.ordem } : item
  })
  return procedimentosDoBloco(nova, id).map((item) => item.id)
}

describe('planejarMoverProcedimento', () => {
  const lista = [p('a', 1, 'casa'), p('b', 2, 'casa'), p('c', 3, 'casa'), p('x', 1.5, 'trabalho')]

  it('sobe e desce uma posição dentro da categoria, sem mexer na outra', () => {
    expect(aplicar(lista, 'b', 'cima')).toEqual(['b', 'a', 'c'])
    expect(aplicar(lista, 'b', 'baixo')).toEqual(['a', 'c', 'b'])
    expect(aplicar(lista, 'x', 'cima')).toBeNull()
  })

  it('primeiro não sobe, último não desce', () => {
    expect(planejarMoverProcedimento(lista, 'a', 'cima')).toBeNull()
    expect(planejarMoverProcedimento(lista, 'c', 'baixo')).toBeNull()
    expect(planejarMoverProcedimento(lista, 'nao-existe', 'baixo')).toBeNull()
  })

  it('só o movido muda quando há espaço; ordens iguais renumeram o bloco', () => {
    expect(planejarMoverProcedimento(lista, 'c', 'cima')).toEqual([{ id: 'c', ordem: 1.5 }])
    const empatados = [p('a', 1), p('b', 1), p('c', 1)]
    expect(aplicar(empatados, 'c', 'cima')).toEqual(['a', 'c', 'b'])
  })
})

describe('planejarReordenarProcedimentos (arrastar)', () => {
  const bloco = [p('a', 1), p('b', 2), p('c', 3)]

  it('o arrastado fica entre os novos vizinhos; só ele muda', () => {
    expect(planejarReordenarProcedimentos(bloco, ['b', 'c', 'a'], 'a')).toEqual([
      { id: 'a', ordem: 4 },
    ])
    expect(planejarReordenarProcedimentos(bloco, ['c', 'a', 'b'], 'c')).toEqual([
      { id: 'c', ordem: 0 },
    ])
    expect(planejarReordenarProcedimentos(bloco, ['a', 'c', 'b'], 'c')).toEqual([
      { id: 'c', ordem: 1.5 },
    ])
  })

  it('sem espaço entre os vizinhos, renumera o bloco; id fora da lista não grava', () => {
    const empatados = [p('a', 1), p('b', 1), p('c', 1)]
    expect(planejarReordenarProcedimentos(empatados, ['a', 'c', 'b'], 'c')).toEqual([
      { id: 'a', ordem: 1 },
      { id: 'c', ordem: 2 },
      { id: 'b', ordem: 3 },
    ])
    expect(planejarReordenarProcedimentos(bloco, ['a', 'b'], 'x')).toBeNull()
  })
})

describe('ordemNoFimDaCategoria', () => {
  const lista = [p('a', 1, 'casa'), p('b', 7, 'casa'), p('s', 4)]

  it('novo entra depois do último da categoria (ou 1 na categoria vazia)', () => {
    expect(ordemNoFimDaCategoria(lista, 'casa')).toBe(8)
    expect(ordemNoFimDaCategoria(lista, undefined)).toBe(5)
    expect(ordemNoFimDaCategoria(lista, 'vazia')).toBe(1)
  })

  it('ao trocar de categoria vai para o fim da nova, ignorando a si mesmo', () => {
    expect(ordemNoFimDaCategoria(lista, 'casa', 'b')).toBe(2)
  })
})

describe('preencherOrdemDosProcedimentos', () => {
  it('sem ordem (banco/backup antigo): pelo título, como os cartões apareciam', () => {
    const preenchidos = preencherOrdemDosProcedimentos([
      { id: '1', titulo: 'Zelar' },
      { id: '2', titulo: 'Abrir' },
      { id: '3', titulo: 'Montar', ordem: 3 },
    ])
    expect(preenchidos.map((item) => [item.id, item.ordem])).toEqual([
      ['1', 5],
      ['2', 4],
      ['3', 3],
    ])
  })
})
