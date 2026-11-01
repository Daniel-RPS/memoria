import { describe, expect, it } from 'vitest'
import { lerEscolhaTema, lerFundo, resolverTema, temaOposto } from '@/lib/aparencia'
import { corNaTela } from '@/lib/cores'

describe('aparência', () => {
  it('lê só valores conhecidos; o resto vira o padrão (Sistema, Aurora)', () => {
    expect(lerEscolhaTema('escuro')).toBe('escuro')
    expect(lerEscolhaTema(null)).toBe('sistema')
    expect(lerEscolhaTema('roxo')).toBe('sistema')
    expect(lerFundo('liso')).toBe('liso')
    expect(lerFundo('')).toBe('aurora')
  })

  it('Sistema resolve pelo sistema operacional; Claro e Escuro valem como estão', () => {
    expect(resolverTema('sistema', true)).toBe('escuro')
    expect(resolverTema('sistema', false)).toBe('claro')
    expect(resolverTema('claro', true)).toBe('claro')
    expect(resolverTema('escuro', false)).toBe('escuro')
    expect(temaOposto('claro')).toBe('escuro')
  })

  it('cor da categoria: a do banco no claro, clareada no escuro', () => {
    expect(corNaTela('#3366c2', 'claro')).toBe('#3366c2')
    expect(corNaTela('#3366c2', 'escuro')).toBe('#6c91d3')
    expect(corNaTela('var(--grafite)', 'escuro')).toBe('var(--grafite)')
  })
})
