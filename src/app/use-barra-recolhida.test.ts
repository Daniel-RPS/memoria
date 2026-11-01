import { act, fireEvent, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAVE_BARRA_RECOLHIDA, useBarraRecolhida } from '@/app/use-barra-recolhida'

describe('useBarraRecolhida', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('sem nada salvo, começa expandida', () => {
    const { result } = renderHook(() => useBarraRecolhida())
    expect(result.current.isRecolhida).toBe(false)
  })

  it('lembra recolhida/expandida entre sessões', () => {
    const primeira = renderHook(() => useBarraRecolhida())
    act(() => primeira.result.current.handleAlternar())
    expect(primeira.result.current.isRecolhida).toBe(true)
    expect(localStorage.getItem(CHAVE_BARRA_RECOLHIDA)).toBe('true')
    primeira.unmount()

    const segunda = renderHook(() => useBarraRecolhida())
    expect(segunda.result.current.isRecolhida).toBe(true)
    act(() => segunda.result.current.handleAlternar())
    expect(localStorage.getItem(CHAVE_BARRA_RECOLHIDA)).toBe('false')
  })

  it('Ctrl+B alterna; outras combinações não', () => {
    const { result } = renderHook(() => useBarraRecolhida())
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(result.current.isRecolhida).toBe(true)
    fireEvent.keyDown(window, { key: 'B', ctrlKey: true, shiftKey: true })
    fireEvent.keyDown(window, { key: 'b' })
    expect(result.current.isRecolhida).toBe(true)
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(result.current.isRecolhida).toBe(false)
  })

  it('sem acesso ao armazenamento, funciona sem lembrar', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    const { result } = renderHook(() => useBarraRecolhida())
    expect(result.current.isRecolhida).toBe(false)
    act(() => result.current.handleAlternar())
    expect(result.current.isRecolhida).toBe(true)
  })
})
