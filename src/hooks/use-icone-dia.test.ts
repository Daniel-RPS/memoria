import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { Moon, Sun } from 'lucide-react'
import { useIconeDia } from './use-icone-dia'

describe('useIconeDia', () => {
  afterEach(() => vi.useRealTimers())

  it('troca de Sol para Lua ao cruzar 18:00 sem recarregar', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 17, 17, 59, 30))
    const { result } = renderHook(() => useIconeDia())
    expect(result.current).toBe(Sun)
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current).toBe(Moon)
  })
})
