import { describe, expect, it } from 'vitest'
import {
  contraste,
  corDeTraco,
  corNaTela,
  coresRecentes,
  hexParaHsv,
  hsvParaHex,
  lerHex,
  temasComPoucoContraste,
} from '@/lib/cores'

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

describe('lerHex (campo do misturador)', () => {
  it('aceita com e sem #, maiúsculas e espaços, e devolve #rrggbb minúsculo', () => {
    expect(lerHex('#3b82f6')).toBe('#3b82f6')
    expect(lerHex('3b82f6')).toBe('#3b82f6')
    expect(lerHex('#3B82F6')).toBe('#3b82f6')
    expect(lerHex('  3B82F6 ')).toBe('#3b82f6')
  })

  it('recusa o que não é uma cor de 6 dígitos', () => {
    for (const invalido of ['', '#', '#fff', '3b82f', '#3b82f6a', '#3b82g6', '##3b82f6', 'azul']) {
      expect(lerHex(invalido)).toBeNull()
    }
  })
})

describe('HSV (área e barra de matiz)', () => {
  it('vai e volta sem mudar a cor', () => {
    for (const hex of ['#3b82f6', '#c8402f', '#000000', '#ffffff', '#808080', '#2f8a57']) {
      expect(hsvParaHex(hexParaHsv(hex))).toBe(hex)
    }
  })

  it('cores puras caem nos cantos esperados', () => {
    expect(hexParaHsv('#ff0000')).toEqual({ matiz: 0, saturacao: 1, brilho: 1 })
    expect(hexParaHsv('#0000ff')).toEqual({ matiz: 240, saturacao: 1, brilho: 1 })
    expect(hsvParaHex({ matiz: 120, saturacao: 1, brilho: 1 })).toBe('#00ff00')
    expect(hsvParaHex({ matiz: 300, saturacao: 0, brilho: 0 })).toBe('#000000')
  })
})

describe('temasComPoucoContraste (aviso do misturador)', () => {
  it('quase preta avisa no escuro; quase branca, no claro; azul médio, em nenhum', () => {
    expect(temasComPoucoContraste('#0a0a0a')).toEqual(['escuro'])
    expect(temasComPoucoContraste('#f5f5f5')).toEqual(['claro'])
    expect(temasComPoucoContraste('#3366c2')).toEqual([])
  })
})

describe('coresRecentes', () => {
  it('só personalizadas, da mais recente para a mais antiga, sem repetir e no máximo 6', () => {
    const itens = [
      { cor: '#111111', atualizadoEm: '1' },
      { cor: '#3366c2', atualizadoEm: '9' }, // da paleta
      { cor: '#AA0000', atualizadoEm: '8' },
      { cor: '#aa0000', atualizadoEm: '7' },
      { atualizadoEm: '6' }, // subcategoria no tom automático
      ...['#000001', '#000002', '#000003', '#000004', '#000005'].map((cor, indice) => ({
        cor,
        atualizadoEm: `5${indice}`,
      })),
    ]
    expect(coresRecentes(itens)).toEqual([
      '#aa0000',
      '#000005',
      '#000004',
      '#000003',
      '#000002',
      '#000001',
    ])
  })
})
