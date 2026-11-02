import { describe, expect, it } from 'vitest'
import { contraste, corDeTraco, corNaTela } from '@/lib/cores'

describe('corDeTraco (faixa e barra de progresso)', () => {
  it('cor que já aparece no papel fica como na tela', () => {
    expect(corDeTraco('#3366c2', 'claro')).toBe('#3366c2')
    expect(corDeTraco('#3366c2', 'escuro')).toBe(corNaTela('#3366c2', 'escuro'))
  })

  it('cor clara no tema claro escurece até 3:1 sobre o papel branco', () => {
    const cor = corDeTraco('#f2c94c', 'claro')
    expect(cor).not.toBe('#f2c94c')
    expect(contraste(cor, '#ffffff')).toBeGreaterThanOrEqual(3)
  })

  it('cor escura no tema escuro clareia até 3:1 sobre o papel escuro', () => {
    expect(contraste(corDeTraco('#20202a', 'escuro'), '#19161f')).toBeGreaterThanOrEqual(3)
  })
})
