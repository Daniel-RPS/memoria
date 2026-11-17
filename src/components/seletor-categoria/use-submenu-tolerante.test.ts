import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ATRASO_FECHAR_SUBMENU_MS,
  useSubmenuTolerante,
} from '@/components/seletor-categoria/use-submenu-tolerante'

describe('useSubmenuTolerante', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('fecha só depois do atraso e cancela se o mouse volta', () => {
    const { result } = renderHook(() => useSubmenuTolerante(false))
    act(() => result.current.handleOpenChange(true))
    act(() => result.current.handleOpenChange(false))
    act(() => vi.advanceTimersByTime(ATRASO_FECHAR_SUBMENU_MS - 50))
    expect(result.current.isAberto).toBe(true)
    act(() => result.current.propsDeHover.onPointerEnter())
    act(() => vi.advanceTimersByTime(ATRASO_FECHAR_SUBMENU_MS))
    expect(result.current.isAberto).toBe(true)

    act(() => result.current.handleOpenChange(false))
    act(() => vi.advanceTimersByTime(ATRASO_FECHAR_SUBMENU_MS))
    expect(result.current.isAberto).toBe(false)
  })

  it('travado ignora o hover, mas o teclado fecha na hora', () => {
    const { result } = renderHook(() => useSubmenuTolerante(true))
    act(() => result.current.handleOpenChange(true))
    act(() => result.current.handleOpenChange(false))
    act(() => vi.advanceTimersByTime(ATRASO_FECHAR_SUBMENU_MS * 3))
    expect(result.current.isAberto).toBe(true)

    act(() => result.current.propsDeHover.onKeyDownCapture())
    act(() => result.current.handleOpenChange(false))
    expect(result.current.isAberto).toBe(false)
  })
})
