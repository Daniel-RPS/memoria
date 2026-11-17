import { describe, expect, it } from 'vitest'
import { periodoDoDia } from './periodo-do-dia'

const em = (h: number, m: number) => new Date(2026, 10, 17, h, m)

describe('periodoDoDia', () => {
  it.each([
    [5, 59, 'noite'],
    [6, 0, 'dia'],
    [17, 59, 'dia'],
    [18, 0, 'noite'],
    [0, 0, 'noite'],
  ] as const)('%i:%i → %s', (h, m, esperado) => {
    expect(periodoDoDia(em(h, m))).toBe(esperado)
  })
})
