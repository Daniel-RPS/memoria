import { describe, expect, it } from 'vitest'
import {
  alternarSecao,
  definirGruposAbertos,
  isGrupoAberto,
  isSecaoRecolhida,
  LAYOUT_VAZIO,
  lerLayoutDoDia,
  podarGrupos,
  serializarLayoutDoDia,
} from '@/lib/layout-do-dia'

describe('layout do dia (regras puras)', () => {
  it('sem nada salvo, seções abertas e grupos recolhidos', () => {
    const layout = lerLayoutDoDia(null)
    expect(isSecaoRecolhida(layout, 'grupos')).toBe(false)
    expect(isSecaoRecolhida(layout, 'soltas')).toBe(false)
    expect(isGrupoAberto(layout, 'serie-1')).toBe(false)
  })

  it('texto quebrado ou de outra forma volta ao padrão', () => {
    expect(lerLayoutDoDia('{não é json')).toEqual(LAYOUT_VAZIO)
    expect(lerLayoutDoDia('[]')).toEqual(LAYOUT_VAZIO)
    expect(
      lerLayoutDoDia(JSON.stringify({ secoesRecolhidas: ['outra'], gruposAbertos: 3 })),
    ).toEqual(LAYOUT_VAZIO)
  })

  it('salva e restaura seções recolhidas e grupos abertos', () => {
    let layout = alternarSecao(LAYOUT_VAZIO, 'soltas')
    layout = definirGruposAbertos(layout, ['simulador-poose'], true)
    const restaurado = lerLayoutDoDia(serializarLayoutDoDia(layout))
    expect(isSecaoRecolhida(restaurado, 'soltas')).toBe(true)
    expect(isSecaoRecolhida(restaurado, 'grupos')).toBe(false)
    expect(isGrupoAberto(restaurado, 'simulador-poose')).toBe(true)
    expect(isGrupoAberto(restaurado, 'outro')).toBe(false)
  })

  it('alternar a seção duas vezes volta ao que era', () => {
    const duas = alternarSecao(alternarSecao(LAYOUT_VAZIO, 'grupos'), 'grupos')
    expect(duas).toEqual(LAYOUT_VAZIO)
  })

  it('abrir e recolher grupos; sem mudança devolve o mesmo objeto', () => {
    const aberto = definirGruposAbertos(LAYOUT_VAZIO, ['a', 'b'], true)
    expect(aberto.gruposAbertos).toEqual(['a', 'b'])
    expect(definirGruposAbertos(aberto, ['a'], true)).toBe(aberto)
    expect(definirGruposAbertos(aberto, ['c'], false)).toBe(aberto)
    expect(definirGruposAbertos(aberto, ['a'], false).gruposAbertos).toEqual(['b'])
  })

  it('esquece os grupos que não existem mais', () => {
    const layout = definirGruposAbertos(LAYOUT_VAZIO, ['a', 'b', 'c'], true)
    expect(podarGrupos(layout, ['a', 'c', 'x']).gruposAbertos).toEqual(['a', 'c'])
    expect(podarGrupos(layout, ['a', 'b', 'c'])).toBe(layout)
    expect(podarGrupos(layout, []).gruposAbertos).toEqual([])
  })
})
