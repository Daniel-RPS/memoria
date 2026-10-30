import { describe, expect, it } from 'vitest'
import { colunaDe, moverEntreColunas } from '@/lib/quadro'

const colunas = { seg: ['a', 'b'], ter: ['c'], qua: [] }

describe('moverEntreColunas', () => {
  it('leva o item para outra coluna na posição pedida', () => {
    expect(moverEntreColunas(colunas, 'a', 'ter', 0)).toEqual({
      seg: ['b'],
      ter: ['a', 'c'],
      qua: [],
    })
  })

  it('sem posição, entra no fim (inclusive em coluna vazia)', () => {
    expect(moverEntreColunas(colunas, 'b', 'qua')).toEqual({ seg: ['a'], ter: ['c'], qua: ['b'] })
  })

  it('reordena dentro da mesma coluna', () => {
    expect(moverEntreColunas(colunas, 'a', 'seg', 1).seg).toEqual(['b', 'a'])
  })

  it('não altera o objeto original e ignora item desconhecido', () => {
    moverEntreColunas(colunas, 'a', 'ter', 0)
    expect(colunas.seg).toEqual(['a', 'b'])
    expect(moverEntreColunas(colunas, 'x', 'ter')).toBe(colunas)
  })

  it('colunaDe encontra a coluna do item', () => {
    expect(colunaDe(colunas, 'c')).toBe('ter')
    expect(colunaDe(colunas, 'x')).toBeUndefined()
  })
})
