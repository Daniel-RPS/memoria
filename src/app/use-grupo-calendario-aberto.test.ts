import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAVE_GRUPO_CALENDARIO, useGrupoCalendarioAberto } from '@/app/use-grupo-calendario-aberto'

describe('useGrupoCalendarioAberto', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('sem nada salvo, começa aberto', () => {
    const { result } = renderHook(() => useGrupoCalendarioAberto(false))
    expect(result.current.isAberto).toBe(true)
  })

  it('lembra o fechado entre sessões', () => {
    const primeira = renderHook(() => useGrupoCalendarioAberto(false))
    act(() => primeira.result.current.handleAlternar())
    expect(primeira.result.current.isAberto).toBe(false)
    expect(localStorage.getItem(CHAVE_GRUPO_CALENDARIO)).toBe('false')
    primeira.unmount()

    const segunda = renderHook(() => useGrupoCalendarioAberto(false))
    expect(segunda.result.current.isAberto).toBe(false)
    act(() => segunda.result.current.handleAlternar())
    expect(localStorage.getItem(CHAVE_GRUPO_CALENDARIO)).toBe('true')
  })

  it('numa visão do calendário começa aberto mesmo com fechado salvo', () => {
    localStorage.setItem(CHAVE_GRUPO_CALENDARIO, 'false')
    const { result } = renderHook(() => useGrupoCalendarioAberto(true))
    expect(result.current.isAberto).toBe(true)
  })

  it('abre sozinho ao entrar numa visão do calendário', () => {
    const { result, rerender } = renderHook(
      ({ isNoCalendario }) => useGrupoCalendarioAberto(isNoCalendario),
      { initialProps: { isNoCalendario: false } },
    )
    act(() => result.current.handleAlternar())
    expect(result.current.isAberto).toBe(false)

    rerender({ isNoCalendario: true })
    expect(result.current.isAberto).toBe(true)
  })

  it('sem acesso ao armazenamento, funciona sem lembrar', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    const { result } = renderHook(() => useGrupoCalendarioAberto(false))
    expect(result.current.isAberto).toBe(true)
    act(() => result.current.handleAlternar())
    expect(result.current.isAberto).toBe(false)
  })
})
