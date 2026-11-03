import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  CHAVE_LAYOUT_DO_DIA,
  podarGruposEsquecidos,
  useLayoutDoDia,
} from '@/hooks/use-layout-do-dia'

describe('useLayoutDoDia', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('salva e restaura as seções recolhidas e os grupos abertos', () => {
    const primeira = renderHook(() => useLayoutDoDia())
    act(() => primeira.result.current.handleAlternarSecao('soltas'))
    act(() => primeira.result.current.handleDefinirGrupos(['simulador-poose'], true))
    expect(primeira.result.current.isSecaoRecolhida('soltas')).toBe(true)
    primeira.unmount()

    // Outra visita (ou recarregar a página): lê do navegador.
    expect(JSON.parse(localStorage.getItem(CHAVE_LAYOUT_DO_DIA)!)).toEqual({
      secoesRecolhidas: ['soltas'],
      gruposAbertos: ['simulador-poose'],
    })
    const segunda = renderHook(() => useLayoutDoDia())
    expect(segunda.result.current.isSecaoRecolhida('soltas')).toBe(true)
    expect(segunda.result.current.isSecaoRecolhida('grupos')).toBe(false)
    expect(segunda.result.current.isGrupoAberto('simulador-poose')).toBe(true)
    expect(segunda.result.current.isGrupoAberto('outro')).toBe(false)
  })

  it('duas telas lendo o mesmo estado se mantêm em dia', () => {
    const dia = renderHook(() => useLayoutDoDia())
    const semana = renderHook(() => useLayoutDoDia())
    act(() => dia.result.current.handleDefinirGrupos(['casa'], true))
    expect(semana.result.current.isGrupoAberto('casa')).toBe(true)
  })

  it('esquece os grupos excluídos para não acumular lixo', () => {
    const tela = renderHook(() => useLayoutDoDia())
    act(() => tela.result.current.handleDefinirGrupos(['a', 'b'], true))
    act(() => podarGruposEsquecidos(['a']))
    expect(tela.result.current.isGrupoAberto('a')).toBe(true)
    expect(tela.result.current.isGrupoAberto('b')).toBe(false)
    expect(JSON.parse(localStorage.getItem(CHAVE_LAYOUT_DO_DIA)!).gruposAbertos).toEqual(['a'])
  })

  it('com o texto guardado quebrado, volta ao padrão sem erro', () => {
    localStorage.setItem(CHAVE_LAYOUT_DO_DIA, '{quebrado')
    const tela = renderHook(() => useLayoutDoDia())
    expect(tela.result.current.isSecaoRecolhida('grupos')).toBe(false)
    expect(tela.result.current.isGrupoAberto('a')).toBe(false)
  })
})
